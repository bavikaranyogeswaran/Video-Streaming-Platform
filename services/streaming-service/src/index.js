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

  try {
    // 1. [DB] Fetch video metadata from Redis to locate replicas
    // [DB] HGETALL video:{videoId}
    const video = await redis.hgetall(videoKey);
    if (!video || !video.id) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // 2. [VALIDATION] Verify that replication has occurred
    const storageNodes = JSON.parse(video.storageNodes || '[]');
    if (storageNodes.length === 0) {
      return res.status(503).json({ error: 'Video segments not yet replicated' });
    }

    // 3. [PERFORMANCE] Filter storage nodes by real-time health status
    // [DB] HGETALL node:health:storage-{nodeId}
    const healthChecks = await Promise.all(
      storageNodes.map(async (nodeId) => {
        const health = await redis.hgetall(`node:health:storage-${nodeId}`);
        return { nodeId, status: health.status || 'up' }; 
      })
    );

    const healthyNodes = healthChecks
      .filter(h => h.status === 'up')
      .map(h => h.nodeId);

    // 4. [PERFORMANCE] Smart replica selection
    // Favor healthy nodes; fallback to all replicas if none are marked 'up'
    const nodesToPickFrom = healthyNodes.length > 0 ? healthyNodes : storageNodes;
    const nodeLabel = nodesToPickFrom[Math.floor(Math.random() * nodesToPickFrom.length)];
    const storageUrl = STORAGE_MAP[nodeLabel];

    if (!storageUrl) {
      return res.status(500).json({ error: `Storage node ${nodeLabel} not configured` });
    }

    // 5. [SIDE EFFECT] Proxy the stream request to the chosen storage node
    const targetUrl = `${storageUrl}/files/${videoId}/${filename}`;
    const response = await axios({
      method: 'get',
      url: targetUrl,
      responseType: 'stream',
      timeout: 5000,
    });

    // 6. [SIDE EFFECT] Pipe the storage node's binary data directly to the client
    res.setHeader('X-Proxy-Node', nodeLabel);
    res.setHeader('X-Health-Filtered', healthyNodes.length > 0 ? 'true' : 'false');
    res.setHeader('Content-Type', response.headers['content-type']);
    response.data.pipe(res);

  } catch (err) {
    console.error(`Streaming error for ${videoId}:`, err.message);
    res.status(500).json({ error: 'Failed to stream video chunk' });
  }
});

app.listen(PORT, () => {
  console.log(`🎬 Streaming Service [Replica ${REPLICA_ID}] listening on port ${PORT}`);
});
