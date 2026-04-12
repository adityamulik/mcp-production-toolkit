import { useState } from 'react';
import Sidebar from './components/Sidebar';
import HealthDiscovery from './components/HealthDiscovery';
import SecurityDashboard from './components/SecurityDashboard';
import MetricsView from './components/MetricsView';
import { Logs } from './components/Logs';
import './App.css';

type PageType = 'health' | 'security' | 'metrics' | 'logs';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [password, setPassword] = useState('');
  const [currentPage, setCurrentPage] = useState<PageType>('health');

  const login = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log('🔐 Login: Using API URL:', apiUrl);
      const response = await fetch(`${apiUrl}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password })
      });

      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('username', username);
        setToken(data.access_token);
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername('developer');
  };

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>🛡️ MCP Gateway</h1>
          <p className="login-subtitle">Production Toolkit</p>
          <div className="login-form">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && login()}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && login()}
            />
            <button onClick={login}>Login</button>
            <div className="login-help">
              <p>Available test users:</p>
              <ul>
                <li>Use credentials from <code>.env.local</code></li>
                <li>Roles: <code>developer</code>, <code>admin</code>, <code>analyst</code>, <code>deployer</code></li>
                <li>See CREDENTIALS.md for setup</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const storedUsername = localStorage.getItem('username') || username;

  return (
    <div className="App">
      <header>
        <h1>🛡️ MCP Gateway</h1>
      </header>
      
      <Sidebar 
        activePage={currentPage}
        onPageChange={setCurrentPage}
        username={storedUsername}
        onLogout={logout}
      />

      <main className="main-content">
        {currentPage === 'health' && <HealthDiscovery />}
        {currentPage === 'security' && <SecurityDashboard />}
        {currentPage === 'metrics' && <MetricsView />}
        {currentPage === 'logs' && <Logs />}
      </main>
    </div>
  );
}

export default App;