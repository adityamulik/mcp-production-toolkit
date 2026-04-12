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
  private maxLogs = 500; // Keep last 500 logs
  private listeners: ((log: RequestLog) => void)[] = [];

  log(logEntry: RequestLog): void {
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.notifyListeners(logEntry);
  }

  getLogs(limit: number = 100): RequestLog[] {
    return [...this.logs].reverse().slice(0, limit);
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

    return {
      totalLogs: total,
      blockedCount: blocked,
      successCount: total - blocked,
      avgDuration: Math.round(avgDuration)
    };
  }
}

export const requestLogger = new RequestLogger();
