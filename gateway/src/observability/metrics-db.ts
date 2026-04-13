import Database from 'better-sqlite3';
import path from 'path';
import { SecurityEvent } from './events.js';

const dbPath = path.join(process.cwd(), 'metrics.db');
const db = new Database(dbPath);

// Enable foreign keys and write-ahead log for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export interface MetricsSnapshot {
  allowed: number;
  blocked: number;
  anomalies: number;
  retried: number;
  rate_limited: number;
  total: number;
}

class MetricsDatabase {
  private db: Database.Database;

  constructor(database: Database.Database) {
    this.db = database;
    this.initializeSchema();
    this.cleanupOldData();
  }

  private initializeSchema() {
    // Create events table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS security_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('blocked', 'allowed', 'anomaly', 'retried', 'rate_limited')),
        timestamp INTEGER NOT NULL,
        userId TEXT NOT NULL,
        tool TEXT NOT NULL,
        reason TEXT,
        severity TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS metrics_hourly (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hour_timestamp INTEGER NOT NULL UNIQUE,
        allowed INTEGER DEFAULT 0,
        blocked INTEGER DEFAULT 0,
        anomalies INTEGER DEFAULT 0,
        retried INTEGER DEFAULT 0,
        rate_limited INTEGER DEFAULT 0,
        total INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON security_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_type ON security_events(type);
      CREATE INDEX IF NOT EXISTS idx_events_userId ON security_events(userId);
      CREATE INDEX IF NOT EXISTS idx_hourly_timestamp ON metrics_hourly(hour_timestamp);
    `);
  }

  // Insert a single security event
  insertEvent(event: SecurityEvent) {
    const stmt = this.db.prepare(`
      INSERT INTO security_events 
      (type, timestamp, userId, tool, reason, severity, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.type,
      event.timestamp,
      event.userId,
      event.tool,
      event.reason || null,
      event.severity || null,
      event.details ? JSON.stringify(event.details) : null
    );
  }

  // Get recent events (from last N hours)
  getRecentEvents(limit: number = 100, hoursBack: number = 24): SecurityEvent[] {
    const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;
    
    const stmt = this.db.prepare(`
      SELECT id, type, timestamp, userId, tool, reason, severity, details
      FROM security_events
      WHERE timestamp > ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(cutoff, limit) as any[];
    return rows.map(row => ({
      type: row.type,
      timestamp: row.timestamp,
      userId: row.userId,
      tool: row.tool,
      reason: row.reason,
      severity: row.severity,
      details: row.details ? JSON.parse(row.details) : undefined
    }));
  }

  // Get stats for all events in database
  getAllStats(): MetricsSnapshot {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN type = 'allowed' THEN 1 ELSE 0 END) as allowed,
        SUM(CASE WHEN type = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN type = 'anomaly' THEN 1 ELSE 0 END) as anomalies,
        SUM(CASE WHEN type = 'retried' THEN 1 ELSE 0 END) as retried,
        SUM(CASE WHEN type = 'rate_limited' THEN 1 ELSE 0 END) as rate_limited
      FROM security_events
    `);

    const result = stmt.get() as any;
    return {
      allowed: result.allowed || 0,
      blocked: result.blocked || 0,
      anomalies: result.anomalies || 0,
      retried: result.retried || 0,
      rate_limited: result.rate_limited || 0,
      total: result.total || 0
    };
  }

  // Get stats for a specific time window (from now, going back)
  getStatsWindow(windowMs: number = 300000): MetricsSnapshot {
    const cutoff = Date.now() - windowMs;

    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN type = 'allowed' THEN 1 ELSE 0 END) as allowed,
        SUM(CASE WHEN type = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN type = 'anomaly' THEN 1 ELSE 0 END) as anomalies,
        SUM(CASE WHEN type = 'retried' THEN 1 ELSE 0 END) as retried,
        SUM(CASE WHEN type = 'rate_limited' THEN 1 ELSE 0 END) as rate_limited
      FROM security_events
      WHERE timestamp > ?
    `);

    const result = stmt.get(cutoff) as any;
    return {
      allowed: result.allowed || 0,
      blocked: result.blocked || 0,
      anomalies: result.anomalies || 0,
      retried: result.retried || 0,
      rate_limited: result.rate_limited || 0,
      total: result.total || 0
    };
  }

  // Get stats for a specific date range
  getStatsRange(startMs: number, endMs: number): MetricsSnapshot {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN type = 'allowed' THEN 1 ELSE 0 END) as allowed,
        SUM(CASE WHEN type = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN type = 'anomaly' THEN 1 ELSE 0 END) as anomalies,
        SUM(CASE WHEN type = 'retried' THEN 1 ELSE 0 END) as retried,
        SUM(CASE WHEN type = 'rate_limited' THEN 1 ELSE 0 END) as rate_limited
      FROM security_events
      WHERE timestamp BETWEEN ? AND ?
    `);

    const result = stmt.get(startMs, endMs) as any;
    return {
      allowed: result.allowed || 0,
      blocked: result.blocked || 0,
      anomalies: result.anomalies || 0,
      retried: result.retried || 0,
      rate_limited: result.rate_limited || 0,
      total: result.total || 0
    };
  }

  // Get events sorted by timestamp for chart data
  getEventTimeseries(hoursBack: number = 24, intervalMs: number = 60000): Array<{
    timestamp: number;
    allowed: number;
    blocked: number;
    anomalies: number;
    retried: number;
    rate_limited: number;
  }> {
    const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;

    const stmt = this.db.prepare(`
      SELECT 
        timestamp,
        type
      FROM security_events
      WHERE timestamp > ?
      ORDER BY timestamp ASC
    `);

    const events = stmt.all(cutoff) as any[];
    
    // Group by interval
    const intervals: Map<number, any> = new Map();
    
    events.forEach(event => {
      const intervalKey = Math.floor(event.timestamp / intervalMs) * intervalMs;
      
      if (!intervals.has(intervalKey)) {
        intervals.set(intervalKey, {
          timestamp: intervalKey,
          allowed: 0,
          blocked: 0,
          anomalies: 0,
          retried: 0,
          rate_limited: 0
        });
      }
      
      const bucket = intervals.get(intervalKey);
      bucket[event.type === 'anomaly' ? 'anomalies' : event.type]++;
    });

    return Array.from(intervals.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  // Clean up data older than 30 days
  private cleanupOldData() {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const stmt = this.db.prepare('DELETE FROM security_events WHERE timestamp < ?');
    const result = stmt.run(thirtyDaysAgo);
    
    if (result.changes && result.changes > 0) {
      console.log(`[Metrics DB] Cleaned up ${result.changes} events older than 30 days`);
    }
  }

  // Force cleanup (can be called manually)
  cleanupData(daysOld: number = 30) {
    const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const stmt = this.db.prepare('DELETE FROM security_events WHERE timestamp < ?');
    const result = stmt.run(cutoff);
    return result.changes || 0;
  }

  // Get database statistics
  getDbStats() {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM security_events');
    const sizeStmt = this.db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()");
    
    const count = (countStmt.get() as any)?.count || 0;
    const size = (sizeStmt.get() as any)?.size || 0;

    return {
      eventCount: count,
      databaseSizeBytes: size,
      databaseSizeMb: (size / 1024 / 1024).toFixed(2)
    };
  }

  close() {
    this.db.close();
  }
}

export const metricsDb = new MetricsDatabase(db);
