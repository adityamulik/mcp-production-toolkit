import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { anomalyDetector } from '../security/anomaly-detector';

describe('AnomalyDetector', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns no anomaly for a normal request', () => {
    const result = anomalyDetector.detectAnomaly('user-normal-1', 'read_file', {}, 'viewer');
    expect(result.isAnomaly).toBe(false);
  });

  it('detects rapid requests when called too quickly', () => {
    // First call succeeds
    const first = anomalyDetector.detectAnomaly('user-rapid-1', 'read_file', {}, 'viewer');
    expect(first.isAnomaly).toBe(false);

    // Second call within 100ms should be detected as rapid
    vi.advanceTimersByTime(10);
    const second = anomalyDetector.detectAnomaly('user-rapid-1', 'read_file', {}, 'viewer');
    expect(second.isAnomaly).toBe(true);
    expect(second.type).toBe('rapid_requests');
    expect(second.severity).toBe('medium');
  });

  it('allows requests spaced more than 100ms apart', () => {
    const first = anomalyDetector.detectAnomaly('user-spaced-1', 'read_file', {}, 'viewer');
    expect(first.isAnomaly).toBe(false);

    vi.advanceTimersByTime(150);
    const second = anomalyDetector.detectAnomaly('user-spaced-1', 'read_file', {}, 'viewer');
    expect(second.isAnomaly).toBe(false);
  });

  it('detects rate limit exceeded when user sends more than 30 requests', () => {
    const userId = 'user-ratelimit-1';

    // Send 30 requests (spaced out enough to avoid rapid detection)
    for (let i = 0; i < 30; i++) {
      vi.advanceTimersByTime(150);
      const result = anomalyDetector.detectAnomaly(userId, 'read_file', {}, 'viewer');
      expect(result.isAnomaly).toBe(false);
    }

    // 31st request should exceed rate limit
    vi.advanceTimersByTime(150);
    const result = anomalyDetector.detectAnomaly(userId, 'read_file', {}, 'viewer');
    expect(result.isAnomaly).toBe(true);
    expect(result.type).toBe('rate_limit_exceeded');
    expect(result.severity).toBe('high');
  });

  it('resets counts after 60 seconds', () => {
    const userId = 'user-reset-1';

    // Send a request
    anomalyDetector.detectAnomaly(userId, 'read_file', {}, 'viewer');

    // Advance past the 60s reset
    vi.advanceTimersByTime(61000);

    // Count should be reset, so we can send many more
    for (let i = 0; i < 30; i++) {
      vi.advanceTimersByTime(150);
      const result = anomalyDetector.detectAnomaly(userId, 'read_file', {}, 'viewer');
      expect(result.isAnomaly).toBe(false);
    }
  });

  it('tracks different users independently', () => {
    const result1 = anomalyDetector.detectAnomaly('user-indep-a', 'read_file', {}, 'viewer');
    expect(result1.isAnomaly).toBe(false);

    vi.advanceTimersByTime(150);
    const result2 = anomalyDetector.detectAnomaly('user-indep-b', 'read_file', {}, 'viewer');
    expect(result2.isAnomaly).toBe(false);
  });

  it('includes user ID in the anomaly message', () => {
    anomalyDetector.detectAnomaly('user-msg-1', 'read_file', {}, 'viewer');
    vi.advanceTimersByTime(10);
    const result = anomalyDetector.detectAnomaly('user-msg-1', 'read_file', {}, 'viewer');
    expect(result.message).toContain('user-msg-1');
  });
});
