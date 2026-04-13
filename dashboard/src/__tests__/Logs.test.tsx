import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Logs } from '../components/Logs';

let mockEventSourceInstance: MockEventSource | null = null;

class MockEventSource {
  onmessage: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onopen: ((e: any) => void) | null = null;
  readyState = 1;
  close = vi.fn();

  constructor(public url: string) {
    mockEventSourceInstance = this;
  }
}

const sampleLogs = [
  {
    id: 'log-1',
    timestamp: 1700000000000,
    method: 'POST',
    path: '/mcp',
    tool: 'query_db',
    team: 'team-a',
    userId: 'alice',
    status: 200,
    duration: 120,
    blocked: false,
  },
  {
    id: 'log-2',
    timestamp: 1700000001000,
    method: 'POST',
    path: '/mcp',
    tool: 'deploy',
    team: 'team-b',
    userId: 'bob',
    status: 403,
    duration: 50,
    blocked: true,
    reason: 'Insufficient permissions',
  },
  {
    id: 'log-3',
    timestamp: 1700000002000,
    method: 'POST',
    path: '/mcp',
    tool: 'query_db',
    team: 'team-a',
    userId: 'charlie',
    status: 200,
    duration: 80,
    blocked: false,
  },
];

describe('Logs', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    vi.stubGlobal('EventSource', MockEventSource);
    mockEventSourceInstance = null;

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ logs: sampleLogs })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders heading "Request Logs"', async () => {
    render(<Logs />);
    expect(screen.getByText('Request Logs')).toBeInTheDocument();
  });

  it('fetches logs on mount with auth header', async () => {
    render(<Logs />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/logs?limit=100'),
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer test-token' }
        })
      );
    });
  });

  it('displays logs in table format', async () => {
    render(<Logs />);

    await waitFor(() => {
      // Users appear in both table cells and filter dropdowns, so use getAllByText
      expect(screen.getAllByText('alice').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText('bob').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('charlie').length).toBeGreaterThanOrEqual(1);
    // Tools appear in both table cells and filter dropdowns
    expect(screen.getAllByText('query_db').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('deploy').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Insufficient permissions')).toBeInTheDocument();
  });

  it('shows table column headers', async () => {
    render(<Logs />);

    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Tool')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Method')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();
    expect(screen.getByText('Reason')).toBeInTheDocument();
  });

  it('filter checkboxes toggle visibility - hide blocked', async () => {
    render(<Logs />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getAllByText('bob').length).toBeGreaterThanOrEqual(1);
    });

    // Uncheck "Show Blocked"
    const showBlockedCheckbox = screen.getByLabelText('Show Blocked');
    await user.click(showBlockedCheckbox);

    // bob's log is blocked, should be hidden from table but still in filter dropdown
    const table = document.querySelector('.logs-table tbody')!;
    expect(table.textContent).not.toContain('bob');
    // alice and charlie should still be in the table
    expect(table.textContent).toContain('alice');
    expect(table.textContent).toContain('charlie');
  });

  it('filter checkboxes toggle visibility - hide success', async () => {
    render(<Logs />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getAllByText('alice').length).toBeGreaterThanOrEqual(1);
    });

    // Uncheck "Show Success"
    const showSuccessCheckbox = screen.getByLabelText('Show Success');
    await user.click(showSuccessCheckbox);

    // alice and charlie are not blocked (success), should be hidden from table
    const table = document.querySelector('.logs-table tbody')!;
    expect(table.textContent).not.toContain('alice');
    expect(table.textContent).not.toContain('charlie');
    // bob's blocked log should still show in table
    expect(table.textContent).toContain('bob');
  });

  it('shows "No logs match" when filters exclude all', async () => {
    render(<Logs />);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getAllByText('alice').length).toBeGreaterThanOrEqual(1);
    });

    // Uncheck both filters
    await user.click(screen.getByLabelText('Show Blocked'));
    await user.click(screen.getByLabelText('Show Success'));

    expect(screen.getByText('No logs match the current filters')).toBeInTheDocument();
  });

  it('stats display correct values', async () => {
    render(<Logs />);

    await waitFor(() => {
      expect(screen.getAllByText('alice').length).toBeGreaterThanOrEqual(1);
    });

    // Total: 3, Blocked: 1, Allowed: 2, Avg Duration: (120+50+80)/3 ≈ 83ms
    const statsSection = document.querySelector('.logs-stats')!;
    const statValues = statsSection.querySelectorAll('.stat-value');
    expect(statValues[0].textContent).toBe('3');  // Total Logs
    expect(statValues[1].textContent).toBe('1');  // Blocked
    expect(statValues[2].textContent).toBe('2');  // Allowed
    expect(statValues[3].textContent).toBe('83ms'); // Avg Duration
  });

  it('auto refresh toggle works', async () => {
    render(<Logs />);
    const user = userEvent.setup();

    const autoRefreshCheckbox = screen.getByLabelText('Auto Refresh');
    expect(autoRefreshCheckbox).toBeChecked();

    await user.click(autoRefreshCheckbox);
    expect(autoRefreshCheckbox).not.toBeChecked();
  });

  it('does not fetch logs without token', async () => {
    localStorage.clear();
    mockFetch.mockClear();

    render(<Logs />);

    // Give it time to potentially fetch
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows BLOCKED and ALLOWED badges', async () => {
    render(<Logs />);

    await waitFor(() => {
      expect(screen.getAllByText('alice').length).toBeGreaterThanOrEqual(1);
    });

    const blockedBadges = screen.getAllByText('BLOCKED');
    const allowedBadges = screen.getAllByText('ALLOWED');
    expect(blockedBadges.length).toBe(1);
    expect(allowedBadges.length).toBe(2);
  });

  it('displays duration in ms', async () => {
    render(<Logs />);

    await waitFor(() => {
      expect(screen.getByText('120ms')).toBeInTheDocument();
    });

    expect(screen.getByText('50ms')).toBeInTheDocument();
    expect(screen.getByText('80ms')).toBeInTheDocument();
  });

  it('connects to SSE for real-time logs', async () => {
    render(<Logs />);

    await waitFor(() => {
      expect(mockEventSourceInstance).not.toBeNull();
    });

    expect(mockEventSourceInstance?.url).toContain('/logs/stream');
  });
});
