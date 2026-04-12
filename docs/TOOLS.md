# Team Tools Reference

## Team A - Analytics (port 8001)

### query_database
Execute a database query

**Parameters:**
- `query` (string, **required**) - The SQL query to execute
- `database` (string, optional) - Database name, defaults to "default"

**Example:**
```bash
curl -X POST http://localhost:3000/mcp/tools/query_database \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "query": "SELECT * FROM users LIMIT 10",
      "database": "production_db"
    }
  }'
```

### generate_report
Generate an analytics report

**Parameters:**
- `report_type` (string, **required**) - Type of report (e.g., "monthly_analytics", "quarterly_summary")
- `format` (string, optional) - Output format, defaults to "json"

**Example:**
```bash
curl -X POST http://localhost:3000/mcp/tools/generate_report \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "report_type": "monthly_analytics",
      "format": "csv"
    }
  }'
```

### audit_logs
Query audit log entries

**Parameters:**
- `action` (string, optional) - Filter by action type, defaults to "list"
- `limit` (integer, optional) - Maximum results, defaults to 100

**Example:**
```bash
curl -X POST http://localhost:3000/mcp/tools/audit_logs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "action": "list",
      "limit": 50
    }
  }'
```

---

## Team B - DevOps (port 8002)

### deploy_application
Deploy application to an environment

**Parameters:**
- `service` (string, **required**) - Service name
- `version` (string, **required**) - Version to deploy
- `environment` (string, optional) - Target environment, defaults to "staging"

**Example:**
```bash
curl -X POST http://localhost:3000/mcp/tools/deploy_application \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "service": "api-service",
      "version": "2.5.1",
      "environment": "production"
    }
  }'
```

### restart_service
Restart a service

**Parameters:**
- `service` (string, **required**) - Service name to restart

**Example:**
```bash
curl -X POST http://localhost:3000/mcp/tools/restart_service \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "service": "api-service"
    }
  }'
```

### update_configuration
Update service configuration

**Parameters:**
- `service` (string, **required**) - Service name
- `config_key` (string, **required**) - Configuration key
- `config_value` (string, **required**) - Configuration value

**Example:**
```bash
curl -X POST http://localhost:3000/mcp/tools/update_configuration \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "service": "api-service",
      "config_key": "MAX_CONNECTIONS",
      "config_value": "500"
    }
  }'
```

---

## Team C - Developer (port 8003)

### read_file
Read file contents

**Parameters:**
- `path` (string, **required**) - File path to read

**Example:**
```bash
curl -X POST http://localhost:3000/mcp/tools/read_file \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "path": "/var/app/config.json"
    }
  }'
```

### list_directory
List directory contents

**Parameters:**
- `path` (string, **required**) - Directory path

**Example:**
```bash
curl -X POST http://localhost:3000/mcp/tools/list_directory \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "path": "/var/app"
    }
  }'
```

### modify_permissions
Modify user permissions

**Parameters:**
- `user` (string, **required**) - User email or ID
- `role` (string, **required**) - Role to assign
- `action` (string, optional) - Action type, defaults to "assign"

**Example:**
```bash
curl -X POST http://localhost:3000/mcp/tools/modify_permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "user": "john@company.com",
      "role": "developer",
      "action": "assign"
    }
  }'
```

### user_management
Manage users

**Parameters:**
- `action` (string, **required**) - Action: "create", "delete", "update", "list"
- `user_email` (string, **required**) - User email address
- `role` (string, optional) - User role, defaults to "viewer"

**Example:**
```bash
curl -X POST http://localhost:3000/mcp/tools/user_management \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "action": "create",
      "user_email": "newuser@company.com",
      "role": "analyst"
    }
  }'
```

---

## Common Issues

### 400 Bad Request - Invalid Arguments
**Cause:** Missing required parameters or wrong parameter types
**Solution:** Check your request includes all required parameters with correct names

### 403 Forbidden - RBAC Violation
**Cause:** Your role doesn't have access to this tool
**Solution:** Check your assigned role has permission for this tool

### 503 Service Unavailable
**Cause:** Team server is not running or unreachable
**Solution:** Verify team server is running on the correct port

---

## Test Script

Run all tests with correct parameters:
```bash
chmod +x test_teams.sh
./test_teams.sh
```

This script automatically:
1. Gets auth tokens for each role
2. Tests all tools with proper parameters
3. Shows expected responses
