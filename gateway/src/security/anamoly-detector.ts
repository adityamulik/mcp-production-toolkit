interface RequestMetrics {
  userId: string;
  tool: string;
  timestamp: number;
}

interface AnomalyResult {
  isAnomaly: boolean;
  type?: 'rate_spike' | 'unusual_tool' | 'off_hours' | 'large_payload';
  severity: 'low' | 'medium' | 'high';
  message: string;
}

class AnomalyDetector {
  private requestHistory: Map<string, RequestMetrics[]> = new Map();
  private baselineRates: Map<string, number> = new Map(); // requests/minute per user
  
  detectAnomaly(
    userId: string,
    tool: string,
    payload: any,
    userRole: string
  ): AnomalyResult {
    
    // Track request
    const history = this.requestHistory.get(userId) || [];
    history.push({ userId, tool, timestamp: Date.now() });
    this.requestHistory.set(userId, history);
    
    // Anomaly 1: Rate spike
    const recentRequests = history.filter(r => r.timestamp > Date.now() - 60000); // Last minute
    const currentRate = recentRequests.length;
    const baseline = this.baselineRates.get(userId) || 10;
    
    if (currentRate > baseline * 5) {
      return {
        isAnomaly: true,
        type: 'rate_spike',
        severity: 'high',
        message: `User making ${currentRate} req/min (baseline: ${baseline})`
      };
    }
    
    // Anomaly 2: Unusual tool for role
    const unusualTools = {
      developer: ['deploy_to_production', 'modify_permissions', 'delete_database'],
      analyst: ['execute_sql', 'deploy_to_production']
    };
    
    if (unusualTools[userRole as keyof typeof unusualTools]?.includes(tool)) {
      return {
        isAnomaly: true,
        type: 'unusual_tool',
        severity: 'medium',
        message: `${userRole} rarely calls ${tool}`
      };
    }
    
    // Anomaly 3: Off-hours access (outside 9am-5pm)
    const hour = new Date().getHours();
    if (hour < 9 || hour > 17) {
      if (['deploy_to_production', 'delete_database'].includes(tool)) {
        return {
          isAnomaly: true,
          type: 'off_hours',
          severity: 'medium',
          message: `Sensitive operation ${tool} at ${hour}:00 (off-hours)`
        };
      }
    }
    
    // Anomaly 4: Large payload
    const payloadSize = JSON.stringify(payload).length;
    if (payloadSize > 100000) { // 100KB
      return {
        isAnomaly: true,
        type: 'large_payload',
        severity: 'low',
        message: `Payload size: ${(payloadSize / 1024).toFixed(1)}KB`
      };
    }
    
    return {
      isAnomaly: false,
      severity: 'low',
      message: 'Normal behavior'
    };
  }
  
  // Update baseline (call periodically)
  updateBaseline(userId: string) {
    const history = this.requestHistory.get(userId) || [];
    const last24h = history.filter(r => r.timestamp > Date.now() - 86400000);
    const avgPerMinute = last24h.length / 1440; // 24h = 1440 minutes
    this.baselineRates.set(userId, Math.max(avgPerMinute, 5)); // Min baseline = 5
  }
}

export const anomalyDetector = new AnomalyDetector();