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
  private readonly MAX_REQUESTS_PER_MINUTE = 12000; // 200 TPS = 12,000 req/min
  private readonly MIN_REQUEST_INTERVAL_MS = 5; // Allow ~200 req/sec

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
      return {
        isAnomaly: true,
        type: 'rate_limit_exceeded',
        severity: 'high',
        message: `User ${userId} exceeded rate limit`
      };
    }

    return { isAnomaly: false };
  }
}

export const anomalyDetector = new AnomalyDetector();
