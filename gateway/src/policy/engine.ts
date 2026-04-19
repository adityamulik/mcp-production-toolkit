/**
 * Policy Engine
 * Enforces RBAC policies
 */

interface Policy {
  [role: string]: {
    permissions: {
      tools: string[];
      resources: string[];
      operations: string[];
    };
  };
}

class PolicyEngine {
  private policy: Policy = {
    viewer: {
      permissions: {
        tools: ['read_file', 'list_directory'],
        resources: ['file://logs/*'],
        operations: ['GET', 'LIST']
      }
    },
    developer: {
      permissions: {
        tools: ['read_file', 'list_directory', 'query_database'],
        resources: ['file://src/*', 'file://logs/dev/*', 'db://dev/*', 'db://staging/*'],
        operations: ['SELECT', 'GET', 'LIST']
      }
    },
    analyst: {
      permissions: {
        tools: ['generate_report'],
        resources: ['file://reports/*'],
        operations: ['GET']
      }
    },
    deployer: {
      permissions: {
        tools: ['deploy_application', 'restart_service', 'update_configuration'],
        resources: ['app://staging/*', 'app://production/*'],
        operations: ['CREATE', 'UPDATE']
      }
    },
    security_admin: {
      permissions: {
        tools: ['query_database', 'read_file', 'generate_report', 'audit_logs'],
        resources: ['db://audit/*', 'file://logs/*', 'file://security/*'],
        operations: ['SELECT', 'GET', 'LIST']
      }
    },
    admin: {
      permissions: {
        tools: ['*'],
        resources: ['*'],
        operations: ['*']
      }
    }
  };
  
  canAccessTool(role: string, tool: string): boolean {
    const rolePolicy = this.policy[role];
    if (!rolePolicy) return false;
    
    const { tools } = rolePolicy.permissions;
    return tools.includes('*') || tools.includes(tool);
  }
  
  canAccessResource(role: string, resource: string): boolean {
    const rolePolicy = this.policy[role];
    if (!rolePolicy) return false;
    
    const { resources } = rolePolicy.permissions;
    
    for (const pattern of resources) {
      if (pattern === '*' || this.matchPattern(resource, pattern)) {
        return true;
      }
    }
    
    return false;
  }
  
  canPerformOperation(role: string, operation: string): boolean {
    const rolePolicy = this.policy[role];
    if (!rolePolicy) return false;
    
    const { operations } = rolePolicy.permissions;
    return operations.includes('*') || operations.includes(operation);
  }
  
  private matchPattern(resource: string, pattern: string): boolean {
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(resource);
  }
}

export const policyEngine = new PolicyEngine();