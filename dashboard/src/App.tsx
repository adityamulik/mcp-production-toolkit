import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import HealthDiscovery from './components/HealthDiscovery';
import SecurityDashboard from './components/SecurityDashboard';
import MetricsView from './components/MetricsView';
import './App.css';

type PageType = 'health' | 'security' | 'metrics';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState('developer');
  const [password, setPassword] = useState('dev123');
  const [currentPage, setCurrentPage] = useState<PageType>('health');

  const login = async () => {
    try {
      const response = await fetch('http://localhost:3000/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
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
              <p>Demo Credentials:</p>
              <ul>
                <li><code>developer</code> / <code>dev123</code></li>
                <li><code>admin</code> / <code>admin123</code></li>
                <li><code>analyst</code> / <code>analyst123</code></li>
                <li><code>deployer</code> / <code>deploy123</code></li>
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
        <h1>🛡️ MCP Production Gateway</h1>
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
      </main>
    </div>
  );
}

export default App;