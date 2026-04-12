import React, { useEffect, useState } from 'react';
import SecurityDashboard from './components/SecurityDashboard';
import MetricsView from './components/MetricsView';
import './App.css';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [email, setEmail] = useState('developer@company.com');
  const [password, setPassword] = useState('dev123');

  const login = async () => {
    const response = await fetch('http://localhost:3000/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  if (token) {
    return (
      <div className="login-container">
        <h1>🛡️ MCP Gateway</h1>
        <div className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={login}>Login</button>
          <p style={{ fontSize: '12px', marginTop: '10px' }}>
            Demo credentials: developer@company.com / dev123
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header>
        <h1>🛡️ MCP Production Gateway</h1>
        <button onClick={logout}>Logout</button>
      </header>
      <div className="dashboard-grid">
        <SecurityDashboard />
        <MetricsView />
      </div>
    </div>
  );
}

export default App;