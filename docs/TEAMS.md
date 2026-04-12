# Multi-Team MCP Server Setup

This project implements a secure MCP (Model Context Protocol) gateway with separate team-specific servers.

## Architecture

```
Dashboard (React, port 5173)
      ↓
Gateway (TypeScript, port 3000) 
      ├→ Team A Server (Analytics, port 8001)
      ├→ Team B Server (DevOps, port 8002)
      └→ Team C Server (Developer, port 8003)
```

## Team Servers

### Team A - Analytics
- **Port**: 8001
- **Tools**:
  - `query_database` - Execute database queries
  - `generate_report` - Generate analytics reports
  - `audit_logs` - Query audit logs
- **Typical Users**: analyst role
- **Start**: `python3 http_bridge_team_a.py`

### Team B - DevOps/Operations
- **Port**: 8002
- **Tools**:
  - `deploy_application` - Deploy to environments
  - `restart_service` - Restart services
  - `update_configuration` - Update service config
- **Typical Users**: deployer role
- **Start**: `python3 http_bridge_team_b.py`

### Team C - Developer
- **Port**: 8003
- **Tools**:
  - `read_file` - Read file contents
  - `list_directory` - List directories
  - `modify_permissions` - Manage permissions
  - `user_management` - Manage users
- **Typical Users**: developer, security_admin, admin roles
- **Start**: `python3 http_bridge_team_c.py`

## Running the Application

### Option 1: Manual Start (Recommended for Development)

**Terminal 1 - Team A Server**
```bash
cd mcp_server
python3 http_bridge_team_a.py
```

**Terminal 2 - Team B Server**
```bash
cd mcp_server
python3 http_bridge_team_b.py
```

**Terminal 3 - Team C Server**
```bash
cd mcp_server
python3 http_bridge_team_c.py
```

**Terminal 4 - Gateway**
```bash
cd gateway
npm start
```

**Terminal 5 - Dashboard**
```bash
cd dashboard
npm start
```

### Option 2: Using Environment Variables

Start servers on different ports:
```bash
# Terminal 1
cd mcp_server && MCP_PORT=8001 python3 http_bridge_team_a.py

# Terminal 2
cd mcp_server && MCP_PORT=8002 python3 http_bridge_team_b.py

# Terminal 3
cd mcp_server && MCP_PORT=8003 python3 http_bridge_team_c.py
```

## Gateway Endpoints

### Authentication
- `POST /oauth/token` - Get JWT token
- `POST /oauth/validate-token` - Validate token

### Tool Execution
- `POST /mcp/tools/:tool` - Execute a tool (requires JWT)

### Team Information
- `GET /teams` - List all team configurations
- `GET /tools/:tool/team` - Show which team handles a tool
- `GET /health/circuit` - Circuit breaker status
- `GET /metrics` - Prometheus metrics
- `GET /stats` - Security event statistics
- `GET /events` - SSE stream of security events

## Example Requests

### Get Authentication Token
```bash
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"developer@company.com","password":"password"}'
```

### Check Team Configuration
```bash
curl http://localhost:3000/teams
```

### Check Which Team Handles a Tool
```bash
curl http://localhost:3000/tools/deploy_application/team
```

### Execute a Tool
```bash
TOKEN="<your-jwt-token>"

curl -X POST http://localhost:3000/mcp/tools/deploy_application \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "service": "api-service",
      "version": "1.2.3",
      "environment": "production"
    }
  }'
```

## Security Features

1. **Role-Based Access Control (RBAC)**
   - Roles: viewer, analyst, developer, deployer, security_admin, admin
   - Each role has specific tool access

2. **Request Validation**
   - JWT authentication required
   - Policy engine validates tool access
   - Prompt injection detection
   - Anomaly detection for unusual patterns

3. **Resilience**
   - Circuit breaker pattern prevents cascading failures
   - Automatic retry with exponential backoff
   - Request throttling and rate limiting

4. **Observability**
   - Event logging for all requests
   - Security event streaming
   - Prometheus-compatible metrics

## File Structure

```
mcp_server/
├── server_team_a.py        # Team A MCP definition
├── server_team_b.py        # Team B MCP definition
├── server_team_c.py        # Team C MCP definition
├── http_bridge_team_a.py   # Team A HTTP bridge
├── http_bridge_team_b.py   # Team B HTTP bridge
├── http_bridge_team_c.py   # Team C HTTP bridge
└── server.py               # Original unified server (deprecated)

gateway/
├── src/
│   ├── server.ts           # Main gateway with team routing
│   ├── auth/
│   ├── policy/
│   ├── security/
│   ├── resilience/
│   └── observability/
└── dist/                   # Compiled JavaScript

dashboard/
├── src/
│   ├── components/
│   ├── App.tsx
│   └── main.tsx
└── public/
```

## Testing Team Routing

You can test the team routing by checking which server handles each tool:

```bash
# Team A Tools
curl -X GET http://localhost:3000/tools/query_database/team

# Team B Tools  
curl -X GET http://localhost:3000/tools/deploy_application/team

# Team C Tools
curl -X GET http://localhost:3000/tools/read_file/team
```

## Scaling Teams

To add a new team:

1. Create `server_team_x.py` with team-specific tools
2. Create `http_bridge_team_x.py` HTTP wrapper
3. Add configuration to `TEAM_SERVERS` in `gateway/src/server.ts`:
   ```typescript
   'X': {
     port: 8004,
     host: 'localhost',
     tools: ['tool1', 'tool2', 'tool3']
   }
   ```
4. Rebuild gateway: `npm run build`
5. Start the new team bridge: `MCP_PORT=8004 python3 http_bridge_team_x.py`

## Troubleshooting

### "Tool not found in any team"
- Check `/teams` endpoint to see available tools
- Verify tool is registered in correct team server

### "Failed to reach Team X MCP service"
- Ensure team bridge is running on correct port
- Check port conflicts: `lsof -i :8001`
- Verify network connectivity: `curl http://localhost:800X/health`

### JWT Token Issues
- Get new token: `POST /oauth/token`
- Default credentials: `developer@company.com` / `password`
- Admin credentials: `admin@company.com` / `password`
