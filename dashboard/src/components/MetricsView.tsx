import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './MetricsView.css';

interface MetricPoint {
  time: string;
  requests: number;
  blocked: number;
  anomalies: number;
}

export default function MetricsView() {
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('📊 Metrics: No token available');
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    console.log('📊 Metrics: Starting polling to', apiUrl);
    const interval = setInterval(async () => {
      try {
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
    }, 5000); // Update every 5 seconds

    return () => {
      console.log('📊 Metrics: Stopping polling');
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="metrics-view">
      <h2>📊 Request Metrics</h2>

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
    </div>
  );
}