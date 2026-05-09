const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;
const REPLICA_ID = process.env.REPLICA_ID || '?';

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Attach replica ID to every response
app.use((req, res, next) => {
  res.setHeader('X-Replica-ID', REPLICA_ID);
  next();
});

// ── Health check ────────────────────────────────────────────────
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

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

const STORAGE_MAP = {
  'A': process.env.STORAGE_NODE_A || 'http://storage-node-a:4001',
  'B': process.env.STORAGE_NODE_B || 'http://storage-node-b:4001',
  'C': process.env.STORAGE_NODE_C || 'http://storage-node-c:4001',
};

// ── Real HLS Proxy ──────────────────────────────────────────────
app.get('/stream/:videoId/:filename', async (req, res) => {
  const { videoId, filename } = req.params;
  const videoKey = `video:${videoId}`;

  try {
    const video = await redis.hgetall(videoKey);
    if (!video || !video.id) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const storageNodes = JSON.parse(video.storageNodes || '[]');
    if (storageNodes.length === 0) {
      return res.status(503).json({ error: 'Video segments not yet replicated' });
    }

    // Filter nodes by health status from Redis
    const healthChecks = await Promise.all(
      storageNodes.map(async (nodeId) => {
        const health = await redis.hgetall(`node:health:storage-${nodeId}`);
        return { nodeId, status: health.status || 'up' }; // Default to up if no health data yet
      })
    );

    const healthyNodes = healthChecks
      .filter(h => h.status === 'up')
      .map(h => h.nodeId);

    // Fallback: if all replicated nodes are down, try any of them anyway 
    // (or return error if you want strict failover)
    const nodesToPickFrom = healthyNodes.length > 0 ? healthyNodes : storageNodes;
    
    const nodeLabel = nodesToPickFrom[Math.floor(Math.random() * nodesToPickFrom.length)];
    const storageUrl = STORAGE_MAP[nodeLabel];

    if (!storageUrl) {
      return res.status(500).json({ error: `Storage node ${nodeLabel} not configured` });
    }

    const targetUrl = `${storageUrl}/files/${videoId}/${filename}`;
    
    // Proxy the request to the storage node
    const response = await axios({
      method: 'get',
      url: targetUrl,
      responseType: 'stream',
      timeout: 5000,
    });

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
