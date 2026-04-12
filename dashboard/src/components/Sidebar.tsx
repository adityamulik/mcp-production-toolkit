import { useState } from 'react';
import { Server, Activity, BarChart3, LogOut, Menu, X, FileText, Zap, RefreshCw } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  activePage: 'health' | 'security' | 'metrics' | 'logs' | 'circuit-breaker' | 'retries';
  onPageChange: (page: 'health' | 'security' | 'metrics' | 'logs' | 'circuit-breaker' | 'retries') => void;
  username: string;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onPageChange, username, onLogout }) => {
  const [isOpen, setIsOpen] = useState(true);

  const menuItems = [
    { id: 'health', label: 'MCP Health', icon: Server, description: 'Team servers status' },
    { id: 'security', label: 'Security Events', icon: Activity, description: 'Real-time monitoring' },
    { id: 'metrics', label: 'Metrics', icon: BarChart3, description: 'Performance data' },
    { id: 'circuit-breaker', label: 'Circuit Breaker', icon: Zap, description: 'Resilience status' },
    { id: 'retries', label: 'Retries', icon: RefreshCw, description: 'Retry metrics by tool' },
    { id: 'logs', label: 'Request Logs', icon: FileText, description: 'Audit trail' }
  ];

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>🛡️ MCP</h2>
          <p>Production Gateway</p>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => {
                  onPageChange(item.id as 'health' | 'security' | 'metrics' | 'logs' | 'circuit-breaker' | 'retries');
                  window.innerWidth < 768 && setIsOpen(false);
                }}
              >
                <Icon size={20} />
                <div className="nav-label">
                  <span className="nav-title">{item.label}</span>
                  <span className="nav-desc">{item.description}</span>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{username.charAt(0).toUpperCase()}</div>
            <div className="user-details">
              <p className="user-name">{username}</p>
              <p className="user-role">Active</p>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
