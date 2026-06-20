import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker } from '../resilience/circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 5000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in CLOSED state', () => {
    const state = breaker.getState();
    expect(state.state).toBe('closed');
    expect(state.failureCount).toBe(0);
    expect(state.successCount).toBe(0);
  });

  it('allows attempts in CLOSED state', () => {
    expect(breaker.canAttempt()).toBe(true);
  });

  it('transitions to OPEN after failureThreshold failures', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState().state).toBe('closed');

    breaker.recordFailure();
    expect(breaker.getState().state).toBe('open');
  });

  it('rejects attempts in OPEN state', () => {
    for (let i = 0; i < 3; i++) breaker.recordFailure();
    expect(breaker.getState().state).toBe('open');
    expect(breaker.canAttempt()).toBe(false);
  });

  it('transitions from OPEN to HALF_OPEN after timeout', () => {
    for (let i = 0; i < 3; i++) breaker.recordFailure();
    expect(breaker.getState().state).toBe('open');

    vi.advanceTimersByTime(5001);
    expect(breaker.canAttempt()).toBe(true);
    expect(breaker.getState().state).toBe('half_open');
  });

  it('allows attempts in HALF_OPEN state', () => {
    for (let i = 0; i < 3; i++) breaker.recordFailure();
    vi.advanceTimersByTime(5001);
    breaker.canAttempt(); // triggers transition to HALF_OPEN
    expect(breaker.canAttempt()).toBe(true);
  });

  it('increments successCount in HALF_OPEN on success', () => {
    for (let i = 0; i < 3; i++) breaker.recordFailure();
    vi.advanceTimersByTime(5001);
    breaker.canAttempt(); // transition to HALF_OPEN

    breaker.recordSuccess();
    expect(breaker.getState().successCount).toBe(1);
  });

  it('transitions from HALF_OPEN to CLOSED after successThreshold successes', () => {
    for (let i = 0; i < 3; i++) breaker.recordFailure();
    vi.advanceTimersByTime(5001);
    breaker.canAttempt(); // transition to HALF_OPEN

    breaker.recordSuccess();
    expect(breaker.getState().state).toBe('half_open');

    breaker.recordSuccess();
    expect(breaker.getState().state).toBe('closed');
  });

  it('transitions from HALF_OPEN back to OPEN on failure', () => {
    for (let i = 0; i < 3; i++) breaker.recordFailure();
    vi.advanceTimersByTime(5001);
    breaker.canAttempt(); // transition to HALF_OPEN

    breaker.recordFailure();
    expect(breaker.getState().state).toBe('open');
  });

  it('reset() returns to CLOSED state', () => {
    for (let i = 0; i < 3; i++) breaker.recordFailure();
    expect(breaker.getState().state).toBe('open');

    breaker.reset();
    expect(breaker.getState().state).toBe('closed');
    expect(breaker.getState().failureCount).toBe(0);
    expect(breaker.getState().successCount).toBe(0);
    expect(breaker.getState().lastFailureTime).toBeNull();
  });

  it('recordSuccess in CLOSED resets failureCount', () => {
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.getState().failureCount).toBe(2);

    breaker.recordSuccess();
    expect(breaker.getState().failureCount).toBe(0);
  });

  it('getMetrics returns correct data', () => {
    breaker.recordFailure('team-a');
    const metrics = breaker.getMetrics();
    expect(metrics.state).toBe('closed');
    expect(metrics.failureCount).toBe(1);
    expect(metrics.timeSincLastFailure).not.toBeNull();
    expect(metrics.recentFailures).toBe(1);
  });

  it('does not transition to HALF_OPEN before timeout', () => {
    for (let i = 0; i < 3; i++) breaker.recordFailure();
    vi.advanceTimersByTime(4000); // less than 5000 timeout
    expect(breaker.canAttempt()).toBe(false);
    expect(breaker.getState().state).toBe('open');
  });
});
