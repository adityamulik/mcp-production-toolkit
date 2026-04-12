import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { setupAuth, authenticateJWT } from './auth/oauth-server.js';
import { policyEngine } from './policy/engine.js';
import { promptFilter } from './security/prompt-filter.js';
import { anomalyDetector } from './security/anomaly-detector.js';
import { 
  requestCounter, 
  requestDuration, 
  blockedCounter,
  anomalyCounter,
  getMetrics 
} from './observability/metrics.js';
import { eventBroadcaster, SecurityEvent } from './observability/events.js';
import { mcpCircuitBreaker } from './resilience/circuit-breaker.js';
import { mcpRetryPolicy } from './resilience/retry-policy.js';
import { 
  TEAM_SERVERS, 
  getTeamForTool, 
  getMCPServerUrl,
  getAllTeams,
  getTeamConfigForTool
} from './config/teams.js';
import { requestLogger, RequestLog } from './observability/request-logger.js';

const app = express();
const SECRET = process.env.GATEWAY_JWT_SECRET || process.env.JWT_SECRET || 'dev-secret-key';

app.use(cors());
app.use(express.json());

// Setup OAuth endpoints
setupAuth(app);

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(getMetrics());
});

// Circuit breaker status endpoint
app.get('/health/circuit', (req, res) => {
  res.json({
    status: 'ok',
    circuitBreaker: mcpCircuitBreaker.getMetrics()
  });
});

// SSE endpoint for dashboard
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send recent events immediately
  const recent = eventBroadcaster.getRecentEvents(10);
  res.write(`data: ${JSON.stringify({ type: 'initial', events: recent })}\n\n`);
  
  // Listen for new events
  const handler = (event: SecurityEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
  
  eventBroadcaster.on('security_event', handler);
  
  req.on('close', () => {
    eventBroadcaster.off('security_event', handler);
  });
});

// Stats endpoint for dashboard
app.get('/stats', (req, res) => {
  // Support token in query param for dashboard
  let user = (req as any).user;
  if (!user) {
    const token = req.query.token as string;
    if (token) {
      try {
        user = jwt.verify(token, SECRET) as any;
      } catch (error) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
  }
  res.json(eventBroadcaster.getStats());
});

// Team configuration endpoint
app.get('/teams', (req, res) => {
  const teams = getAllTeams();
  
  res.json({
    teams,
    totalTeams: teams.length,
    totalTools: teams.reduce((sum, t) => sum + t.tools.length, 0)
  });
});

// Tool info endpoint - shows which team handles each tool
app.get('/tools/:tool/team', (req, res) => {
  const { tool } = req.params;
  const teamConfig = getTeamConfigForTool(tool);
  
  if (!teamConfig) {
    return res.status(404).json({
      error: `Tool '${tool}' not found in any team`
    });
  }
  
  res.json(teamConfig);
});

// Logging endpoints
// Allow unauthenticated access via query token for SSE
app.get('/logs', (req, res) => {
  // Support token in query param for EventSource
  let user = (req as any).user;
  if (!user) {
    const token = req.query.token as string;
    if (token) {
      try {
        user = jwt.verify(token, SECRET) as any;
      } catch (error) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } else if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  
  const limit = parseInt(req.query.limit as string) || 100;
  const logs = requestLogger.getLogs(limit);
  res.json({ logs });
});

app.get('/logs/user/:userId', authenticateJWT, (req, res) => {
  const userId = req.params.userId;
  const logs = requestLogger.getLogsByUser(userId);
  res.json({ userId, logs });
});

app.get('/logs/tool/:tool', authenticateJWT, (req, res) => {
  const tool = req.params.tool;
  const logs = requestLogger.getLogsByTool(tool);
  res.json({ tool, logs });
});

app.get('/logs/team/:team', authenticateJWT, (req, res) => {
  const team = req.params.team;
  const logs = requestLogger.getLogsByTeam(team);
  res.json({ team, logs });
});

app.get('/logs/blocked', authenticateJWT, (req, res) => {
  const logs = requestLogger.getBlockedLogs();
  res.json({ logs });
});

app.get('/logs/stats', authenticateJWT, (req, res) => {
  const stats = requestLogger.getStats();
  res.json(stats);
});

app.get('/logs/stream', (req, res) => {
  // Support token in query param for EventSource since headers can't be set on EventSource constructor
  let user = (req as any).user;
  if (!user) {
    const token = req.query.token as string;
    if (token) {
      try {
        user = jwt.verify(token, SECRET) as any;
      } catch (error) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } else {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const unsubscribe = requestLogger.onNewLog((log: RequestLog) => {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

// Main MCP proxy endpoint
app.post('/mcp/tools/:tool', authenticateJWT, async (req, res) => {
  const start = Date.now();
  const { tool } = req.params;
  const { arguments: args } = req.body;
  const user = (req as any).user;
  const userMessage = req.headers['x-user-message'] as string;
  
  try {
    // 1. POLICY CHECK
    if (!policyEngine.canAccessTool(user.role, tool)) {
      blockedCounter.inc({ reason: 'rbac_violation' });
      requestCounter.inc({ tool, status: 'blocked', user_role: user.role });
      
      const event: SecurityEvent = {
        type: 'blocked',
        timestamp: Date.now(),
        userId: user.email,
        tool,
        reason: 'RBAC violation',
        details: { role: user.role, tool }
      };
      eventBroadcaster.logEvent(event);
      
      // Log blocked request
      const duration = (Date.now() - start) / 1000;
      requestLogger.log({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        method: 'POST',
        path: `/mcp/tools/${tool}`,
        tool,
        team: user.role,
        userId: user.email,
        status: 403,
        duration: Math.round(duration * 1000),
        blocked: true,
        reason: 'RBAC_VIOLATION'
      });
      
      return res.status(403).json({
        blocked: true,
        reason: 'RBAC_VIOLATION',
        message: `Role '${user.role}' cannot access tool '${tool}'`
      });
    }
    
    // 2. RESOURCE CHECK (if applicable)
    if (args.resource) {
      if (!policyEngine.canAccessResource(user.role, args.resource)) {
        blockedCounter.inc({ reason: 'resource_denied' });
        
        const event: SecurityEvent = {
          type: 'blocked',
          timestamp: Date.now(),
          userId: user.email,
          tool,
          reason: 'Resource access denied',
          details: { resource: args.resource }
        };
        eventBroadcaster.logEvent(event);
        
        // Log blocked request
        const duration = (Date.now() - start) / 1000;
        requestLogger.log({
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          method: 'POST',
          path: `/mcp/tools/${tool}`,
          tool,
          team: user.role,
          userId: user.email,
          status: 403,
          duration: Math.round(duration * 1000),
          blocked: true,
          reason: 'RESOURCE_DENIED'
        });
        
        return res.status(403).json({
          blocked: true,
          reason: 'RESOURCE_DENIED',
          message: `No access to resource: ${args.resource}`
        });
      }
    }
    
    // 3. PROMPT FILTERING
    const filterResult = await promptFilter.filter(JSON.stringify(args), userMessage);
    
    if (!filterResult.safe) {
      blockedCounter.inc({ reason: 'prompt_injection' });
      
      const event: SecurityEvent = {
        type: 'blocked',
        timestamp: Date.now(),
        userId: user.email,
        tool,
        reason: 'Prompt injection detected',
        details: { patterns: filterResult.detectedPatterns }
      };
      eventBroadcaster.logEvent(event);
      
      // Log blocked request
      const duration = (Date.now() - start) / 1000;
      requestLogger.log({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        method: 'POST',
        path: `/mcp/tools/${tool}`,
        tool,
        team: 'N/A',
        userId: user.email,
        status: 400,
        duration: Math.round(duration * 1000),
        blocked: true,
        reason: 'PROMPT_INJECTION'
      });
      
      return res.status(400).json({
        blocked: true,
        reason: 'PROMPT_INJECTION',
        message: filterResult.reason,
        confidence: filterResult.confidence
      });
    }
    
    // 4. ANOMALY DETECTION
    const anomaly = anomalyDetector.detectAnomaly(user.userId, tool, args, user.role);
    
    if (anomaly.isAnomaly) {
      anomalyCounter.inc({ type: anomaly.type, severity: anomaly.severity });
      
      const event: SecurityEvent = {
        type: 'anomaly',
        timestamp: Date.now(),
        userId: user.email,
        tool,
        severity: anomaly.severity,
        reason: anomaly.message,
        details: anomaly
      };
      eventBroadcaster.logEvent(event);
      
      // Don't block, but log and alert
      if (anomaly.severity === 'high') {
        console.warn(`HIGH SEVERITY ANOMALY: ${anomaly.message}`);
      }
    }
    
    // 5. CIRCUIT BREAKER CHECK
    if (!mcpCircuitBreaker.canAttempt()) {
      const cbState = mcpCircuitBreaker.getState();
      blockedCounter.inc({ reason: 'circuit_breaker_open' });
      
      const event: SecurityEvent = {
        type: 'blocked',
        timestamp: Date.now(),
        userId: user.email,
        tool,
        reason: 'Circuit breaker OPEN - MCP service unavailable',
        details: { circuitState: cbState }
      };
      eventBroadcaster.logEvent(event);
      
      // Log blocked request
      const duration = (Date.now() - start) / 1000;
      requestLogger.log({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        method: 'POST',
        path: `/mcp/tools/${tool}`,
        tool,
        team: 'N/A',
        userId: user.email,
        status: 503,
        duration: Math.round(duration * 1000),
        blocked: true,
        reason: 'CIRCUIT_BREAKER_OPEN'
      });
      
      return res.status(503).json({
        blocked: true,
        reason: 'SERVICE_UNAVAILABLE',
        message: 'MCP service is temporarily unavailable. Please retry later.',
        retryAfter: 30
      });
    }

    // 6. DETERMINE TEAM & FORWARD TO TEAM MCP SERVER with retry logic
    const team = getTeamForTool(tool);
    
    if (!team) {
      return res.status(404).json({
        error: `Tool '${tool}' not found in any team server`,
        availableTeams: Object.keys(TEAM_SERVERS)
      });
    }
    
    const teamUrl = getMCPServerUrl(team);
    console.log(`🎯 Routing tool '${tool}' to Team ${team} at ${teamUrl}`);
    
    let mcpResponse;
    try {
      mcpResponse = await mcpRetryPolicy.executeWithStatus(
        `${user.email}-${tool}-${Date.now()}`,
        async () => {
          const response = await fetch(`${teamUrl}/tools/${tool}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ arguments: args })
          });
          
          return {
            status: response.status,
            data: response,
            team
          };
        },
        (attempt, delay, status) => {
          console.log(`Team ${team} request for ${tool} - attempt ${attempt}, status ${status}, retry in ${delay}ms`);
        }
      );
      
      if (!mcpResponse.data.ok) {
        mcpCircuitBreaker.recordFailure();
        throw new Error(`Team ${team} MCP server returned ${mcpResponse.status}`);
      }
      
      mcpCircuitBreaker.recordSuccess();
    } catch (fetchError: any) {
      mcpCircuitBreaker.recordFailure();
      
      const event: SecurityEvent = {
        type: 'blocked',
        timestamp: Date.now(),
        userId: user.email,
        tool,
        reason: `Team ${team} MCP server error after retries`,
        details: { error: fetchError.message, circuitState: mcpCircuitBreaker.getMetrics(), team }
      };
      eventBroadcaster.logEvent(event);
      
      // Log blocked request
      const duration = (Date.now() - start) / 1000;
      requestLogger.log({
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        method: 'POST',
        path: `/mcp/tools/${tool}`,
        tool,
        team: team || 'UNKNOWN',
        userId: user.email,
        status: 503,
        duration: Math.round(duration * 1000),
        blocked: true,
        reason: 'MCP_SERVICE_ERROR',
        error: fetchError.message
      });
      
      return res.status(503).json({
        blocked: true,
        reason: 'MCP_SERVICE_ERROR',
        message: `Failed to reach Team ${team} MCP service after retries`,
        team
      });
    }
    
    const result = await mcpResponse.data.json();
    
    // 7. METRICS & LOGGING
    const duration = (Date.now() - start) / 1000;
    requestDuration.observe({ tool }, duration);
    requestCounter.inc({ tool, status: 'success', user_role: user.role });
    
    const event: SecurityEvent = {
      type: 'allowed',
      timestamp: Date.now(),
      userId: user.email,
      tool,
      details: { duration, team }
    };
    eventBroadcaster.logEvent(event);

    // Log successful request
    requestLogger.log({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      method: 'POST',
      path: `/mcp/tools/${tool}`,
      tool,
      team,
      userId: user.email,
      status: 200,
      duration: Math.round(duration * 1000),
      blocked: false
    });
    
    res.json({ success: true, result, team, duration });
    
  } catch (error: any) {
    requestCounter.inc({ tool, status: 'error', user_role: user.role });
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🛡️  MCP Gateway running on http://localhost:${PORT}`);
  console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`📡 Events: http://localhost:${PORT}/events`);
});