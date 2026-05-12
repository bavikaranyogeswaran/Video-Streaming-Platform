// =================================================================================
// HEALTH MONITOR (The Cluster Watchdog)
// =================================================================================
// This service periodically probes all microservices and storage nodes.
// It persists real-time availability status to Redis to enable
// smart failover and load balancing in the delivery layer.
// =================================================================================

import express, { Request, Response } from 'express';
import axios from 'axios';
import { Redis } from 'ioredis';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '5000');

app.use(cors());
app.use(express.json());

// [DB] Redis connection with exponential backoff strategy
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  retryStrategy: (times: number) => Math.min(times * 200, 3000),
  lazyConnect: true,
});

redis.on('connect', () => console.log('✅ Health Monitor connected to Redis'));
redis.on('error', (err: Error) => console.error('❌ Redis error:', err.message));

interface Node {
  id: string;
  type: 'storage' | 'streaming';
  url?: string;
  [key: string]: any;
}

// [DISCOVERY] Dynamically resolve all nodes in the cluster from Redis registry
async function getRegisteredNodes(): Promise<Node[]> {
  const storageIds = await redis.smembers('vsp:registry:storage');
  const streamingIds = await redis.smembers('vsp:registry:streaming');
  
  const allIds = [
    ...storageIds.map((id: string) => ({ id, type: 'storage' as const })),
    ...streamingIds.map((id: string) => ({ id, type: 'streaming' as const })),
  ];
  
  return Promise.all(allIds.map(async ({ id, type }) => {
    const data = await redis.hgetall(`vsp:node:${id}`);
    return { ...data, id, type };
  }));
}

// Simulation state to override real health checks
const simulations: Record<string, { status: string, latencyMs?: number }> = {};

// CHECK NODE: Probes a single node and persists its availability status
async function checkNode(node: Node) {
  if (!node || !node.url) return;
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
app.post('/health/simulate', (req: Request, res: Response) => {
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
  // 1. [DISCOVERY] Get currently registered nodes
  const nodes = await getRegisteredNodes();
  
  // 2. [PERFORMANCE] Execute all checks in parallel for maximum efficiency
  const results = await Promise.all(nodes.map(checkNode));
  const up   = results.filter(r => r && r.status === 'up').length;
  const down = results.filter(r => r && r.status === 'down').length;
  console.log(`📊 Health check: ${up} up / ${down} down (${nodes.length} registered)`);
}

// HEALTH CHECK: Returns current monitor status
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'up', service: 'health-monitor', timestamp: new Date().toISOString() });
});

// GET NODES: Returns the real-time health dashboard for the entire cluster
app.get('/health/nodes', async (req: Request, res: Response) => {
  try {
    // 1. [DISCOVERY] Fetch all registered nodes
    const nodes = await getRegisteredNodes();
    
    // 2. [DB] Hydrate current health data for all known nodes from Redis
    const results = await Promise.all(
      nodes.map(async (node) => {
        const data = await redis.hgetall(`node:health:${node.id}`);
        return { ...node, ...data };
      })
    );
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// BOOTSTRAP: Start the monitoring loop on service init
app.listen(PORT, async () => {
  console.log(`🔍 Health Monitor listening on port ${PORT}`);
  await redis.connect().catch(() => {});
  
  // 1. [SIDE EFFECT] Initialize polling intervals
  const interval = setInterval(pollAll, POLL_INTERVAL);
  pollAll(); 
});
