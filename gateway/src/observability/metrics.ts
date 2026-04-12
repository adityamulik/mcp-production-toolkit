/**
 * Metrics (Mock Implementation)
 */

class Counter {
  constructor(private config: any) {}
  inc(labels?: any) {}
}

class Histogram {
  constructor(private config: any) {}
  observe(labels: any, value: number) {}
}

class Gauge {
  constructor(private config: any) {}
  set(value: number) {}
}

export const requestCounter = new Counter({
  name: 'mcp_gateway_requests_total',
  help: 'Total requests processed',
  labelNames: ['tool', 'status', 'user_role']
});

export const requestDuration = new Histogram({
  name: 'mcp_gateway_request_duration_seconds',
  help: 'Request duration',
  labelNames: ['tool'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

export const blockedCounter = new Counter({
  name: 'mcp_gateway_blocked_total',
  help: 'Total blocked requests',
  labelNames: ['reason']
});

export const activeConnections = new Gauge({
  name: 'mcp_gateway_active_connections',
  help: 'Active WebSocket connections'
});

export const anomalyCounter = new Counter({
  name: 'mcp_gateway_anomalies_total',
  help: 'Detected anomalies',
  labelNames: ['type', 'severity']
});

export function getMetrics() {
  return '# Prometheus Metrics\n# Metrics would be served in production\n';
}