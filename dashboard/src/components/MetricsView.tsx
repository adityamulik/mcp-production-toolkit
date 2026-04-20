import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircle, AlertCircle, Zap } from 'lucide-react';
import './MetricsView.css';

interface MetricPoint {
  time: string;
  timestamp: number; // Unix timestamp in ms
  success: number;
  blocked: number;
  anomalies: number;
  rateLimited: number;
  retried: number;
}

interface CircuitBreakerMetrics {
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  successCount: number;
  timeSincLastFailure: number | null;
  recentFailures: number;
}

interface SecurityStats {
  blocked: number;
  allowed: number;
  anomalies: number;
  total: number;
}

export default function MetricsView() {
  const [allMetrics, setAllMetrics] = useState<MetricPoint[]>([]);
  const [timeRange, setTimeRange] = useState<'1s' | '30s' | '1m' | '30m' | '1h' | '12h' | '24h'>('30m');
  const [teamCBMetrics, setTeamCBMetrics] = useState<Record<string, CircuitBreakerMetrics>>({});
  const [securityStats, setSecurityStats] = useState<SecurityStats>({ blocked: 0, allowed: 0, anomalies: 0, total: 0 });

  // Filter metrics based on time range
  const getFilteredMetrics = () => {
    const now = Date.now();
    const timeRanges: Record<string, number> = {
      '1s': 1000,
      '30s': 30000,
      '1m': 60000,
      '30m': 30 * 60000,
      '1h': 60 * 60000,
      '12h': 12 * 60 * 60000,
      '24h': 24 * 60 * 60000
    };
    
    const cutoffTime = now - timeRanges[timeRange];
    return allMetrics.filter(m => m.timestamp >= cutoffTime);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('📊 Metrics: No token available');
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    console.log('📊 Metrics: Starting polling to', apiUrl);
    
    // Fetch initial security stats
    fetch(`${apiUrl}/stats`)
      .then(res => res.json())
      .then(setSecurityStats)
      .catch(e => console.error('Failed to fetch initial stats:', e));

    // Fetch initial circuit breaker metrics
    fetch(`${apiUrl}/health/circuit`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.teamCircuitBreakers) {
          console.log('📊 Initial team circuit breaker metrics:', data.teamCircuitBreakers);
          setTeamCBMetrics(data.teamCircuitBreakers);
        }
      })
      .catch(e => console.error('Failed to fetch initial circuit breaker metrics:', e));

    // Connect to SSE for real-time security stats updates
    const eventSource = new EventSource(`${apiUrl}/events`);
    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type !== 'initial') {
        setSecurityStats(prev => ({
          ...prev,
          [data.type]: prev[data.type as keyof SecurityStats] + 1,
          total: prev.total + 1
        }));
      }
    };

    const interval = setInterval(async () => {
      try {
        // Fetch request metrics
        const res = await fetch(`${apiUrl}/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = await res.json();
        console.log('📊 Metrics: Fetched stats:', stats);

        // Update security stats from API response too
        if (stats.allowed !== undefined || stats.blocked !== undefined || stats.anomalies !== undefined) {
          setSecurityStats(prev => ({
            allowed: stats.allowed ?? prev.allowed,
            blocked: stats.blocked ?? prev.blocked,
            anomalies: stats.anomalies ?? prev.anomalies,
            total: (stats.allowed ?? 0) + (stats.blocked ?? 0) + (stats.anomalies ?? 0)
          }));
        }

        const now = new Date();
        const timestamp = now.getTime();
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

        setAllMetrics(prev => {
          const newMetric = {
            time: timeStr,
            timestamp,
            success: stats.allowed ?? stats.success ?? 0,
            blocked: stats.blocked ?? 0,
            anomalies: stats.anomalies ?? 0,
            rateLimited: stats.rate_limited ?? 0,
            retried: stats.retried ?? 0
          };
          
          // Keep metrics for 24 hours, removing old ones
          const cutoffTime = timestamp - (24 * 60 * 60 * 1000);
          const filtered = prev.filter(m => m.timestamp >= cutoffTime);
          
          const lastMetric = filtered[filtered.length - 1];
          const isDifferentMinute = !lastMetric || lastMetric.time !== timeStr;
          
          if (isDifferentMinute) {
            return [...filtered, newMetric];
          } else {
            return [...filtered.slice(0, -1), newMetric];
          }
        });
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }

      // Fetch circuit breaker metrics 
      try {
        const cbRes = await fetch(`${apiUrl}/health/circuit`);
        if (cbRes.ok) {
          const cbData = await cbRes.json();
          if (cbData.teamCircuitBreakers) {
            console.log('🔌 Team circuit breaker update:', cbData.teamCircuitBreakers);
            setTeamCBMetrics(cbData.teamCircuitBreakers);
          }
        } else {
          console.warn('Circuit breaker endpoint returned:', cbRes.status);
        }
      } catch (e) {
        console.error('Failed to fetch circuit breaker metrics:', e);
      }
    }, 5000); // Update every 5 seconds

    // Faster circuit breaker polling (every 2 seconds)
    const cbInterval = setInterval(async () => {
      try {
        const cbRes = await fetch(`${apiUrl}/health/circuit`);
        if (cbRes.ok) {
          const cbData = await cbRes.json();
          if (cbData.teamCircuitBreakers) {
            setTeamCBMetrics(cbData.teamCircuitBreakers);
          }
        }
      } catch (e) {
        // Silently fail for circuit breaker polling
      }
    }, 2000);

    return () => {
      console.log('📊 Metrics: Stopping polling');
      clearInterval(interval);
      clearInterval(cbInterval);
      eventSource.close();
    };
  }, []);

  return (
    <div className="metrics-view">
      <div className="metrics-header">
        <h2>📊 Request Metrics & Security</h2>
      </div>

      {/* Summary Stats */}
      <div className="quick-stats-grid">
        <div className="quick-stat success">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <div className="stat-value">{securityStats.allowed}</div>
            <div className="stat-label">Success</div>
          </div>
        </div>
        <div className="quick-stat blocked">
          <div className="stat-icon">⚠</div>
          <div className="stat-content">
            <div className="stat-value">{securityStats.blocked}</div>
            <div className="stat-label">Blocked</div>
          </div>
        </div>
        <div className="quick-stat anomaly">
          <div className="stat-icon">🔍</div>
          <div className="stat-content">
            <div className="stat-value">{securityStats.anomalies}</div>
            <div className="stat-label">Anomalies</div>
          </div>
        </div>
        <div className="quick-stat retried">
          <div className="stat-icon">↻</div>
          <div className="stat-content">
            <div className="stat-value">{allMetrics.length > 0 ? allMetrics[allMetrics.length - 1]?.retried || 0 : 0}</div>
            <div className="stat-label">Retried</div>
          </div>
        </div>
        <div className="quick-stat ratelimited">
          <div className="stat-icon">🚫</div>
          <div className="stat-content">
            <div className="stat-value">{allMetrics.length > 0 ? allMetrics[allMetrics.length - 1]?.rateLimited || 0 : 0}</div>
            <div className="stat-label">Rate Limited</div>
          </div>
        </div>
        <div className="quick-stat failures">
          <div className="stat-icon">💥</div>
          <div className="stat-content">
            <div className="stat-value">{Object.values(teamCBMetrics).reduce((sum, m) => sum + (m.failureCount || 0), 0)}</div>
            <div className="stat-label">CB Failures</div>
          </div>
        </div>
      </div>

      {/* Request Metrics Chart */}
      <div className="chart-card">
        <div className="chart-header">
          <h3>Request Trend</h3>
          <div className="time-range-selector">
            {(['1s', '30s', '1m', '30m', '1h', '12h', '24h'] as const).map(range => (
              <button
                key={range}
                className={`time-range-btn ${timeRange === range ? 'active' : ''}`}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        {getFilteredMetrics().length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={getFilteredMetrics()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#6b7280" style={{fontSize: '12px'}} />
              <YAxis stroke="#6b7280" style={{fontSize: '12px'}} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                labelStyle={{ color: '#1a1a1a' }}
              />
              <Legend wrapperStyle={{fontSize: '12px'}} />
              <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} name="Success" dot={{r: 3}} />
              <Line type="monotone" dataKey="blocked" stroke="#ef4444" strokeWidth={2} name="Blocked" dot={{r: 3}} />
              <Line type="monotone" dataKey="anomalies" stroke="#f59e0b" strokeWidth={2} name="Anomalies" dot={{r: 3}} />
              <Line type="monotone" dataKey="retried" stroke="#3b82f6" strokeWidth={2} name="Retried" dot={{r: 3}} />
              <Line type="monotone" dataKey="rateLimited" stroke="#8b5cf6" strokeWidth={2} name="Rate Limited" dot={{r: 3}} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-loading">Loading metrics...</div>
        )}
      </div>

      {/* Team Circuit Breakers */}
      <div className="circuit-breakers-row">
        {Object.entries(teamCBMetrics).map(([team, metrics]) => (
          <div key={team} className="panel-card circuit-breaker-panel">
          <h3>🔌 Circuit Breaker - Team {team.toUpperCase()}</h3>
          <div className={`cb-status-display status-${metrics.state}`}>
            <div className="cb-badge">
              {metrics.state === 'closed' && <CheckCircle className="icon" />}
              {metrics.state === 'open' && <AlertCircle className="icon" />}
              {metrics.state === 'half_open' && <Zap className="icon" />}
            </div>
            <div className="cb-details">
              <div className="cb-state-text">{metrics.state.toUpperCase()}</div>
              <div className="cb-metrics-grid">
                <div className="cb-metric-item">
                  <span className="label">Failures</span>
                  <span className="value">{metrics.failureCount}</span>
                </div>
                <div className="cb-metric-item">
                  <span className="label">Recent (60s)</span>
                  <span className="value">{metrics.recentFailures}</span>
                </div>
                {metrics.timeSincLastFailure && (
                  <div className="cb-metric-item">
                    <span className="label">Last Failure</span>
                    <span className="value">{(metrics.timeSincLastFailure / 1000).toFixed(1)}s</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
