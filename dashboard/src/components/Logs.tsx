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
  const [currentPage, setCurrentPage] = useState(1);
  const LOGS_PER_PAGE = 50;

  // Fetch initial logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('📋 Logs: Fetching with token:', token ? '✓ available' : '✗ missing');
        if (!token) {
          console.warn('📋 Logs: No token in localStorage');
          return;
        }
        
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/logs?limit=5000`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          console.error('📋 Logs: Failed to fetch -', response.status, response.statusText);
          return;
        }
        
        const data = await response.json();
        console.log('📋 Logs: Fetched', data.logs?.length || 0, 'logs');
        const blockedCount = (data.logs || []).filter((l: RequestLog) => l.blocked).length;
        console.log('📋 Logs: Initial blocked count:', blockedCount);
        setLogs(data.logs || []);
      } catch (error) {
        console.error('📋 Logs: Fetch error:', error);
      }
    };

    fetchLogs();
  }, [autoRefresh]); // Refetch when autoRefresh toggles

  // Subscribe to real-time logs via SSE
  useEffect(() => {
    if (!autoRefresh) {
      console.log('📋 Logs SSE: Auto-refresh disabled, not connecting');
      setIsLive(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('📋 Logs SSE: No token available, cannot connect');
      setIsLive(false);
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    console.log('📋 Logs SSE: Connecting with token to', apiUrl);
    const eventSource = new EventSource(apiUrl + '/logs/stream?token=' + encodeURIComponent(token));
    setIsLive(true);

    eventSource.onopen = () => {
      console.log('📋 Logs SSE: Connected ✓');
    };

    eventSource.onmessage = (event) => {
      try {
        const newLog: RequestLog = JSON.parse(event.data);
        console.log('📋 Logs SSE: New log received:', newLog.tool, '| Status:', newLog.status, '| Blocked:', newLog.blocked);
        // Keep up to 5000 logs in dashboard state (matching backend buffer)
        setLogs((prevLogs) => {
          const updated = [newLog, ...prevLogs.slice(0, 4999)];
          const blockedInState = updated.filter(l => l.blocked).length;
          console.log(`📋 Logs SSE: Now in state: ${updated.length} total, ${blockedInState} blocked`);
          return updated;
        });
      } catch (error) {
        console.error('Failed to parse log event:', error);
      }
    };

    eventSource.onerror = (err) => {
      console.error('📋 Logs SSE: Connection error', err);
      console.error('📋 Logs SSE: ReadyState:', eventSource.readyState);
      setIsLive(false);
      eventSource.close();
    };

    return () => {
      console.log('📋 Logs SSE: Disconnecting');
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);
  const startIndex = (currentPage - 1) * LOGS_PER_PAGE;
  const endIndex = startIndex + LOGS_PER_PAGE;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

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

  const getTeamName = (teamId?: string): string => {
    const teamNames: Record<string, string> = {
      'A': 'analyst',
      'B': 'devops',
      'C': 'developer'
    };
    return teamNames[teamId || ''] || teamId || '-';
  };

  const uniqueTools = [...new Set(logs.map((log) => log.tool))];
  const uniqueUsers = [...new Set(logs.map((log) => log.userId))];
  const uniqueTeams = [...new Set(logs.map((log) => log.team).filter(Boolean))];

  return (
    <div className="logs-container">
      <div className="logs-header">
        <h2>📋 Activity Logs</h2>
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

      {/* Summary Stats */}
      <div className="logs-stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{logs.length}</div>
            <div className="stat-label">Total Logs</div>
          </div>
        </div>
        <div className="stat-card blocked">
          <div className="stat-icon">🚫</div>
          <div className="stat-content">
            <div className="stat-value">{logs.filter((l) => l.blocked).length}</div>
            <div className="stat-label">Blocked</div>
          </div>
        </div>
        <div className="stat-card allowed">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <div className="stat-value">{logs.filter((l) => !l.blocked).length}</div>
            <div className="stat-label">Allowed</div>
          </div>
        </div>
        <div className="stat-card duration">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-value">
              {logs.length > 0
                ? Math.round(logs.reduce((sum, l) => sum + l.duration, 0) / logs.length)
                : 0}
              <span className="stat-unit">ms</span>
            </div>
            <div className="stat-label">Avg Duration</div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="filters-card">
        <div className="filters-header">
          <h3>Filters</h3>
        </div>
        
        <div className="filters-content">
          {/* Status Toggle Filters */}
          <div className="filter-group">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={filters.showBlocked}
                onChange={(e) =>
                  setFilters({ ...filters, showBlocked: e.target.checked })
                }
              />
              <span className="checkbox-text">Show Blocked</span>
            </label>
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={filters.showSuccess}
                onChange={(e) =>
                  setFilters({ ...filters, showSuccess: e.target.checked })
                }
              />
              <span className="checkbox-text">Show Success</span>
            </label>
          </div>

          {/* Dropdown Filters */}
          <div className="filter-group dropdown-group">
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
                  {getTeamName(team)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="logs-card">
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
            {paginatedLogs.length > 0 ? (
              paginatedLogs.map((log) => (
                <tr key={log.id} className={log.blocked ? 'log-blocked' : 'log-allowed'}>
                  <td className="timestamp">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="user">{log.userId}</td>
                  <td className="tool">{log.tool}</td>
                  <td className="team">{getTeamName(log.team)}</td>
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
                  {filteredLogs.length === 0 ? 'No logs match the current filters' : 'Loading...'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filteredLogs.length > 0 && (
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          <div className="pagination-info">
            Page {currentPage} of {totalPages} ({filteredLogs.length} total logs)
          </div>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}
        </div>
    </div>
  );
};
