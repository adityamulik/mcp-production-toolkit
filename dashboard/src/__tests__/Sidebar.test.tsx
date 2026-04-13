import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../components/Sidebar';

vi.mock('lucide-react', () => ({
  Server: () => <span>ServerIcon</span>,
  Activity: () => <span>ActivityIcon</span>,
  BarChart3: () => <span>BarChart3Icon</span>,
  LogOut: () => <span>LogOutIcon</span>,
  Menu: () => <span>MenuIcon</span>,
  X: () => <span>XIcon</span>,
  FileText: () => <span>FileTextIcon</span>,
}));

describe('Sidebar', () => {
  const defaultProps = {
    activePage: 'health' as const,
    onPageChange: vi.fn(),
    username: 'testuser',
    onLogout: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all 4 menu items', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('MCP Health')).toBeInTheDocument();
    expect(screen.getByText('Security Events')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('Request Logs')).toBeInTheDocument();
  });

  it('active page has active class', () => {
    render(<Sidebar {...defaultProps} activePage="security" />);
    const securityBtn = screen.getByText('Security Events').closest('button');
    expect(securityBtn).toHaveClass('active');

    const healthBtn = screen.getByText('MCP Health').closest('button');
    expect(healthBtn).not.toHaveClass('active');
  });

  it('clicking menu item calls onPageChange', async () => {
    render(<Sidebar {...defaultProps} />);
    const user = userEvent.setup();

    await user.click(screen.getByText('Security Events').closest('button')!);
    expect(defaultProps.onPageChange).toHaveBeenCalledWith('security');

    await user.click(screen.getByText('Metrics').closest('button')!);
    expect(defaultProps.onPageChange).toHaveBeenCalledWith('metrics');

    await user.click(screen.getByText('Request Logs').closest('button')!);
    expect(defaultProps.onPageChange).toHaveBeenCalledWith('logs');
  });

  it('toggle button toggles sidebar open/close', async () => {
    render(<Sidebar {...defaultProps} />);
    const user = userEvent.setup();

    // Sidebar starts open
    const aside = screen.getByRole('complementary');
    expect(aside).toHaveClass('open');

    // Click toggle to close
    const toggleBtn = screen.getByText('XIcon').closest('button')!;
    await user.click(toggleBtn);
    expect(aside).toHaveClass('closed');

    // Click toggle to re-open
    const menuBtn = screen.getByText('MenuIcon').closest('button')!;
    await user.click(menuBtn);
    expect(aside).toHaveClass('open');
  });

  it('shows username', () => {
    render(<Sidebar {...defaultProps} username="alice" />);
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('user avatar shows first letter capitalized', () => {
    render(<Sidebar {...defaultProps} username="alice" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('logout button calls onLogout', async () => {
    render(<Sidebar {...defaultProps} />);
    const user = userEvent.setup();

    const logoutBtn = screen.getByTitle('Logout');
    await user.click(logoutBtn);
    expect(defaultProps.onLogout).toHaveBeenCalled();
  });

  it('shows descriptions for menu items', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Team servers status')).toBeInTheDocument();
    expect(screen.getByText('Real-time monitoring')).toBeInTheDocument();
    expect(screen.getByText('Performance data')).toBeInTheDocument();
    expect(screen.getByText('Audit trail')).toBeInTheDocument();
  });
});
