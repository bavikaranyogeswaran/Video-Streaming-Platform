// =================================================================================
// STREAMING SERVICE (The Delivery Proxy)
// =================================================================================
// This microservice acts as a high-performance HLS proxy.
// It performs health-aware load balancing to route client requests
// to the most optimal available storage node.
// =================================================================================

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;
const REPLICA_ID = process.env.REPLICA_ID || '?';

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// 1. [SIDE EFFECT] Middleware to attach replica identity to responses
// Useful for debugging load balancer distribution in the browser
app.use((req, res, next) => {
  res.setHeader('X-Replica-ID', REPLICA_ID);
  next();
});

// HEALTH CHECK: Returns current service status and replica info
app.get('/health', (req, res) => {
  res.json({
    status: 'up',
    service: 'streaming-service',
    replicaId: REPLICA_ID,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

const Redis = require('ioredis');
const axios = require('axios');
const NodeCache = require('node-cache');
const CircuitBreaker = require('opossum');

// [PERFORMANCE] Multi-tier in-memory cache
const localCache = new NodeCache({ stdTTL: 60, checkperiod: 70 });

// [RESILIENCE] Circuit Breaker Registry
// Why: Prevents cascading failures if a specific storage node is slow or intermittent.
const breakers = {};

function getBreaker(nodeLabel) {
  if (!breakers[nodeLabel]) {
    const options = {
      timeout: 5000, // If the proxy takes longer than 5s, count as failure
      errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
      resetTimeout: 10000 // Wait 10s before trying again
    };

    // The action is a simple axios request wrapped in a promise
    const breaker = new CircuitBreaker(async (url) => {
      return axios({
        method: 'get',
        url,
        responseType: 'stream',
        timeout: 5000,
      });
    }, options);

    breaker.on('open', () => console.warn(`🚨 Circuit OPEN for Node ${nodeLabel}`));
    breaker.on('close', () => console.log(`✅ Circuit CLOSED for Node ${nodeLabel}`));
    breaker.on('halfOpen', () => console.log(`🛠️ Circuit HALF-OPEN for Node ${nodeLabel}`));

    breakers[nodeLabel] = breaker;
  }
  return breakers[nodeLabel];
}

// [DB] Persistent connection to the distributed metadata store
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

// Static mapping of storage node labels to internal URLs
const STORAGE_MAP = {
  'A': process.env.STORAGE_NODE_A || 'http://storage-node-a:4001',
  'B': process.env.STORAGE_NODE_B || 'http://storage-node-b:4001',
  'C': process.env.STORAGE_NODE_C || 'http://storage-node-c:4001',
};

// STREAM HLS ASSETS: Proxies requests for .m3u8 or .ts files to storage nodes
app.get('/stream/:videoId/:filename', async (req, res) => {
  const { videoId, filename } = req.params;
  const videoKey = `video:${videoId}`;
  let cacheHit = false;

  try {
    // 1. [PERFORMANCE] Cache-aside: Try local memory first
    let video = localCache.get(videoKey);
    
    if (!video) {
      video = await redis.hgetall(videoKey);
      if (video && video.id) localCache.set(videoKey, video);
    } else {
      cacheHit = true;
    }

    if (!video || !video.id) return res.status(404).json({ error: 'Video not found' });

    const storageNodes = JSON.parse(video.storageNodes || '[]');
    if (storageNodes.length === 0) return res.status(503).json({ error: 'Video segments not yet replicated' });

    // 2. [PERFORMANCE] Health caching: Reuse health status for 2 seconds
    const healthCacheKey = 'global:node:health';
    let healthChecks = localCache.get(healthCacheKey);

    if (!healthChecks) {
      healthChecks = await Promise.all(
        storageNodes.map(async (nodeId) => {
          const health = await redis.hgetall(`node:health:storage-${nodeId}`);
          return { nodeId, status: health.status || 'up' }; 
        })
      );
      localCache.set(healthCacheKey, healthChecks, 2);
    }

    // 3. [RESILIENCE] Filter by both Health Monitor AND local Circuit Breaker
    const healthyNodes = healthChecks
      .filter(h => {
        const breaker = getBreaker(h.nodeId);
        return h.status === 'up' && !breaker.opened;
      })
      .map(h => h.nodeId);

    const nodesToPickFrom = healthyNodes.length > 0 ? healthyNodes : storageNodes;
    const nodeLabel = nodesToPickFrom[Math.floor(Math.random() * nodesToPickFrom.length)];
    const storageUrl = STORAGE_MAP[nodeLabel];

    if (!storageUrl) return res.status(500).json({ error: `Storage node ${nodeLabel} not configured` });

    // 4. [RESILIENCE] Execute request through Circuit Breaker
    const targetUrl = `${storageUrl}/files/${videoId}/${filename}`;
    const breaker = getBreaker(nodeLabel);

    const response = await breaker.fire(targetUrl);

    // 5. [SIDE EFFECT] Pipe the storage node's binary data directly to the client
    res.setHeader('X-Proxy-Node', nodeLabel);
    res.setHeader('X-Metadata-Cache', cacheHit ? 'HIT' : 'MISS');
    res.setHeader('X-Circuit-State', breaker.opened ? 'OPEN' : 'CLOSED');
    res.setHeader('X-Health-Filtered', healthyNodes.length > 0 ? 'true' : 'false');
    res.setHeader('Content-Type', response.headers['content-type']);
    response.data.pipe(res);

  } catch (err) {
    console.error(`Streaming error for ${videoId}:`, err.message);
    // If the circuit was opened by this error, we might want to return 503
    res.status(err.code === 'EOPENBREAKER' ? 503 : 500).json({ 
      error: 'Failed to stream video chunk',
      reason: err.code === 'EOPENBREAKER' ? 'Circuit Breaker Active' : 'Internal Error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🎬 Streaming Service [Replica ${REPLICA_ID}] listening on port ${PORT}`);
});
