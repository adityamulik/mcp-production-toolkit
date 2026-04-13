import { EventEmitter } from 'events';

export interface SecurityEvent {
  type: 'blocked' | 'allowed' | 'anomaly' | 'retried' | 'rate_limited';
  timestamp: number;
  userId: string;
  tool: string;
  reason?: string;
  severity?: string;
  details?: any;
}

interface MetricsSnapshot {
  allowed: number;
  blocked: number;
  anomalies: number;
  retried: number;
  rate_limited: number;
  total: number;
}

class EventBroadcaster extends EventEmitter {
  private eventLog: SecurityEvent[] = [];
  private metricsSnapshots: Array<{ timestamp: number; metrics: MetricsSnapshot }> = [];
  
  logEvent(event: SecurityEvent) {
    this.eventLog.push(event);
    
    // Keep last 10000 events (about 1 day of data)
    if (this.eventLog.length > 10000) {
      this.eventLog.shift();
    }
    
    // Emit to dashboard listeners
    this.emit('security_event', event);
  }
  
  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.eventLog.slice(-limit);
  }
  
  getStats() {
    const now = Date.now();
    
    // Count all events (no time limit for global stats)
    const allEvents = this.eventLog;
    
    const stats: MetricsSnapshot = {
      allowed: allEvents.filter(e => e.type === 'allowed').length,
      blocked: allEvents.filter(e => e.type === 'blocked').length,
      anomalies: allEvents.filter(e => e.type === 'anomaly').length,
      retried: allEvents.filter(e => e.type === 'retried').length,
      rate_limited: allEvents.filter(e => e.type === 'rate_limited').length,
      total: allEvents.length
    };
    
    return stats;
  }
  
  // Get stats for a specific time window (in ms)
  getStatsWindow(windowMs: number = 300000) {
    const now = Date.now();
    const cutoff = now - windowMs;
    const windowEvents = this.eventLog.filter(e => e.timestamp > cutoff);
    
    const stats: MetricsSnapshot = {
      allowed: windowEvents.filter(e => e.type === 'allowed').length,
      blocked: windowEvents.filter(e => e.type === 'blocked').length,
      anomalies: windowEvents.filter(e => e.type === 'anomaly').length,
      retried: windowEvents.filter(e => e.type === 'retried').length,
      rate_limited: windowEvents.filter(e => e.type === 'rate_limited').length,
      total: windowEvents.length
    };
    
    return stats;
  }
}

export const eventBroadcaster = new EventBroadcaster();