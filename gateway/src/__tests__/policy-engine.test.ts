import { describe, it, expect } from 'vitest';
import { policyEngine } from '../policy/engine';

describe('PolicyEngine', () => {
  describe('canAccessTool', () => {
    it('allows viewer to access its own tools', () => {
      expect(policyEngine.canAccessTool('viewer', 'read_file')).toBe(true);
      expect(policyEngine.canAccessTool('viewer', 'list_directory')).toBe(true);
    });

    it('denies viewer access to tools from other roles', () => {
      expect(policyEngine.canAccessTool('viewer', 'query_database')).toBe(false);
      expect(policyEngine.canAccessTool('viewer', 'deploy_application')).toBe(false);
    });

    it('allows developer to access its own tools', () => {
      expect(policyEngine.canAccessTool('developer', 'read_file')).toBe(true);
      expect(policyEngine.canAccessTool('developer', 'list_directory')).toBe(true);
      expect(policyEngine.canAccessTool('developer', 'query_database')).toBe(true);
    });

    it('denies developer access to deployer tools', () => {
      expect(policyEngine.canAccessTool('developer', 'deploy_application')).toBe(false);
      expect(policyEngine.canAccessTool('developer', 'restart_service')).toBe(false);
    });

    it('allows deployer to access its own tools', () => {
      expect(policyEngine.canAccessTool('deployer', 'deploy_application')).toBe(true);
      expect(policyEngine.canAccessTool('deployer', 'restart_service')).toBe(true);
      expect(policyEngine.canAccessTool('deployer', 'update_configuration')).toBe(true);
    });

    it('denies deployer access to viewer tools', () => {
      expect(policyEngine.canAccessTool('deployer', 'read_file')).toBe(false);
    });

    it('allows security_admin to access its own tools', () => {
      expect(policyEngine.canAccessTool('security_admin', 'query_database')).toBe(true);
      expect(policyEngine.canAccessTool('security_admin', 'read_file')).toBe(true);
      expect(policyEngine.canAccessTool('security_admin', 'generate_report')).toBe(true);
      expect(policyEngine.canAccessTool('security_admin', 'audit_logs')).toBe(true);
    });

    it('denies security_admin access to deployer tools', () => {
      expect(policyEngine.canAccessTool('security_admin', 'deploy_application')).toBe(false);
    });

    it('allows admin to access any tool (wildcard)', () => {
      expect(policyEngine.canAccessTool('admin', 'read_file')).toBe(true);
      expect(policyEngine.canAccessTool('admin', 'deploy_application')).toBe(true);
      expect(policyEngine.canAccessTool('admin', 'query_database')).toBe(true);
      expect(policyEngine.canAccessTool('admin', 'anything_at_all')).toBe(true);
    });

    it('returns false for unknown roles', () => {
      expect(policyEngine.canAccessTool('unknown', 'read_file')).toBe(false);
      expect(policyEngine.canAccessTool('', 'read_file')).toBe(false);
    });
  });

  describe('canAccessResource', () => {
    it('allows viewer to access matching resources', () => {
      expect(policyEngine.canAccessResource('viewer', 'file://logs/app.log')).toBe(true);
    });

    it('denies viewer access to non-matching resources', () => {
      expect(policyEngine.canAccessResource('viewer', 'file://src/main.ts')).toBe(false);
      expect(policyEngine.canAccessResource('viewer', 'db://dev/users')).toBe(false);
    });

    it('allows developer to access its resources', () => {
      expect(policyEngine.canAccessResource('developer', 'file://src/main.ts')).toBe(true);
      expect(policyEngine.canAccessResource('developer', 'file://logs/dev/app.log')).toBe(true);
      expect(policyEngine.canAccessResource('developer', 'db://dev/users')).toBe(true);
      expect(policyEngine.canAccessResource('developer', 'db://staging/data')).toBe(true);
    });

    it('denies developer access to production resources', () => {
      expect(policyEngine.canAccessResource('developer', 'app://production/service')).toBe(false);
    });

    it('allows deployer to access staging and production apps', () => {
      expect(policyEngine.canAccessResource('deployer', 'app://staging/myapp')).toBe(true);
      expect(policyEngine.canAccessResource('deployer', 'app://production/myapp')).toBe(true);
    });

    it('denies deployer access to file resources', () => {
      expect(policyEngine.canAccessResource('deployer', 'file://src/main.ts')).toBe(false);
    });

    it('allows security_admin to access audit and security resources', () => {
      expect(policyEngine.canAccessResource('security_admin', 'db://audit/trail')).toBe(true);
      expect(policyEngine.canAccessResource('security_admin', 'file://logs/access.log')).toBe(true);
      expect(policyEngine.canAccessResource('security_admin', 'file://security/keys')).toBe(true);
    });

    it('allows admin to access any resource (wildcard)', () => {
      expect(policyEngine.canAccessResource('admin', 'file://anything')).toBe(true);
      expect(policyEngine.canAccessResource('admin', 'db://any/thing')).toBe(true);
      expect(policyEngine.canAccessResource('admin', 'app://production/critical')).toBe(true);
    });

    it('returns false for unknown roles', () => {
      expect(policyEngine.canAccessResource('unknown', 'file://logs/app.log')).toBe(false);
    });
  });

  describe('canPerformOperation', () => {
    it('allows viewer to perform GET and LIST', () => {
      expect(policyEngine.canPerformOperation('viewer', 'GET')).toBe(true);
      expect(policyEngine.canPerformOperation('viewer', 'LIST')).toBe(true);
    });

    it('denies viewer CREATE and UPDATE', () => {
      expect(policyEngine.canPerformOperation('viewer', 'CREATE')).toBe(false);
      expect(policyEngine.canPerformOperation('viewer', 'UPDATE')).toBe(false);
    });

    it('allows developer to perform SELECT, GET, LIST', () => {
      expect(policyEngine.canPerformOperation('developer', 'SELECT')).toBe(true);
      expect(policyEngine.canPerformOperation('developer', 'GET')).toBe(true);
      expect(policyEngine.canPerformOperation('developer', 'LIST')).toBe(true);
    });

    it('allows deployer to perform CREATE and UPDATE', () => {
      expect(policyEngine.canPerformOperation('deployer', 'CREATE')).toBe(true);
      expect(policyEngine.canPerformOperation('deployer', 'UPDATE')).toBe(true);
    });

    it('denies deployer GET and LIST', () => {
      expect(policyEngine.canPerformOperation('deployer', 'GET')).toBe(false);
      expect(policyEngine.canPerformOperation('deployer', 'LIST')).toBe(false);
    });

    it('allows admin to perform any operation (wildcard)', () => {
      expect(policyEngine.canPerformOperation('admin', 'GET')).toBe(true);
      expect(policyEngine.canPerformOperation('admin', 'CREATE')).toBe(true);
      expect(policyEngine.canPerformOperation('admin', 'DELETE')).toBe(true);
      expect(policyEngine.canPerformOperation('admin', 'ANYTHING')).toBe(true);
    });

    it('returns false for unknown roles', () => {
      expect(policyEngine.canPerformOperation('unknown', 'GET')).toBe(false);
    });
  });
});
