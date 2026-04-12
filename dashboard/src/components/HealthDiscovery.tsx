import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react';
import './HealthDiscovery.css';

interface TeamHealth {
  id: string;
  name: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'loading';
  tools: string[];
  error?: string;
}

interface MCPServer {
  team: string;
  tools: Array<{ name: string; description: string }>;
}

const HealthDiscovery: React.FC = () => {
  const [teams, setTeams] = useState<TeamHealth[]>([
    { id: 'A', name: 'Team A - Analytics', port: 8001, status: 'loading', tools: [] },
    { id: 'B', name: 'Team B - DevOps', port: 8002, status: 'loading', tools: [] },
    { id: 'C', name: 'Team C - Developer', port: 8003, status: 'loading', tools: [] }
  ]);
  const [allTools, setAllTools] = useState<MCPServer[]>([]);

  const checkHealth = async (team: TeamHealth) => {
    try {
      const response = await fetch(`http://localhost:${team.port}/health`, {
        mode: 'cors',
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      
      // Fetch tools for this team
      const toolsResponse = await fetch(`http://localhost:${team.port}/api/tools`, {
        mode: 'cors',
        signal: AbortSignal.timeout(5000)
      });

      let tools: string[] = [];
      if (toolsResponse.ok) {
        const toolsData = await toolsResponse.json();
        tools = toolsData.result?.tools?.map((t: any) => t.name) || data.tools || [];
      }

      setTeams(prev => prev.map(t => 
        t.id === team.id 
          ? { ...t, status: 'healthy', tools, error: undefined }
          : t
      ));
    } catch (error: any) {
      const errorMsg = error.name === 'AbortError' ? 'Timeout' : error.message;
      setTeams(prev => prev.map(t => 
        t.id === team.id 
          ? { ...t, status: 'unhealthy', error: errorMsg }
          : t
      ));
    }
  };

  const discoverTools = async () => {
    try {
      const response = await fetch('http://localhost:3000/teams', {
        mode: 'cors'
      });

      if (response.ok) {
        const data = await response.json();
        const teamTools: MCPServer[] = await Promise.all(
          data.teams.map(async (team: any) => {
            try {
              const toolsRes = await fetch(`http://localhost:${team.port}/api/tools`, {
                mode: 'cors',
                signal: AbortSignal.timeout(5000)
              });
              
              if (toolsRes.ok) {
                const toolsData = await toolsRes.json();
                return {
                  team: team.id,
                  tools: toolsData.result?.tools || []
                };
              }
            } catch (e) {
              // Silently fail
            }
            return { team: team.id, tools: [] };
          })
        );
        setAllTools(teamTools);
      }
    } catch (error) {
      console.error('Discovery error:', error);
    }
  };

  useEffect(() => {
    // Check health of all teams
    teams.forEach(team => checkHealth(team));

    // Discover available tools
    discoverTools();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      teams.forEach(team => checkHealth(team));
      discoverTools();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const healthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="icon-healthy" />;
      case 'unhealthy':
        return <XCircle className="icon-unhealthy" />;
      default:
        return <Loader className="icon-loading" />;
    }
  };

  const healthyCount = teams.filter(t => t.status === 'healthy').length;

  return (
    <div className="health-discovery">
      <div className="health-header">
        <h2>🏥 MCP Health & Discovery</h2>
        <div className="health-summary">
          {healthyCount}/{teams.length} servers healthy
        </div>
      </div>

      <div className="health-grid">
        {teams.map(team => (
          <div key={team.id} className={`health-card status-${team.status}`}>
            <div className="health-card-header">
              {healthIcon(team.status)}
              <h3>{team.name}</h3>
            </div>

            <div className="health-details">
              <div className="detail-row">
                <span className="label">Port:</span>
                <span className="value">{team.port}</span>
              </div>
              <div className="detail-row">
                <span className="label">Status:</span>
                <span className={`value status-${team.status}`}>
                  {team.status === 'loading' ? 'Checking...' : team.status}
                </span>
              </div>
              {team.error && (
                <div className="detail-row error">
                  <span className="label">Error:</span>
                  <span className="value">{team.error}</span>
                </div>
              )}
            </div>

            {team.tools.length > 0 && (
              <div className="tools-list">
                <h4>Tools ({team.tools.length})</h4>
                <ul>
                  {team.tools.map(tool => (
                    <li key={tool}>
                      <code>{tool}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {allTools.length > 0 && (
        <div className="discovery-section">
          <h3>📚 Available Tools by Team</h3>
          <div className="tools-summary">
            {allTools.map(item => (
              <div key={item.team} className="team-tools">
                <h4>Team {item.team}</h4>
                <div className="tools-list-compact">
                  {item.tools.map((tool: any) => (
                    <div key={tool.name} className="tool-item">
                      <code>{tool.name}</code>
                      <p>{tool.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="discovery-info">
        <AlertCircle size={16} />
        <span>Health checks run every 30 seconds</span>
      </div>
    </div>
  );
};

export default HealthDiscovery;
