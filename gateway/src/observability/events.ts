import { EventEmitter } from 'events';
import { metricsDb, MetricsSnapshot } from './metrics-db.js';

export interface SecurityEvent {
  type: 'blocked' | 'allowed' | 'anomaly' | 'retried' | 'rate_limited';
  timestamp: number;
  userId: string;
  tool: string;
  reason?: string;
  severity?: string;
  details?: any;
}

class EventBroadcaster extends EventEmitter {
  private eventLog: SecurityEvent[] = [];
  private metricsSnapshots: Array<{ timestamp: number; metrics: MetricsSnapshot }> = [];
  
  constructor() {
    super();
    // Load recent events from database on startup
    this.loadRecentEventsFromDb();
  }

  private loadRecentEventsFromDb() {
    try {
      // Load last 1000 events from database into memory for fast access
      const recentEvents = metricsDb.getRecentEvents(1000, 24);
      this.eventLog = recentEvents;
      console.log(`[Events] Loaded ${recentEvents.length} events from database`);
    } catch (error) {
      console.error('[Events] Failed to load events from database:', error);
      // Continue with empty log if database fails
      this.eventLog = [];
    }
  }
  
  logEvent(event: SecurityEvent) {
    // Add to in-memory cache
    this.eventLog.push(event);
    
    // Keep last 1000 events in memory (hot cache)
    if (this.eventLog.length > 1000) {
      this.eventLog.shift();
    }
    
    // Persist to database
    try {
      metricsDb.insertEvent(event);
    } catch (error) {
      console.error('[Events] Failed to persist event to database:', error);
    }
    
    // Emit to dashboard listeners
    this.emit('security_event', event);
  }
  
  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.eventLog.slice(-limit);
  }
  
  getStats(): MetricsSnapshot {
    // Get authoritative stats from database
    try {
      return metricsDb.getAllStats();
    } catch (error) {
      console.error('[Events] Failed to get stats from database:', error);
      // Fallback to in-memory calculation
      return this.getStatsFromMemory(this.eventLog);
    }
  }
  
  // Get stats for a specific time window (in ms)
  getStatsWindow(windowMs: number = 300000): MetricsSnapshot {
    try {
      return metricsDb.getStatsWindow(windowMs);
    } catch (error) {
      console.error('[Events] Failed to get stats window from database:', error);
      // Fallback to in-memory calculation
      const now = Date.now();
      const cutoff = now - windowMs;
      const windowEvents = this.eventLog.filter(e => e.timestamp > cutoff);
      return this.getStatsFromMemory(windowEvents);
    }
  }

  // Get stats for a date range
  getStatsRange(startMs: number, endMs: number): MetricsSnapshot {
    try {
      return metricsDb.getStatsRange(startMs, endMs);
    } catch (error) {
      console.error('[Events] Failed to get stats range from database:', error);
      const rangeEvents = this.eventLog.filter(e => e.timestamp >= startMs && e.timestamp <= endMs);
      return this.getStatsFromMemory(rangeEvents);
    }
  }

  // Get timeseries data for charts
  getTimeseries(hoursBack: number = 24, intervalMs: number = 60000) {
    try {
      return metricsDb.getEventTimeseries(hoursBack, intervalMs);
    } catch (error) {
      console.error('[Events] Failed to get timeseries from database:', error);
      return [];
    }
  }

  // Helper to calculate stats from an array of events
  private getStatsFromMemory(events: SecurityEvent[]): MetricsSnapshot {
    return {
      allowed: events.filter(e => e.type === 'allowed').length,
      blocked: events.filter(e => e.type === 'blocked').length,
      anomalies: events.filter(e => e.type === 'anomaly').length,
      retried: events.filter(e => e.type === 'retried').length,
      rate_limited: events.filter(e => e.type === 'rate_limited').length,
      total: events.length
    };
  }
}

export const eventBroadcaster = new EventBroadcaster();