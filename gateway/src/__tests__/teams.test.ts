import { describe, it, expect } from 'vitest';
import {
  TEAM_SERVERS,
  getTeamForTool,
  getMCPServerUrl,
  getAllTeams,
  getTeamConfigForTool,
} from '../config/teams';

describe('Teams Configuration', () => {
  describe('TEAM_SERVERS', () => {
    it('Team A has analytics tools', () => {
      expect(TEAM_SERVERS['A'].tools).toEqual(['query_database', 'generate_report', 'audit_logs']);
    });

    it('Team B has devops tools', () => {
      expect(TEAM_SERVERS['B'].tools).toEqual(['deploy_application', 'restart_service', 'update_configuration']);
    });

    it('Team C has developer tools', () => {
      expect(TEAM_SERVERS['C'].tools).toEqual(['read_file', 'list_directory', 'modify_permissions', 'user_management']);
    });
  });

  describe('getTeamForTool', () => {
    it('maps Team A tools correctly', () => {
      expect(getTeamForTool('query_database')).toBe('A');
      expect(getTeamForTool('generate_report')).toBe('A');
      expect(getTeamForTool('audit_logs')).toBe('A');
    });

    it('maps Team B tools correctly', () => {
      expect(getTeamForTool('deploy_application')).toBe('B');
      expect(getTeamForTool('restart_service')).toBe('B');
      expect(getTeamForTool('update_configuration')).toBe('B');
    });

    it('maps Team C tools correctly', () => {
      expect(getTeamForTool('read_file')).toBe('C');
      expect(getTeamForTool('list_directory')).toBe('C');
      expect(getTeamForTool('modify_permissions')).toBe('C');
      expect(getTeamForTool('user_management')).toBe('C');
    });

    it('returns null for unknown tools', () => {
      expect(getTeamForTool('nonexistent_tool')).toBeNull();
      expect(getTeamForTool('')).toBeNull();
    });
  });

  describe('getMCPServerUrl', () => {
    it('returns valid URL for known teams', () => {
      const urlA = getMCPServerUrl('A');
      expect(urlA).toMatch(/^http:\/\/.+:\d+$/);
      expect(urlA).toContain(':8001');

      const urlB = getMCPServerUrl('B');
      expect(urlB).toContain(':8002');

      const urlC = getMCPServerUrl('C');
      expect(urlC).toContain(':8003');
    });

    it('throws for unknown team', () => {
      expect(() => getMCPServerUrl('Z')).toThrow('Unknown team: Z');
      expect(() => getMCPServerUrl('unknown')).toThrow();
    });
  });

  describe('getAllTeams', () => {
    it('returns 3 teams', () => {
      const teams = getAllTeams();
      expect(teams).toHaveLength(3);
    });

    it('each team has required properties', () => {
      const teams = getAllTeams();
      for (const team of teams) {
        expect(team).toHaveProperty('id');
        expect(team).toHaveProperty('tools');
        expect(team).toHaveProperty('port');
        expect(team).toHaveProperty('host');
        expect(team).toHaveProperty('url');
      }
    });

    it('team IDs are A, B, C', () => {
      const ids = getAllTeams().map(t => t.id);
      expect(ids).toContain('A');
      expect(ids).toContain('B');
      expect(ids).toContain('C');
    });
  });

  describe('getTeamConfigForTool', () => {
    it('returns correct config for known tools', () => {
      const config = getTeamConfigForTool('query_database');
      expect(config).not.toBeNull();
      expect(config!.team).toBe('A');
      expect(config!.tool).toBe('query_database');
      expect(config!.port).toBe(8001);
      expect(config!.url).toContain(':8001');
    });

    it('returns null for unknown tools', () => {
      expect(getTeamConfigForTool('nonexistent')).toBeNull();
    });

    it('maps deploy_application to Team B', () => {
      const config = getTeamConfigForTool('deploy_application');
      expect(config).not.toBeNull();
      expect(config!.team).toBe('B');
      expect(config!.port).toBe(8002);
    });

    it('maps read_file to Team C', () => {
      const config = getTeamConfigForTool('read_file');
      expect(config).not.toBeNull();
      expect(config!.team).toBe('C');
      expect(config!.port).toBe(8003);
    });
  });
});
