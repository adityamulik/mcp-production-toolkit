/**
 * Retry Policy Implementation
 * Handles transient failures with exponential backoff
 */

export interface RetryConfig {
  maxAttempts: number;           // Max number of retry attempts (default: 3)
  initialDelayMs: number;        // Initial delay in ms (default: 100)
  maxDelayMs: number;            // Maximum delay in ms (default: 10000)
  backoffMultiplier: number;     // Exponential backoff multiplier (default: 2)
  retryableStatusCodes: number[]; // Status codes to retry on
  retryableErrors: string[];     // Error types to retry on
}

export interface RetryState {
  attempt: number;
  lastError: Error | null;
  totalDelayMs: number;
}

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: any, config: RetryConfig): boolean {
  // Network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }

  // Check if error message matches retryable patterns
  const message = error.message?.toLowerCase() || '';
  const retryablePatterns = ['timeout', 'econnrefused', 'econnreset', 'temporarily unavailable'];
  
  return retryablePatterns.some(pattern => message.includes(pattern));
}

/**
 * Determines if an HTTP status code is retryable
 */
function isRetryableStatus(status: number, config: RetryConfig): boolean {
  // 408 Request Timeout, 429 Too Many Requests, 5xx Server Errors
  return config.retryableStatusCodes.includes(status);
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoff(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  
  // Add jitter (random ±10%)
  const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1);
  
  return Math.max(0, Math.floor(cappedDelay + jitter));
}

export class RetryPolicy {
  private config: RetryConfig;
  private attemptHistory: Map<string, RetryState> = new Map();

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: config.maxAttempts ?? 3,
      initialDelayMs: config.initialDelayMs ?? 100,
      maxDelayMs: config.maxDelayMs ?? 10000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      retryableStatusCodes: config.retryableStatusCodes ?? [408, 429, 500, 502, 503, 504],
      retryableErrors: config.retryableErrors ?? ['TIMEOUT', 'ECONNREFUSED', 'ECONNRESET']
    };
  }

  /**
   * Execute function with retry logic
   */
  public async execute<T>(
    requestId: string,
    fn: () => Promise<T>,
    onRetry?: (attempt: number, delay: number, error: Error) => void
  ): Promise<T> {
    let lastError: Error | null = null;
    let totalDelayMs = 0;
    const timestamp = new Date().toISOString();

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const result = await fn();
        
        // Log successful execution
        if (attempt > 1) {
          console.log(`[${timestamp}] ✅ Retry Success`, {
            requestId,
            attempt,
            totalDelayMs,
            totalAttempts: this.config.maxAttempts
          });
          
          // Record retry success metric
          try {
            const { retrySuccessRate } = require('../observability/metrics.js');
            retrySuccessRate.inc({ tool: requestId.split('-')[1] || 'unknown' });
          } catch (e) {
            // Metrics not available
          }
        }
        
        this.clearHistory(requestId);
        return result;
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        if (!isRetryableError(error, this.config) || attempt === this.config.maxAttempts) {
          if (attempt === this.config.maxAttempts) {
            console.log(`[${timestamp}] ❌ Retry Exhausted`, {
              requestId,
              attempts: attempt,
              totalDelayMs,
              finalError: error.message,
              code: error.code
            });
            
            // Record retry exhaustion metric
            try {
              const { retryExhausted } = require('../observability/metrics.js');
              const toolName = requestId.split('-')[1] || 'unknown';
              const reason = error.code || 'unknown';
              retryExhausted.inc({ tool: toolName, reason });
            } catch (e) {
              // Metrics not available
            }
          }
          throw error;
        }

        // Calculate backoff delay
        const delay = calculateBackoff(attempt, this.config);
        totalDelayMs += delay;

        // Notify about retry
        if (onRetry) {
          onRetry(attempt, delay, error);
        }

        console.log(
          `[${timestamp}] 🔄 Retrying Request (attempt ${attempt}/${this.config.maxAttempts}) after ${delay}ms`,
          { 
            requestId,
            error: error.message,
            code: error.code,
            totalDelayMs
          }
        );

        // Record retry attempt metric
        try {
          const { retryAttempts, retryBackoffDelay } = require('../observability/metrics.js');
          const toolName = requestId.split('-')[1] || 'unknown';
          retryAttempts.inc({ tool: toolName, result: 'retry' });
          retryBackoffDelay.observe({ attempt: attempt.toString() }, delay);
        } catch (e) {
          // Metrics not available
        }

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Execute with response handling (for HTTP responses)
   */
  public async executeWithStatus<T>(
    requestId: string,
    fn: () => Promise<{ status: number; data: T }>,
    onRetry?: (attempt: number, delay: number, status: number) => void
  ): Promise<{ status: number; data: T }> {
    let lastResponse: { status: number; data: T } | null = null;
    let totalDelayMs = 0;
    const timestamp = new Date().toISOString();

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        const response = await fn();

        // Check if status is retryable
        if (!this.isRetryableStatus(response.status) || attempt === this.config.maxAttempts) {
          if (attempt > 1 && response.status < 400) {
            console.log(`[${timestamp}] ✅ Retry Success on Status`, {
              requestId,
              status: response.status,
              attempt,
              totalDelayMs,
              totalAttempts: this.config.maxAttempts
            });
            
            // Record retry success
            try {
              const { retrySuccessRate } = require('../observability/metrics.js');
              const toolName = requestId.split('-')[1] || 'unknown';
              retrySuccessRate.inc({ tool: toolName });
            } catch (e) {
              // Metrics not available
            }
          }
          
          this.clearHistory(requestId);
          return response;
        }

        lastResponse = response;

        // Calculate backoff delay
        const delay = calculateBackoff(attempt, this.config);
        totalDelayMs += delay;

        if (onRetry) {
          onRetry(attempt, delay, response.status);
        }

        console.log(
          `[${timestamp}] 🔄 Retrying on HTTP ${response.status} (attempt ${attempt}/${this.config.maxAttempts}) after ${delay}ms`,
          {
            requestId,
            status: response.status,
            totalDelayMs
          }
        );

        // Record retry attempt metric
        try {
          const { retryAttempts, retryBackoffDelay } = require('../observability/metrics.js');
          const toolName = requestId.split('-')[1] || 'unknown';
          retryAttempts.inc({ tool: toolName, result: 'retry' });
          retryBackoffDelay.observe({ attempt: attempt.toString() }, delay);
        } catch (e) {
          // Metrics not available
        }

        await this.sleep(delay);
      } catch (error: any) {
        // Non-retryable error
        console.log(`[${timestamp}] ❌ Non-retryable error in executeWithStatus`, {
          requestId,
          attempt,
          error: error.message,
          totalDelayMs
        });
        
        // Record retry exhaustion
        try {
          const { retryExhausted } = require('../observability/metrics.js');
          const toolName = requestId.split('-')[1] || 'unknown';
          retryExhausted.inc({ tool: toolName, reason: error.message });
        } catch (e) {
          // Metrics not available
        }
        
        throw error;
      }
    }

    // If we exhausted retries but have a response, log exhaustion
    if (lastResponse) {
      console.log(`[${timestamp}] ❌ Retry Exhausted on Status`, {
        requestId,
        finalStatus: lastResponse.status,
        attempts: this.config.maxAttempts,
        totalDelayMs
      });
      
      // Record retry exhaustion
      try {
        const { retryExhausted } = require('../observability/metrics.js');
        const toolName = requestId.split('-')[1] || 'unknown';
        retryExhausted.inc({ tool: toolName, reason: `http_${lastResponse.status}` });
      } catch (e) {
        // Metrics not available
      }
      
      return lastResponse;
    }

    throw new Error(
      `Failed after ${this.config.maxAttempts} attempts`
    );
  }

  /**
   * Check if HTTP status is retryable
   */
  public isRetryableStatus(status: number): boolean {
    return isRetryableStatus(status, this.config);
  }

  /**
   * Get retry metrics for a request
   */
  public getMetrics(requestId: string): RetryState | null {
    return this.attemptHistory.get(requestId) || null;
  }

  /**
   * Clear retry history for a request
   */
  private clearHistory(requestId: string): void {
    this.attemptHistory.delete(requestId);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const mcpRetryPolicy = new RetryPolicy({
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
});
