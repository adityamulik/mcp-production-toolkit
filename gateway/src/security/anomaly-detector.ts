/**
 * Anomaly Detector
 * Detects suspicious patterns in user requests
 */

interface AnomalyResult {
  isAnomaly: boolean;
  type?: string;
  severity?: 'low' | 'medium' | 'high';
  message?: string;
}

class AnomalyDetector {
  private userRequestCounts = new Map<string, number>();
  private lastRequestTime = new Map<string, number>();
  private rateLimitedCount = 0;
  private readonly MAX_REQUESTS_PER_MINUTE = 30;
  private readonly MIN_REQUEST_INTERVAL_MS = 100;

  public detectAnomaly(
    userId: string,
    tool: string,
    args: any,
    role: string
  ): AnomalyResult {
    const now = Date.now();
    const lastTime = this.lastRequestTime.get(userId) || 0;
    const timeSinceLastRequest = now - lastTime;

    // Check for rapid requests (potential abuse)
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL_MS) {
      return {
        isAnomaly: true,
        type: 'rapid_requests',
        severity: 'medium',
        message: `User ${userId} sending requests too quickly`
      };
    }

    // Check request counts
    const count = (this.userRequestCounts.get(userId) || 0) + 1;
    this.userRequestCounts.set(userId, count);
    this.lastRequestTime.set(userId, now);

    // Reset counts every minute
    setTimeout(() => {
      this.userRequestCounts.set(userId, 0);
    }, 60000);

    if (count > this.MAX_REQUESTS_PER_MINUTE) {
      this.rateLimitedCount++;
      return {
        isAnomaly: true,
        type: 'rate_limit_exceeded',
        severity: 'high',
        message: `User ${userId} exceeded rate limit`
      };
    }

    return { isAnomaly: false };
  }

  public getRateLimitedCount(): number {
    return this.rateLimitedCount;
  }

  public resetStats(): void {
    this.rateLimitedCount = 0;
    this.userRequestCounts.clear();
    this.lastRequestTime.clear();
  }
}

export const anomalyDetector = new AnomalyDetector();
