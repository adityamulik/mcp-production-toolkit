import { useState, useEffect } from 'react';
import './Logs.css';

interface RequestLog {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  tool: string;
  team?: string;
  userId: string;
  status: number;
  duration: number;
  blocked: boolean;
  reason?: string;
  error?: string;
}

interface FilterOptions {
  showBlocked: boolean;
  showSuccess: boolean;
  tool?: string;
  user?: string;
  team?: string;
}

export const Logs: React.FC = () => {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    showBlocked: true,
    showSuccess: true,
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isLive, setIsLive] = useState(false);

  // Fetch initial logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/logs?limit=100');
        const data = await response.json();
        setLogs(data || []);
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      }
    };

    fetchLogs();
  }, []);

  // Subscribe to real-time logs via SSE
  useEffect(() => {
    if (!autoRefresh) return;

    const eventSource = new EventSource('/logs/stream');
    setIsLive(true);

    eventSource.onmessage = (event) => {
      try {
        const newLog: RequestLog = JSON.parse(event.data);
        setLogs((prevLogs) => [newLog, ...prevLogs.slice(0, 99)]);
      } catch (error) {
        console.error('Failed to parse log event:', error);
      }
    };

    eventSource.onerror = () => {
      console.error('SSE connection error');
      setIsLive(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setIsLive(false);
    };
  }, [autoRefresh]);

  const filteredLogs = logs.filter((log) => {
    if (log.blocked && !filters.showBlocked) return false;
    if (!log.blocked && !filters.showSuccess) return false;
    if (filters.tool && log.tool !== filters.tool) return false;
    if (filters.user && log.userId !== filters.user) return false;
    if (filters.team && log.team !== filters.team) return false;
    return true;
  });

  const getStatusBadgeClass = (status: number) => {
    if (status === 200) return 'status-success';
    if (status === 400) return 'status-bad-request';
    if (status === 403) return 'status-forbidden';
    if (status === 503) return 'status-unavailable';
    return 'status-error';
  };

  const getBlockedBadgeClass = (blocked: boolean) => {
    return blocked ? 'badge-blocked' : 'badge-allowed';
  };

  const uniqueTools = [...new Set(logs.map((log) => log.tool))];
  const uniqueUsers = [...new Set(logs.map((log) => log.userId))];
  const uniqueTeams = [...new Set(logs.map((log) => log.team).filter(Boolean))];

  return (
    <div className="logs-container">
      <div className="logs-header">
        <h1>Request Logs</h1>
        <div className="header-controls">
          <div className="live-status">
            <span className={`status-dot ${isLive ? 'active' : 'inactive'}`}></span>
            <span>{isLive ? 'Live' : 'Offline'}</span>
          </div>
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto Refresh
          </label>
        </div>
      </div>

      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filter-controls">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.showBlocked}
              onChange={(e) =>
                setFilters({ ...filters, showBlocked: e.target.checked })
              }
            />
            Show Blocked
          </label>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.showSuccess}
              onChange={(e) =>
                setFilters({ ...filters, showSuccess: e.target.checked })
              }
            />
            Show Success
          </label>
        </div>

        <div className="filter-dropdowns">
          <select
            className="filter-select"
            value={filters.tool || ''}
            onChange={(e) =>
              setFilters({ ...filters, tool: e.target.value || undefined })
            }
          >
            <option value="">All Tools</option>
            {uniqueTools.map((tool) => (
              <option key={tool} value={tool}>
                {tool}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filters.user || ''}
            onChange={(e) =>
              setFilters({ ...filters, user: e.target.value || undefined })
            }
          >
            <option value="">All Users</option>
            {uniqueUsers.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={filters.team || ''}
            onChange={(e) =>
              setFilters({ ...filters, team: e.target.value || undefined })
            }
          >
            <option value="">All Teams</option>
            {uniqueTeams.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="logs-stats">
        <div className="stat">
          <span className="stat-label">Total Logs</span>
          <span className="stat-value">{logs.length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Blocked</span>
          <span className="stat-value">{logs.filter((l) => l.blocked).length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Allowed</span>
          <span className="stat-value">{logs.filter((l) => !l.blocked).length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Avg Duration</span>
          <span className="stat-value">
            {logs.length > 0
              ? Math.round(logs.reduce((sum, l) => sum + l.duration, 0) / logs.length)
              : 0}
            ms
          </span>
        </div>
      </div>

      <div className="logs-table-wrapper">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Tool</th>
              <th>Team</th>
              <th>Method</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Result</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <tr key={log.id} className={log.blocked ? 'log-blocked' : 'log-allowed'}>
                  <td className="timestamp">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="user">{log.userId}</td>
                  <td className="tool">{log.tool}</td>
                  <td className="team">{log.team || '-'}</td>
                  <td className="method">{log.method}</td>
                  <td className="status">
                    <span className={`status-badge ${getStatusBadgeClass(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="duration">{log.duration}ms</td>
                  <td className="result">
                    <span
                      className={`badge ${getBlockedBadgeClass(log.blocked)}`}
                    >
                      {log.blocked ? 'BLOCKED' : 'ALLOWED'}
                    </span>
                  </td>
                  <td className="reason">
                    {log.reason || log.error || '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="no-logs">
                  No logs match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
