/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by stopping requests to failing services
 */

enum CircuitState {
  CLOSED = 'closed',      // Normal operation
  OPEN = 'open',          // Service failing, reject requests
  HALF_OPEN = 'half_open' // Testing if service recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number;      // Failures before opening (default: 5)
  successThreshold: number;      // Successes in half-open before closing (default: 2)
  timeout: number;               // Time before retrying (ms, default: 30000)
}

interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastStateChange: number;
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private circuitState: CircuitBreakerState;
  private failedRequests: number[] = [];

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeout: config.timeout ?? 30000
    };

    this.circuitState = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      lastStateChange: Date.now()
    };
  }

  /**
   * Check if request should be allowed
   */
  public canAttempt(): boolean {
    const { state, lastFailureTime } = this.circuitState;

    if (state === CircuitState.CLOSED) {
      return true;
    }

    if (state === CircuitState.OPEN) {
      // Try half-open after timeout
      if (lastFailureTime && Date.now() - lastFailureTime > this.config.timeout) {
        this.transitionTo(CircuitState.HALF_OPEN);
        return true;
      }
      return false;
    }

    // HALF_OPEN state
    return true;
  }

  /**
   * Record successful request
   */
  public recordSuccess(): void {
    this.failedRequests = [];

    const timestamp = new Date().toISOString();

    if (this.circuitState.state === CircuitState.HALF_OPEN) {
      this.circuitState.successCount++;
      console.log(`[${timestamp}] ✅ Circuit Breaker: Success in HALF_OPEN`, {
        successCount: this.circuitState.successCount,
        successThreshold: this.config.successThreshold
      });

      if (this.circuitState.successCount >= this.config.successThreshold) {
        console.log(`[${timestamp}] 🟢 Circuit Breaker: Recovery successful, closing circuit`);
        this.transitionTo(CircuitState.CLOSED);
      }

      // Record attempt result
      try {
        const { circuitBreakerAttempts } = require('../observability/metrics.js');
        circuitBreakerAttempts.inc({ result: 'success' });
      } catch (e) {
        // Metrics not available
      }
    } else if (this.circuitState.state === CircuitState.CLOSED) {
      this.circuitState.failureCount = 0;
    }
  }

  /**
   * Record failed request
   */
  public recordFailure(team?: string): void {
    this.circuitState.lastFailureTime = Date.now();
    this.failedRequests.push(Date.now());

    const timestamp = new Date().toISOString();
    const recentFailures = this.failedRequests.filter(
      time => Date.now() - time < 60000 // Last 60 seconds
    ).length;

    console.log(`[${timestamp}] ❌ Circuit Breaker Failure Recorded`, {
      team: team || 'unknown',
      failureCount: this.circuitState.failureCount + 1,
      failureThreshold: this.config.failureThreshold,
      recentFailuresInLastMin: recentFailures,
      state: this.circuitState.state
    });

    if (this.circuitState.state === CircuitState.HALF_OPEN) {
      console.log(`[${timestamp}] 🔴 Circuit Breaker: Failure in HALF_OPEN, returning to OPEN`);
      this.transitionTo(CircuitState.OPEN);
    } else if (this.circuitState.state === CircuitState.CLOSED) {
      this.circuitState.failureCount++;

      if (this.circuitState.failureCount >= this.config.failureThreshold) {
        console.log(
          `[${timestamp}] 🔓 Circuit Breaker: Threshold reached (${this.circuitState.failureCount}/${this.config.failureThreshold}), opening circuit`
        );
        this.transitionTo(CircuitState.OPEN);
      }
    }

    // Record metrics
    try {
      const { circuitBreakerFailures } = require('../observability/metrics.js');
      circuitBreakerFailures.inc({ team: team || 'unknown' });
    } catch (e) {
      // Metrics not available
    }
  }

  /**
   * Get current state
   */
  public getState(): CircuitBreakerState {
    return { ...this.circuitState };
  }

  /**
   * Get metrics
   */
  public getMetrics() {
    return {
      state: this.circuitState.state,
      failureCount: this.circuitState.failureCount,
      successCount: this.circuitState.successCount,
      timeSincLastFailure: this.circuitState.lastFailureTime 
        ? Date.now() - this.circuitState.lastFailureTime
        : null,
      recentFailures: this.failedRequests.filter(
        time => Date.now() - time < 60000 // Last 60 seconds
      ).length
    };
  }

  /**
   * Reset circuit breaker
   */
  public reset(): void {
    this.circuitState = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      lastStateChange: Date.now()
    };
    this.failedRequests = [];
  }

  /**
   * Force state transition
   */
  private transitionTo(newState: CircuitState): void {
    if (newState === this.circuitState.state) return;

    const oldState = this.circuitState.state;
    this.circuitState.state = newState;
    this.circuitState.lastStateChange = Date.now();

    if (newState === CircuitState.CLOSED) {
      this.circuitState.failureCount = 0;
      this.circuitState.successCount = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.circuitState.successCount = 0;
    }

    console.log(`Circuit Breaker: ${oldState} -> ${newState}`);
  }
}

export const mcpCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000
});
