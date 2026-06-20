import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestLogger, type RequestLog } from '../observability/request-logger';

function makeLog(overrides: Partial<RequestLog> = {}): RequestLog {
  return {
    id: `log-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    method: 'POST',
    path: '/mcp',
    tool: 'read_file',
    team: 'C',
    userId: 'user-1',
    status: 200,
    duration: 50,
    blocked: false,
    ...overrides,
  };
}

describe('RequestLogger', () => {
  beforeEach(() => {
    requestLogger.clearLogs();
  });

  it('log() stores entries', () => {
    requestLogger.log(makeLog());
    expect(requestLogger.getLogs().length).toBe(1);
  });

  it('getLogs() returns newest first', () => {
    requestLogger.log(makeLog({ id: 'first' }));
    requestLogger.log(makeLog({ id: 'second' }));
    requestLogger.log(makeLog({ id: 'third' }));

    const logs = requestLogger.getLogs();
    expect(logs[0].id).toBe('third');
    expect(logs[1].id).toBe('second');
    expect(logs[2].id).toBe('first');
  });

  it('getLogs() respects limit', () => {
    for (let i = 0; i < 10; i++) {
      requestLogger.log(makeLog());
    }
    const logs = requestLogger.getLogs(3);
    expect(logs.length).toBe(3);
  });

  it('stores max 500 logs (oldest removed)', () => {
    for (let i = 0; i < 510; i++) {
      requestLogger.log(makeLog({ id: `overflow-${i}` }));
    }
    const all = requestLogger.getLogs(600);
    expect(all.length).toBe(500);
  });

  it('getLogsByUser filters by userId', () => {
    requestLogger.log(makeLog({ userId: 'alice' }));
    requestLogger.log(makeLog({ userId: 'bob' }));
    requestLogger.log(makeLog({ userId: 'alice' }));

    const aliceLogs = requestLogger.getLogsByUser('alice');
    expect(aliceLogs.length).toBe(2);
    expect(aliceLogs.every(l => l.userId === 'alice')).toBe(true);
  });

  it('getLogsByTool filters by tool', () => {
    requestLogger.log(makeLog({ tool: 'read_file' }));
    requestLogger.log(makeLog({ tool: 'deploy_application' }));
    requestLogger.log(makeLog({ tool: 'read_file' }));

    const readLogs = requestLogger.getLogsByTool('read_file');
    expect(readLogs.length).toBe(2);
  });

  it('getLogsByTeam filters by team', () => {
    requestLogger.log(makeLog({ team: 'A' }));
    requestLogger.log(makeLog({ team: 'B' }));
    requestLogger.log(makeLog({ team: 'A' }));

    const teamALogs = requestLogger.getLogsByTeam('A');
    expect(teamALogs.length).toBe(2);
  });

  it('getBlockedLogs returns only blocked entries', () => {
    requestLogger.log(makeLog({ blocked: false }));
    requestLogger.log(makeLog({ blocked: true, reason: 'policy' }));
    requestLogger.log(makeLog({ blocked: false }));
    requestLogger.log(makeLog({ blocked: true, reason: 'injection' }));

    const blocked = requestLogger.getBlockedLogs();
    expect(blocked.length).toBe(2);
    expect(blocked.every(l => l.blocked)).toBe(true);
  });

  it('onNewLog notifies listeners', () => {
    const listener = vi.fn();
    requestLogger.onNewLog(listener);

    const entry = makeLog();
    requestLogger.log(entry);
    expect(listener).toHaveBeenCalledWith(entry);
  });

  it('unsubscribe stops notifications', () => {
    const listener = vi.fn();
    const unsubscribe = requestLogger.onNewLog(listener);

    requestLogger.log(makeLog());
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    requestLogger.log(makeLog());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('getStats calculates correctly', () => {
    requestLogger.log(makeLog({ duration: 100, blocked: false }));
    requestLogger.log(makeLog({ duration: 200, blocked: true }));
    requestLogger.log(makeLog({ duration: 300, blocked: false }));

    const stats = requestLogger.getStats();
    expect(stats.totalLogs).toBe(3);
    expect(stats.blockedCount).toBe(1);
    expect(stats.successCount).toBe(2);
    expect(stats.avgDuration).toBe(200);
  });

  it('getStats returns zero avgDuration for empty logs', () => {
    const stats = requestLogger.getStats();
    expect(stats.totalLogs).toBe(0);
    expect(stats.avgDuration).toBe(0);
  });

  it('clearLogs resets everything', () => {
    requestLogger.log(makeLog());
    requestLogger.log(makeLog());
    expect(requestLogger.getLogs().length).toBe(2);

    requestLogger.clearLogs();
    expect(requestLogger.getLogs().length).toBe(0);
  });
});
