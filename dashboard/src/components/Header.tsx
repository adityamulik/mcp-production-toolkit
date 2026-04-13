import { LogOut } from 'lucide-react';
import './Header.css';

interface HeaderProps {
  username: string;
  onLogout: () => void;
}

export default function Header({ username, onLogout }: HeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="header-left">
        <div className="logo-section">
          <div className="logo">ℹ</div>
          <h1 className="app-title">MCP Production KIT Demo</h1>
        </div>
      </div>

      <div className="header-right">
        {username && (
          <button 
            className="profile-section"
            onClick={onLogout}
            title="Logout"
          >
            <div className="profile-avatar">{username.charAt(0).toUpperCase()}</div>
            <div className="profile-info">
              <p className="profile-name">{username}</p>
              <p className="profile-status">Active</p>
            </div>
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
