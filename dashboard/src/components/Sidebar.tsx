import { useState } from 'react';
import { Server, BarChart3, Menu, X, FileText } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  activePage: 'health' | 'metrics' | 'logs';
  onPageChange: (page: 'health' | 'metrics' | 'logs') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onPageChange }) => {
  const [isOpen, setIsOpen] = useState(true);

  const mainMenuItems = [
    { id: 'health', label: 'Dashboard', icon: Server, description: 'Team servers status' },
    { id: 'metrics', label: 'Metrics', icon: BarChart3, description: 'Performance & security' },
    { id: 'logs', label: 'Activity', icon: FileText, description: 'Request audit trail' }
  ];

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`new-sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-content">
          {/* Main Navigation */}
          <div className="sidebar-section">
            <p className="sidebar-section-label">MENU</p>
            <nav className="sidebar-nav">
              {mainMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                    onClick={() => {
                      onPageChange(item.id as 'health' | 'metrics' | 'logs');
                      window.innerWidth < 768 && setIsOpen(false);
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
