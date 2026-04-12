import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Zap } from 'lucide-react';
import './CircuitBreakerPanel.css';

interface CircuitBreakerMetrics {
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  successCount: number;
  timeSincLastFailure: number | null;
  recentFailures: number;
}

export default function CircuitBreakerPanel() {
  const [metrics, setMetrics] = useState<CircuitBreakerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token');
      setLoading(false);
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    // Fetch initial state
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`${apiUrl}/health/circuit`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setMetrics(data.circuitBreaker);
        setError(null);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch circuit breaker metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load');
        setLoading(false);
      }
    };

    fetchMetrics();

    // Poll every 2 seconds
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'closed':
        return <CheckCircle className="state-icon closed" />;
      case 'open':
        return <AlertCircle className="state-icon open" />;
      case 'half_open':
        return <Zap className="state-icon half-open" />;
      default:
        return null;
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'closed':
        return '🟢 CLOSED';
      case 'open':
        return '🔴 OPEN';
      case 'half_open':
        return '⚡ HALF-OPEN';
      default:
        return 'UNKNOWN';
    }
  };

  const getStateDescription = (state: string) => {
    switch (state) {
      case 'closed':
        return 'Service healthy, requests flowing normally';
      case 'open':
        return 'Service failing, requests rejected to prevent cascading failure';
      case 'half_open':
        return 'Testing service recovery with limited requests';
      default:
        return '';
    }
  };

  if (loading) {
    return <div className="circuit-breaker-panel loading">Loading circuit breaker status...</div>;
  }

  if (error) {
    return <div className="circuit-breaker-panel error">Error: {error}</div>;
  }

  if (!metrics) {
    return <div className="circuit-breaker-panel">No circuit breaker data available</div>;
  }

  const timeSinceFailure = metrics.timeSincLastFailure 
    ? `${(metrics.timeSincLastFailure / 1000).toFixed(1)}s ago`
    : 'Never';

  return (
    <div className="circuit-breaker-panel">
      <h2>🔌 Circuit Breaker Status</h2>
      
      <div className="state-container">
        <div className="state-icon-wrapper">
          {getStateIcon(metrics.state)}
        </div>
        <div className="state-info">
          <div className={`state-label ${metrics.state}`}>
            {getStateLabel(metrics.state)}
          </div>
          <div className="state-description">
            {getStateDescription(metrics.state)}
          </div>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Failures</div>
          <div className="metric-value">{metrics.failureCount}</div>
          <div className="metric-detail">total recorded failures</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Recent Failures (60s)</div>
          <div className="metric-value">{metrics.recentFailures}</div>
          <div className="metric-detail">in last minute</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Successes in Recovery</div>
          <div className="metric-value">{metrics.successCount}</div>
          <div className="metric-detail">HALF-OPEN attempts</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Last Failure</div>
          <div className="metric-value">{timeSinceFailure}</div>
          <div className="metric-detail">time elapsed</div>
        </div>
      </div>

      <div className="status-legend">
        <div className="legend-item">
          <span className="legend-indicator closed">●</span>
          <span>CLOSED: Service healthy</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator open">●</span>
          <span>OPEN: Service unavailable</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator half-open">●</span>
          <span>HALF-OPEN: Testing recovery</span>
        </div>
      </div>
    </div>
  );
}
