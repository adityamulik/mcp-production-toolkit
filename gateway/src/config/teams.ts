/**
 * Team Server routing configuration
 * Maps tools to team servers based on team and tool category
 */

export interface TeamConfig {
  port: number;
  host: string;
  tools: string[];
}

export interface TeamsConfig {
  [teamId: string]: TeamConfig;
}

/**
 * Team Server Configuration
 * Each team operates its own MCP server on a dedicated port
 * Uses service names when running in Docker Compose, localhost for local development
 */
const getHostName = (): string => {
  // Use environment variable to determine if running in Docker
  const inDocker = process.env.IN_DOCKER === 'true';
  return inDocker ? 'team-a' : 'localhost'; // Will be overridden per team
};

export const TEAM_SERVERS: TeamsConfig = {
  // Team A - Analytics (port 8001)
  'A': {
    port: 8001,
    host: process.env.IN_DOCKER === 'true' ? 'team-a' : 'localhost',
    tools: ['generate_report']
  },
  // Team B - DevOps (port 8002)
  'B': {
    port: 8002,
    host: process.env.IN_DOCKER === 'true' ? 'team-b' : 'localhost',
    tools: ['deploy_application', 'restart_service', 'update_configuration']
  },
  // Team C - Developer (port 8003)
  'C': {
    port: 8003,
    host: process.env.IN_DOCKER === 'true' ? 'team-c' : 'localhost',
    tools: ['read_file', 'query_database']
  }
};

/**
 * Determine which team handles a given tool
 * @param tool - Tool name
 * @returns Team ID (A, B, C) or null if tool not found
 */
export function getTeamForTool(tool: string): string | null {
  for (const [team, config] of Object.entries(TEAM_SERVERS)) {
    if (config.tools.includes(tool)) {
      return team;
    }
  }
  return null;
}

/**
 * Get the MCP server URL for a team
 * @param team - Team ID
 * @returns Full URL to team's MCP server
 * @throws Error if team not found
 */
export function getMCPServerUrl(team: string): string {
  const config = TEAM_SERVERS[team as keyof typeof TEAM_SERVERS];
  if (!config) throw new Error(`Unknown team: ${team}`);
  return `http://${config.host}:${config.port}`;
}

/**
 * Get all tools grouped by team for API responses
 * @returns Array of teams with their configurations and tools
 */
export function getAllTeams() {
  return Object.entries(TEAM_SERVERS).map(([teamId, config]) => ({
    id: teamId,
    tools: config.tools,
    port: config.port,
    host: config.host,
    url: `http://${config.host}:${config.port}`
  }));
}

/**
 * Get team configuration by tool
 * @param tool - Tool name
 * @returns Team configuration including URL and port
 */
export function getTeamConfigForTool(tool: string) {
  const team = getTeamForTool(tool);
  if (!team) return null;
  
  const config = TEAM_SERVERS[team as keyof typeof TEAM_SERVERS];
  return {
    tool,
    team,
    url: `http://${config.host}:${config.port}`,
    port: config.port
  };
}
