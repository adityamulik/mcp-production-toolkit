/**
 * Metrics (Real Implementation with In-Memory Tracking)
 */

interface MetricValue {
  [key: string]: number;
}

class Counter {
  private values: MetricValue = {};
  
  constructor(private config: any) {}
  
  inc(labels?: any) {
    const key = labels ? JSON.stringify(labels) : 'total';
    this.values[key] = (this.values[key] || 0) + 1;
  }
  
  getValues() {
    return this.values;
  }
}

class Histogram {
  private buckets: { [key: string]: number[] } = {};
  
  constructor(private config: any) {}
  
  observe(labels: any, value: number) {
    const key = labels ? JSON.stringify(labels) : 'default';
    if (!this.buckets[key]) {
      this.buckets[key] = [];
    }
    this.buckets[key].push(value);
  }
  
  getValues() {
    const result: { [key: string]: { count: number; sum: number; avg: number } } = {};
    for (const [key, values] of Object.entries(this.buckets)) {
      result[key] = {
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        avg: values.reduce((a, b) => a + b, 0) / values.length
      };
    }
    return result;
  }
}

class Gauge {
  private value: number = 0;
  
  constructor(private config: any) {}
  
  set(value: number) {
    this.value = value;
  }
  
  getValue() {
    return this.value;
  }
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

// Circuit Breaker Metrics
export const circuitBreakerStateChanges = new Counter({
  name: 'mcp_gateway_circuit_breaker_state_changes_total',
  help: 'Circuit breaker state changes',
  labelNames: ['from_state', 'to_state']
});

export const circuitBreakerFailures = new Counter({
  name: 'mcp_gateway_circuit_breaker_failures_total',
  help: 'Total failures recorded by circuit breaker',
  labelNames: ['team']
});

export const circuitBreakerAttempts = new Counter({
  name: 'mcp_gateway_circuit_breaker_attempts_total',
  help: 'Total attempts made while in half-open state',
  labelNames: ['result']
});

export const circuitBreakerState = new Gauge({
  name: 'mcp_gateway_circuit_breaker_state',
  help: 'Current circuit breaker state (0=closed, 1=open, 2=half_open)'
});

// Retry Policy Metrics
export const retryAttempts = new Counter({
  name: 'mcp_gateway_retry_attempts_total',
  help: 'Total retry attempts made',
  labelNames: ['tool', 'result']
});

export const retryBackoffDelay = new Histogram({
  name: 'mcp_gateway_retry_backoff_delay_ms',
  help: 'Retry backoff delay in milliseconds',
  labelNames: ['attempt'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000]
});

export const retrySuccessRate = new Counter({
  name: 'mcp_gateway_retry_success_rate',
  help: 'Retries that eventually succeeded',
  labelNames: ['tool']
});

export const retryExhausted = new Counter({
  name: 'mcp_gateway_retry_exhausted_total',
  help: 'Requests that exhausted all retry attempts',
  labelNames: ['tool', 'reason']
});

export function getMetrics() {
  let output = '# HELP mcp_gateway_requests_total Total requests processed\n';
  output += '# TYPE mcp_gateway_requests_total counter\n';
  
  // Request counter metrics
  const requestCounterValues = (requestCounter as any).getValues();
  for (const [key, value] of Object.entries(requestCounterValues)) {
    output += `mcp_gateway_requests_total{${key}} ${value as number}\n`;
  }
  
  output += '\n# HELP mcp_gateway_blocked_total Total blocked requests\n';
  output += '# TYPE mcp_gateway_blocked_total counter\n';
  
  // Blocked counter metrics
  const blockedCounterValues = (blockedCounter as any).getValues();
  for (const [key, value] of Object.entries(blockedCounterValues)) {
    output += `mcp_gateway_blocked_total{${key}} ${value as number}\n`;
  }
  
  output += '\n# HELP mcp_gateway_request_duration_seconds Request duration\n';
  output += '# TYPE mcp_gateway_request_duration_seconds histogram\n';
  
  // Duration histogram metrics
  const durationValues = (requestDuration as any).getValues();
  for (const [key, stats] of Object.entries(durationValues)) {
    const statsTyped = stats as any;
    output += `mcp_gateway_request_duration_seconds_count{${key}} ${statsTyped.count}\n`;
    output += `mcp_gateway_request_duration_seconds_sum{${key}} ${statsTyped.sum}\n`;
  }
  
  return output;
}