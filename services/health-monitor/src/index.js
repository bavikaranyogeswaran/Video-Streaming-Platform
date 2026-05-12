// =================================================================================
// HEALTH MONITOR (The Cluster Watchdog)
// =================================================================================
// This service periodically probes all microservices and storage nodes.
// It persists real-time availability status to Redis to enable
// smart failover and load balancing in the delivery layer.
// =================================================================================

const express = require('express');
const axios = require('axios');
const Redis = require('ioredis');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '5000');

app.use(cors());
app.use(express.json());

// [DB] Redis connection with exponential backoff strategy
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  retryStrategy: (times) => Math.min(times * 200, 3000),
  lazyConnect: true,
});

redis.on('connect', () => console.log('✅ Health Monitor connected to Redis'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));

// Configuration-driven service registry
const streamingNodes = (process.env.STREAMING_NODES || '').split(',').filter(Boolean);
const storageNodes   = (process.env.STORAGE_NODES   || '').split(',').filter(Boolean);

const allNodes = [
  ...streamingNodes.map((url, i) => ({ url, id: `streaming-${i + 1}`, type: 'streaming' })),
  ...storageNodes.map((url, i) => ({ url, id: `storage-${['A','B','C'][i] || i}`, type: 'storage' })),
];

// Simulation state to override real health checks
const simulations = {};

// CHECK NODE: Probes a single node and persists its availability status
async function checkNode(node) {
  const start = Date.now();
  
  // 0. [SIMULATION] Check for manual overrides
  if (simulations[node.id]) {
    const sim = simulations[node.id];
    const health = { 
      status: sim.status, 
      latencyMs: sim.latencyMs || (sim.status === 'up' ? 20 : -1), 
      lastChecked: new Date().toISOString(),
      simulated: true
    };
    await redis.hset(`node:health:${node.id}`, health);
    return { ...node, ...health };
  }

  try {
    // 1. [SIDE EFFECT] Outbound health probe with strict timeout
    await axios.get(`${node.url}/health`, { timeout: 3000 });
    const latencyMs = Date.now() - start;
    
    // 2. [DB] Persist 'up' status and latency metrics to Redis
    const health = { status: 'up', latencyMs, lastChecked: new Date().toISOString() };
    await redis.hset(`node:health:${node.id}`, health);
    return { ...node, ...health };
  } catch {
    // 1. [DB] Persist 'down' status on failure or timeout
    const health = { status: 'down', latencyMs: -1, lastChecked: new Date().toISOString() };
    await redis.hset(`node:health:${node.id}`, health);
    console.warn(`⚠️  [${node.id}] is DOWN`);
    return { ...node, ...health };
  }
}

// SIMULATE: Allows the frontend/admin to force a node into a specific state
app.post('/health/simulate', (req, res) => {
  const { nodeId, status, latencyMs } = req.body;
  
  if (!nodeId) return res.status(400).json({ error: 'nodeId required' });
  
  if (status === 'reset') {
    delete simulations[nodeId];
    console.log(`🔄 Simulation reset for ${nodeId}`);
  } else {
    simulations[nodeId] = { status, latencyMs };
    console.log(`🎭 Simulation set for ${nodeId}: ${status} (${latencyMs}ms)`);
  }
  
  res.json({ success: true, simulations });
});

// POLL ALL: Orchestrates the global heartbeat check
async function pollAll() {
  // 1. [PERFORMANCE] Execute all checks in parallel for maximum efficiency
  const results = await Promise.all(allNodes.map(checkNode));
  const up   = results.filter(r => r.status === 'up').length;
  const down = results.filter(r => r.status === 'down').length;
  console.log(`📊 Health check: ${up} up / ${down} down`);
}

// HEALTH CHECK: Returns current monitor status
app.get('/health', (req, res) => {
  res.json({ status: 'up', service: 'health-monitor', timestamp: new Date().toISOString() });
});

// GET NODES: Returns the real-time health dashboard for the entire cluster
app.get('/health/nodes', async (req, res) => {
  try {
    // 1. [DB] Hydrate current health data for all known nodes from Redis
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

// BOOTSTRAP: Start the monitoring loop on service init
app.listen(PORT, async () => {
  console.log(`🔍 Health Monitor listening on port ${PORT}`);
  await redis.connect().catch(() => {});
  
  // 1. [SIDE EFFECT] Initialize polling intervals
  setInterval(pollAll, POLL_INTERVAL);
  pollAll(); 
});
