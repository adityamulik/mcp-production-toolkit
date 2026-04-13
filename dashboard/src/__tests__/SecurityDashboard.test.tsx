import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import SecurityDashboard from '../components/SecurityDashboard';

vi.mock('lucide-react', () => ({
  Shield: () => <span>ShieldIcon</span>,
  AlertTriangle: () => <span>AlertTriangleIcon</span>,
  CheckCircle: () => <span>CheckCircleIcon</span>,
  Activity: () => <span>ActivityIcon</span>,
}));

let mockEventSourceInstance: MockEventSource | null = null;

class MockEventSource {
  onmessage: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onopen: ((e: any) => void) | null = null;
  close = vi.fn();

  constructor(public url: string) {
    mockEventSourceInstance = this;
  }
}

describe('SecurityDashboard', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    vi.stubGlobal('EventSource', MockEventSource);
    mockEventSourceInstance = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders heading "Security Monitor"', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ blocked: 0, allowed: 0, anomalies: 0, total: 0 })
    });

    render(<SecurityDashboard />);
    expect(screen.getByText(/Security Monitor/)).toBeInTheDocument();
  });

  it('displays stats from fetched data', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ blocked: 5, allowed: 42, anomalies: 3, total: 50 })
    });

    render(<SecurityDashboard />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('Allowed')).toBeInTheDocument();
    expect(screen.getByText('Anomalies')).toBeInTheDocument();
    expect(screen.getByText('Total (5min)')).toBeInTheDocument();
  });

  it('renders event list from SSE initial events', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ blocked: 0, allowed: 0, anomalies: 0, total: 0 })
    });

    render(<SecurityDashboard />);

    await act(async () => {
      mockEventSourceInstance?.onmessage?.({
        data: JSON.stringify({
          type: 'initial',
          events: [
            { type: 'blocked', timestamp: Date.now(), userId: 'user1', tool: 'tool-a', reason: 'Policy violation' },
            { type: 'allowed', timestamp: Date.now(), userId: 'user2', tool: 'tool-b' },
          ]
        })
      });
    });

    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('user2')).toBeInTheDocument();
    expect(screen.getByText('tool-a')).toBeInTheDocument();
    expect(screen.getByText('tool-b')).toBeInTheDocument();
  });

  it('SSE events update the UI with new events', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ blocked: 1, allowed: 10, anomalies: 0, total: 11 })
    });

    render(<SecurityDashboard />);

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    await act(async () => {
      mockEventSourceInstance?.onmessage?.({
        data: JSON.stringify({
          type: 'blocked',
          timestamp: Date.now(),
          userId: 'attacker',
          tool: 'dangerous-tool',
          reason: 'Rate limit exceeded',
          severity: 'high'
        })
      });
    });

    expect(screen.getByText('attacker')).toBeInTheDocument();
    expect(screen.getByText('dangerous-tool')).toBeInTheDocument();
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    // Stats should update: blocked 1 -> 2, total 11 -> 12
    const statCards = document.querySelectorAll('.stat-card');
    const blockedCard = statCards[0];
    expect(blockedCard.querySelector('.stat-value')?.textContent).toBe('2');
    const totalCard = statCards[3];
    expect(totalCard.querySelector('.stat-value')?.textContent).toBe('12');
  });

  it('connects EventSource to /events endpoint', () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ blocked: 0, allowed: 0, anomalies: 0, total: 0 })
    });

    render(<SecurityDashboard />);
    expect(mockEventSourceInstance?.url).toContain('/events');
  });

  it('closes EventSource on unmount', () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ blocked: 0, allowed: 0, anomalies: 0, total: 0 })
    });

    const { unmount } = render(<SecurityDashboard />);
    const instance = mockEventSourceInstance;
    unmount();
    expect(instance?.close).toHaveBeenCalled();
  });

  it('renders Recent Events heading', () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ blocked: 0, allowed: 0, anomalies: 0, total: 0 })
    });

    render(<SecurityDashboard />);
    expect(screen.getByText('Recent Events')).toBeInTheDocument();
  });
});
