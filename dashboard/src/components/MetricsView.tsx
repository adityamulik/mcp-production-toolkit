import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CheckCircle, AlertCircle, Zap, Shield, AlertTriangle, Activity } from 'lucide-react';
import './MetricsView.css';

interface MetricPoint {
  time: string;
  requests: number;
  blocked: number;
  anomalies: number;
}

interface CircuitBreakerMetrics {
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  successCount: number;
  timeSincLastFailure: number | null;
  recentFailures: number;
}

interface SecurityEvent {
  type: 'blocked' | 'allowed' | 'anomaly';
  timestamp: number;
  userId: string;
  tool: string;
  reason?: string;
  severity?: string;
  details?: any;
}

interface SecurityStats {
  blocked: number;
  allowed: number;
  anomalies: number;
  total: number;
}

export default function MetricsView() {
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [cbMetrics, setCbMetrics] = useState<CircuitBreakerMetrics | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [securityStats, setSecurityStats] = useState<SecurityStats>({ blocked: 0, allowed: 0, anomalies: 0, total: 0 });

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
    fetch(`${apiUrl}/health/circuit`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setCbMetrics(data.circuitBreaker))
      .catch(e => console.error('Failed to fetch initial circuit breaker metrics:', e));

    // Connect to SSE for real-time security events
    const eventSource = new EventSource(`${apiUrl}/events`);
    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'initial') {
        setSecurityEvents(data.events);
      } else {
        setSecurityEvents(prev => [data, ...prev].slice(0, 50));
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

        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

        setMetrics(prev => [
          ...prev.slice(-20), // Keep last 20 points
          {
            time: timeStr,
            requests: stats.total || 0,
            blocked: stats.blocked || 0,
            anomalies: stats.anomalies || 0
          }
        ]);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }

      // Fetch circuit breaker metrics (periodic update)
      try {
        const cbRes = await fetch(`${apiUrl}/health/circuit`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (cbRes.ok) {
          const cbData = await cbRes.json();
          setCbMetrics(cbData.circuitBreaker);
        }
      } catch (e) {
        console.error('Failed to fetch circuit breaker metrics:', e);
      }
    }, 5000); // Update every 5 seconds

    return () => {
      console.log('📊 Metrics: Stopping polling');
      clearInterval(interval);
      eventSource.close();
    };
  }, []);

  return (
    <div className="metrics-view">
      <h2>Request Metrics</h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={metrics}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="time" stroke="#888" />
          <YAxis stroke="#888" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
          />
          <Legend />
          <Line type="monotone" dataKey="requests" stroke="#4af" strokeWidth={2} name="Total" />
          <Line type="monotone" dataKey="blocked" stroke="#f44" strokeWidth={2} name="Blocked" />
          <Line type="monotone" dataKey="anomalies" stroke="#fa4" strokeWidth={2} name="Anomalies" />
        </LineChart>
      </ResponsiveContainer>

      <div className="metrics-summary">
        <h3>Last 5 Minutes Summary</h3>
        {metrics.length > 0 && (
          <div className="summary-grid">
            <div>Total Requests: <strong>{metrics[metrics.length - 1]?.requests || 0}</strong></div>
            <div>Blocked: <strong className="text-red">{metrics[metrics.length - 1]?.blocked || 0}</strong></div>
            <div>Anomalies: <strong className="text-yellow">{metrics[metrics.length - 1]?.anomalies || 0}</strong></div>
          </div>
        )}
      </div>

      {cbMetrics && (
        <div className="circuit-breaker-status">
          <h3>Circuit Breaker Status</h3>
          <div className="cb-status-container">
            <div className={`cb-state ${cbMetrics.state}`}>
              {cbMetrics.state === 'closed' && <CheckCircle className="cb-icon" />}
              {cbMetrics.state === 'open' && <AlertCircle className="cb-icon" />}
              {cbMetrics.state === 'half_open' && <Zap className="cb-icon" />}
              <div className="cb-info">
                <span className="cb-state-label">
                  {cbMetrics.state === 'closed' ? 'CLOSED' : cbMetrics.state === 'open' ? 'OPEN' : 'HALF-OPEN'}
                </span>
                <div className="cb-details">
                  <span>Failures: {cbMetrics.failureCount}</span>
                  <span>Recent (60s): {cbMetrics.recentFailures}</span>
                  {cbMetrics.timeSincLastFailure && (
                    <span>Last Failure: {(cbMetrics.timeSincLastFailure / 1000).toFixed(1)}s ago</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="security-events-section">
        <h3>Security Events</h3>
        
        <div className="security-stats-grid">
          <div className="stat-card blocked">
            <Shield size={24} />
            <div>
              <div className="stat-value">{securityStats.blocked}</div>
              <div className="stat-label">Blocked</div>
            </div>
          </div>

          <div className="stat-card allowed">
            <CheckCircle size={24} />
            <div>
              <div className="stat-value">{securityStats.allowed}</div>
              <div className="stat-label">Allowed</div>
            </div>
          </div>

          <div className="stat-card anomaly">
            <AlertTriangle size={24} />
            <div>
              <div className="stat-value">{securityStats.anomalies}</div>
              <div className="stat-label">Anomalies</div>
            </div>
          </div>

          <div className="stat-card total">
            <Activity size={24} />
            <div>
              <div className="stat-value">{securityStats.total}</div>
              <div className="stat-label">Total (5min)</div>
            </div>
          </div>
        </div>

        <div className="events-list">
          {securityEvents.length === 0 ? (
            <p className="no-events">No security events</p>
          ) : (
            securityEvents.map((event, idx) => (
              <div key={idx} className={`event event-${event.type}`}>
                <div className="event-header">
                  <span className={`event-badge ${event.type}`}>
                    {event.type.toUpperCase()}
                  </span>
                  <span className="event-time">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="event-body">
                  <div><strong>User:</strong> {event.userId}</div>
                  <div><strong>Tool:</strong> {event.tool}</div>
                  {event.reason && <div><strong>Reason:</strong> {event.reason}</div>}
                  {event.severity && (
                    <div><strong>Severity:</strong> 
                      <span className={`severity-${event.severity}`}> {event.severity.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}