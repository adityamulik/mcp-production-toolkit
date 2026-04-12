import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import './SecurityDashboard.css';

interface SecurityEvent {
  type: 'blocked' | 'allowed' | 'anomaly';
  timestamp: number;
  userId: string;
  tool: string;
  reason?: string;
  severity?: string;
  details?: any;
}

interface Stats {
  blocked: number;
  allowed: number;
  anomalies: number;
  total: number;
}

export default function SecurityDashboard() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<Stats>({ blocked: 0, allowed: 0, anomalies: 0, total: 0 });

  useEffect(() => {
    // Fetch initial stats
    fetch('http://localhost:3000/stats')
      .then(res => res.json())
      .then(setStats);

    // Connect to SSE for real-time events
    const eventSource = new EventSource('http://localhost:3000/events');

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === 'initial') {
        setEvents(data.events);
      } else {
        setEvents(prev => [data, ...prev].slice(0, 50)); // Keep last 50

        // Update stats
        setStats(prev => ({
          ...prev,
          [data.type]: prev[data.type as keyof Stats] + 1,
          total: prev.total + 1
        }));
      }
    };

    return () => eventSource.close();
  }, []);

  return (
    <div className="security-dashboard">
      <h2>🔒 Security Monitor</h2>

      <div className="stats-grid">
        <div className="stat-card blocked">
          <Shield size={32} />
          <div>
            <div className="stat-value">{stats.blocked}</div>
            <div className="stat-label">Blocked</div>
          </div>
        </div>

        <div className="stat-card allowed">
          <CheckCircle size={32} />
          <div>
            <div className="stat-value">{stats.allowed}</div>
            <div className="stat-label">Allowed</div>
          </div>
        </div>

        <div className="stat-card anomaly">
          <AlertTriangle size={32} />
          <div>
            <div className="stat-value">{stats.anomalies}</div>
            <div className="stat-label">Anomalies</div>
          </div>
        </div>

        <div className="stat-card total">
          <Activity size={32} />
          <div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total (5min)</div>
          </div>
        </div>
      </div>

      <h3>Recent Events</h3>
      <div className="events-list">
        {events.map((event, idx) => (
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
        ))}
      </div>
    </div>
  );
}