import client from 'prom-client';

// 1. [OBSERVABILITY] Initialize default system metrics
// Why: Captures CPU, memory, and event loop lag automatically
client.collectDefaultMetrics({ prefix: 'vsp_streaming_' });

// 2. [OBSERVABILITY] Custom Request Metrics
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'vsp_streaming_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5]
});

export const cacheHitsTotal = new client.Counter({
  name: 'vsp_streaming_cache_hits_total',
  help: 'Total number of metadata cache hits',
});

export const cacheMissesTotal = new client.Counter({
  name: 'vsp_streaming_cache_misses_total',
  help: 'Total number of metadata cache misses',
});

export const circuitBreakerState = new client.Gauge({
  name: 'vsp_streaming_circuit_breaker_state',
  help: 'Current state of storage node circuit breakers (0=Closed, 1=Open)',
  labelNames: ['node_id'],
});

export const register = client.register;
