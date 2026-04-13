import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryPolicy } from '../resilience/retry-policy';

describe('RetryPolicy', () => {
  let policy: RetryPolicy;

  beforeEach(() => {
    vi.useFakeTimers();
    policy = new RetryPolicy({
      maxAttempts: 3,
      initialDelayMs: 10,
      maxDelayMs: 100,
      backoffMultiplier: 2,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('execute', () => {
    it('succeeds on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('ok');
      const result = await policy.execute('req-1', fn);
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable error and succeeds', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }))
        .mockResolvedValue('recovered');

      const promise = policy.execute('req-2', fn);
      await vi.advanceTimersByTimeAsync(200);
      const result = await promise;
      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('exhausts all attempts and throws', async () => {
      const error = Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' });
      const fn = vi.fn().mockRejectedValue(error);

      // Start execution and capture the rejection
      let caughtError: Error | undefined;
      const promise = policy.execute('req-3', fn).catch((e: Error) => {
        caughtError = e;
      });

      // Advance timers enough for all backoff delays to resolve
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }
      await promise;
      expect(caughtError).toBeDefined();
      expect(caughtError!.message).toBe('connection refused');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('throws immediately on non-retryable error', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('validation failed'));

      await expect(policy.execute('req-4', fn)).rejects.toThrow('validation failed');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('calls onRetry callback on retry', async () => {
      const error = Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' });
      const fn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('ok');
      const onRetry = vi.fn();

      const promise = policy.execute('req-5', fn, onRetry);
      await vi.advanceTimersByTimeAsync(200);
      await promise;
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Number), error);
    });
  });

  describe('isRetryableStatus', () => {
    it('returns true for retryable status codes', () => {
      expect(policy.isRetryableStatus(408)).toBe(true);
      expect(policy.isRetryableStatus(429)).toBe(true);
      expect(policy.isRetryableStatus(500)).toBe(true);
      expect(policy.isRetryableStatus(502)).toBe(true);
      expect(policy.isRetryableStatus(503)).toBe(true);
      expect(policy.isRetryableStatus(504)).toBe(true);
    });

    it('returns false for non-retryable status codes', () => {
      expect(policy.isRetryableStatus(200)).toBe(false);
      expect(policy.isRetryableStatus(201)).toBe(false);
      expect(policy.isRetryableStatus(400)).toBe(false);
      expect(policy.isRetryableStatus(404)).toBe(false);
    });
  });

  describe('executeWithStatus', () => {
    it('returns response on non-retryable status', async () => {
      const fn = vi.fn().mockResolvedValue({ status: 200, data: 'ok' });
      const result = await policy.executeWithStatus('req-s1', fn);
      expect(result.status).toBe(200);
      expect(result.data).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on retryable status codes', async () => {
      const fn = vi.fn()
        .mockResolvedValueOnce({ status: 503, data: 'unavailable' })
        .mockResolvedValue({ status: 200, data: 'recovered' });

      const promise = policy.executeWithStatus('req-s2', fn);
      await vi.advanceTimersByTimeAsync(200);
      const result = await promise;
      expect(result.status).toBe(200);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('returns last response after exhausting retries', async () => {
      const fn = vi.fn().mockResolvedValue({ status: 500, data: 'error' });

      const promise = policy.executeWithStatus('req-s3', fn);
      await vi.advanceTimersByTimeAsync(500);
      const result = await promise;
      expect(result.status).toBe(500);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('calls onRetry callback for status retries', async () => {
      const fn = vi.fn()
        .mockResolvedValueOnce({ status: 429, data: 'rate limited' })
        .mockResolvedValue({ status: 200, data: 'ok' });
      const onRetry = vi.fn();

      const promise = policy.executeWithStatus('req-s4', fn, onRetry);
      await vi.advanceTimersByTimeAsync(200);
      await promise;
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Number), 429);
    });

    it('does not retry on 400 status', async () => {
      const fn = vi.fn().mockResolvedValue({ status: 400, data: 'bad request' });
      const result = await policy.executeWithStatus('req-s5', fn);
      expect(result.status).toBe(400);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
