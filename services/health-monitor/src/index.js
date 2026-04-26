const express = require('express');
const axios = require('axios');
const Redis = require('ioredis');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '5000');

app.use(cors());
app.use(express.json());

// ── Redis connection ─────────────────────────────────────────────
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  retryStrategy: (times) => Math.min(times * 200, 3000),
  lazyConnect: true,
});

redis.on('connect', () => console.log('✅ Health Monitor connected to Redis'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));

// ── Node lists from env ──────────────────────────────────────────
const streamingNodes = (process.env.STREAMING_NODES || '').split(',').filter(Boolean);
const storageNodes   = (process.env.STORAGE_NODES   || '').split(',').filter(Boolean);

const allNodes = [
  ...streamingNodes.map((url, i) => ({ url, id: `streaming-${i + 1}`, type: 'streaming' })),
  ...storageNodes.map((url, i) => ({ url, id: `storage-${['A','B','C'][i] || i}`, type: 'storage' })),
];

// ── Poll a single node ────────────────────────────────────────────
async function checkNode(node) {
  const start = Date.now();
  try {
    await axios.get(`${node.url}/health`, { timeout: 3000 });
    const latencyMs = Date.now() - start;
    const health = { status: 'up', latencyMs, lastChecked: new Date().toISOString() };
    await redis.hset(`node:health:${node.id}`, health);
    return { ...node, ...health };
  } catch {
    const health = { status: 'down', latencyMs: -1, lastChecked: new Date().toISOString() };
    await redis.hset(`node:health:${node.id}`, health);
    console.warn(`⚠️  [${node.id}] is DOWN`);
    return { ...node, ...health };
  }
}

// ── Poll all nodes ────────────────────────────────────────────────
async function pollAll() {
  const results = await Promise.all(allNodes.map(checkNode));
  const up   = results.filter(r => r.status === 'up').length;
  const down = results.filter(r => r.status === 'down').length;
  console.log(`📊 Health check: ${up} up / ${down} down`);
}

// ── Expose current health state ───────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'up', service: 'health-monitor', timestamp: new Date().toISOString() });
});

app.get('/health/nodes', async (req, res) => {
  try {
    const results = await Promise.all(
      allNodes.map(async (node) => {
        const data = await redis.hgetall(`node:health:${node.id}`);
        return { ...node, ...data };
      })
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ──────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`🔍 Health Monitor listening on port ${PORT}`);
  await redis.connect().catch(() => {});
  setInterval(pollAll, POLL_INTERVAL);
  pollAll(); // immediate first poll
});
