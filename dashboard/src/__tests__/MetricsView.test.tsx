import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import MetricsView from '../components/MetricsView';

vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

describe('MetricsView', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders heading "Request Metrics"', () => {
    render(<MetricsView />);
    expect(screen.getByText(/Request Metrics/)).toBeInTheDocument();
  });

  it('renders the chart container', () => {
    render(<MetricsView />);
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('does not start polling without token', async () => {
    render(<MetricsView />);

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('with token, fetches stats on interval', async () => {
    localStorage.setItem('token', 'test-token');

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ total: 10, blocked: 2, anomalies: 1 })
    });

    render(<MetricsView />);

    // First interval fires at 5s
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/stats'),
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer test-token' }
        })
      );
    });

    // Second interval fires at 10s
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('displays summary data after fetch', async () => {
    localStorage.setItem('token', 'test-token');

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ total: 25, blocked: 5, anomalies: 3 })
    });

    render(<MetricsView />);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.getByText('Last 5 Minutes Summary')).toBeInTheDocument();
    });

    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('cleans up interval on unmount', async () => {
    localStorage.setItem('token', 'test-token');

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ total: 0, blocked: 0, anomalies: 0 })
    });

    const { unmount } = render(<MetricsView />);
    unmount();

    mockFetch.mockClear();

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
