import { EventEmitter } from 'events';

export interface SecurityEvent {
  type: 'blocked' | 'allowed' | 'anomaly';
  timestamp: number;
  userId: string;
  tool: string;
  reason?: string;
  severity?: string;
  details?: any;
}

class EventBroadcaster extends EventEmitter {
  private eventLog: SecurityEvent[] = [];
  
  logEvent(event: SecurityEvent) {
    this.eventLog.push(event);
    
    // Keep last 1000 events
    if (this.eventLog.length > 1000) {
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
    const last5min = this.eventLog.filter(e => e.timestamp > now - 300000);
    
    const blocked = last5min.filter(e => e.type === 'blocked').length;
    const allowed = last5min.filter(e => e.type === 'allowed').length;
    const anomalies = last5min.filter(e => e.type === 'anomaly').length;
    
    return { blocked, allowed, anomalies, total: last5min.length };
  }
}

export const eventBroadcaster = new EventBroadcaster();