import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

vi.mock('../components/Sidebar', () => ({
  default: ({ activePage, onPageChange, username, onLogout }: any) => (
    <div data-testid="sidebar">
      <span data-testid="active-page">{activePage}</span>
      <span data-testid="username">{username}</span>
      <button data-testid="logout-btn" onClick={onLogout}>Logout</button>
      <button data-testid="nav-health" onClick={() => onPageChange('health')}>Health</button>
      <button data-testid="nav-security" onClick={() => onPageChange('security')}>Security</button>
      <button data-testid="nav-metrics" onClick={() => onPageChange('metrics')}>Metrics</button>
      <button data-testid="nav-logs" onClick={() => onPageChange('logs')}>Logs</button>
    </div>
  )
}));

vi.mock('../components/HealthDiscovery', () => ({
  default: () => <div data-testid="health-discovery">HealthDiscovery</div>
}));

vi.mock('../components/SecurityDashboard', () => ({
  default: () => <div data-testid="security-dashboard">SecurityDashboard</div>
}));

vi.mock('../components/MetricsView', () => ({
  default: () => <div data-testid="metrics-view">MetricsView</div>
}));

vi.mock('../components/Logs', () => ({
  Logs: () => <div data-testid="logs">Logs</div>
}));

describe('App', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders login form when no token in localStorage', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('shows username and password inputs', () => {
    render(<App />);
    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    expect(usernameInput).toHaveAttribute('type', 'text');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('login button triggers fetch to /auth/token', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ access_token: 'test-token-123' })
    });

    render(<App />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Username'), 'admin');
    await user.type(screen.getByPlaceholderText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/token'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin', password: 'secret' })
        })
      );
    });
  });

  it('successful login stores token and shows dashboard', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ access_token: 'test-token-123' })
    });

    render(<App />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Username'), 'admin');
    await user.type(screen.getByPlaceholderText('Password'), 'secret');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });
    expect(localStorage.getItem('token')).toBe('test-token-123');
  });

  it('failed login shows alert', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ error: 'Invalid credentials' })
    });

    render(<App />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Username'), 'bad');
    await user.type(screen.getByPlaceholderText('Password'), 'bad');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Invalid credentials');
    });
  });

  it('shows alert on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText('Username'), 'admin');
    await user.type(screen.getByPlaceholderText('Password'), 'pass');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Login failed');
    });
  });

  it('renders sidebar and header when token exists', () => {
    localStorage.setItem('token', 'existing-token');
    localStorage.setItem('username', 'testuser');
    render(<App />);

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByText('🛡️ MCP Gateway')).toBeInTheDocument();
    expect(screen.getByTestId('username')).toHaveTextContent('testuser');
  });

  it('logout clears localStorage and shows login form', async () => {
    localStorage.setItem('token', 'existing-token');
    localStorage.setItem('username', 'testuser');
    render(<App />);

    const user = userEvent.setup();
    await user.click(screen.getByTestId('logout-btn'));

    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
  });

  it('page navigation works', async () => {
    localStorage.setItem('token', 'existing-token');
    localStorage.setItem('username', 'testuser');
    render(<App />);

    expect(screen.getByTestId('health-discovery')).toBeInTheDocument();

    const user = userEvent.setup();

    await user.click(screen.getByTestId('nav-security'));
    expect(screen.getByTestId('security-dashboard')).toBeInTheDocument();

    await user.click(screen.getByTestId('nav-metrics'));
    expect(screen.getByTestId('metrics-view')).toBeInTheDocument();

    await user.click(screen.getByTestId('nav-logs'));
    expect(screen.getByTestId('logs')).toBeInTheDocument();

    await user.click(screen.getByTestId('nav-health'));
    expect(screen.getByTestId('health-discovery')).toBeInTheDocument();
  });

  it('defaults to health page', () => {
    localStorage.setItem('token', 'existing-token');
    render(<App />);
    expect(screen.getByTestId('active-page')).toHaveTextContent('health');
  });
});
