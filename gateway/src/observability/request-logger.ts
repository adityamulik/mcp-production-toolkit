/**
 * Request Logger - Tracks all gateway requests
 */

export interface RequestLog {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  tool?: string;
  team?: string;
  userId?: string;
  status: number;
  duration: number;
  blocked: boolean;
  reason?: string;
  error?: string;
}

class RequestLogger {
  private logs: RequestLog[] = [];
  private maxLogs = 50000; // Keep last 50000 logs - increased to handle full DDoS test
  private listeners: ((log: RequestLog) => void)[] = [];

  log(logEntry: RequestLog): void {
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    if (logEntry.blocked) {
      console.log(`[REQUEST_LOG] Logged blocked request: ${logEntry.tool} (${logEntry.status}) | Reason: ${logEntry.reason}`);
    }
    this.notifyListeners(logEntry);
  }

  getLogs(limit: number = 100): RequestLog[] {
    const reversed = [...this.logs].reverse().slice(0, limit);
    const blockedInReturned = reversed.filter(l => l.blocked).length;
    console.log(`[REQUEST_LOG] getLogs(${limit}): Returning ${reversed.length} logs (${blockedInReturned} blocked) | Total in buffer: ${this.logs.length}`);
    return reversed;
  }

  getLogsByUser(userId: string): RequestLog[] {
    return this.logs.filter(log => log.userId === userId);
  }

  getLogsByTool(tool: string): RequestLog[] {
    return this.logs.filter(log => log.tool === tool);
  }

  getLogsByTeam(team: string): RequestLog[] {
    return this.logs.filter(log => log.team === team);
  }

  getBlockedLogs(): RequestLog[] {
    return this.logs.filter(log => log.blocked);
  }

  clearLogs(): void {
    this.logs = [];
  }

  onNewLog(callback: (log: RequestLog) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(log: RequestLog): void {
    this.listeners.forEach(listener => listener(log));
  }

  getStats() {
    const total = this.logs.length;
    const blocked = this.logs.filter(l => l.blocked).length;
    const avgDuration = total > 0 
      ? this.logs.reduce((sum, l) => sum + l.duration, 0) / total 
      : 0;

    const byReason = this.logs.filter(l => l.blocked).reduce((acc, l) => {
      const reason = l.reason || 'unknown';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`[REQUEST_LOG_STATS] Total: ${total}, Blocked: ${blocked}, By Reason:`, byReason);

    return {
      totalLogs: total,
      blockedCount: blocked,
      successCount: total - blocked,
      avgDuration: Math.round(avgDuration),
      byReason
    };
  }
}

export const requestLogger = new RequestLogger();
