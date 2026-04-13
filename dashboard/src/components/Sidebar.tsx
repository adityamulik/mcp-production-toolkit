import { Server, BarChart3, FileText } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  activePage: 'health' | 'metrics' | 'logs';
  onPageChange: (page: 'health' | 'metrics' | 'logs') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onPageChange }) => {

  const mainMenuItems = [
    { id: 'health', label: 'Dashboard', icon: Server, description: 'Team servers status' },
    { id: 'metrics', label: 'Metrics', icon: BarChart3, description: 'Performance & security' },
    { id: 'logs', label: 'Activity', icon: FileText, description: 'Request audit trail' }
  ];

  return (
    <>
      <aside className="new-sidebar">
        <div className="sidebar-content">
          {/* Main Navigation */}
          <div className="sidebar-section">
            <nav className="sidebar-nav">
              {mainMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                    onClick={() => {
                      onPageChange(item.id as 'health' | 'metrics' | 'logs');
                    }}
                    title={item.label}
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
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
