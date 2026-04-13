import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import HealthDiscovery from './components/HealthDiscovery';
import MetricsView from './components/MetricsView';
import { Logs } from './components/Logs';
import './App.css';

type PageType = 'health' | 'metrics' | 'logs';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [password, setPassword] = useState('');
  const [currentPage, setCurrentPage] = useState<PageType>(getPageFromUrl());

  // Get page from URL path
  function getPageFromUrl(): PageType {
    const path = window.location.pathname;
    if (path.includes('/metrics')) return 'metrics';
    if (path.includes('/activity')) return 'logs';
    return 'health';
  }

  // Update page and URL together
  const handlePageChange = (page: PageType) => {
    setCurrentPage(page);
    const pathMap: Record<PageType, string> = {
      health: '/',
      metrics: '/metrics',
      logs: '/activity'
    };
    window.history.pushState({}, '', pathMap[page]);
  };

  // Listen for back/forward button navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getPageFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      <div className="App">
        <Header 
          username=""
          onLogout={logout}
        />
        <div className="login-container">
          <div className="login-box">
            <h1>MCP Production KIT Demo</h1>
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  const storedUsername = localStorage.getItem('username') || username;

  return (
    <div className="App">
      <Header 
        username={storedUsername}
        onLogout={logout}
      />
      
      <Sidebar 
        activePage={currentPage}
        onPageChange={handlePageChange}
      />

      <main className="main-content">
        {currentPage === 'health' && <HealthDiscovery />}
        {currentPage === 'metrics' && <MetricsView />}
        {currentPage === 'logs' && <Logs />}
      </main>
    </div>
  );
}

export default App;