#!/bin/bash
# Team MCP Testing Script
# Tests all three team servers with correct parameters

set -e

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '#' | xargs)
else
  echo "⚠️  Warning: .env.local not found. Using environment variables or defaults."
  echo "   Create .env.local from .env.example and set your credentials."
fi

# Get auth token for analyst (Team A access)
echo "🔐 Getting auth token..."
ANALYST_TOKEN=$(curl -s -X POST "${OAUTH_SERVER_URL}${OAUTH_TOKEN_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ANALYST_EMAIL}\",\"password\":\"${ANALYST_PASSWORD}\"}" | jq -r .token)

DEPLOYER_TOKEN=$(curl -s -X POST "${OAUTH_SERVER_URL}${OAUTH_TOKEN_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${DEPLOYER_EMAIL}\",\"password\":\"${DEPLOYER_PASSWORD}\"}" | jq -r .token)

DEVELOPER_TOKEN=$(curl -s -X POST "${OAUTH_SERVER_URL}${OAUTH_TOKEN_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${DEVELOPER_EMAIL}\",\"password\":\"${DEVELOPER_PASSWORD}\"}" | jq -r .token)

echo "✅ Tokens acquired"
echo ""

# ============================================
# TEAM A - ANALYTICS
# ============================================
echo "🎯 TEAM A - Analytics Server (port 8001)"
echo "=========================================="
echo ""

echo "1️⃣  Testing: query_database"
echo "   Parameters: query (required), database (optional)"
curl -s -X POST http://localhost:3000/mcp/tools/query_database \
  -H "Authorization: Bearer $ANALYST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "query": "SELECT COUNT(*) FROM users WHERE active = true",
      "database": "analytics_db"
    }
  }' | jq '.' | head -20

echo ""
echo "2️⃣  Testing: generate_report"
echo "   Parameters: report_type (required), format (optional)"
curl -s -X POST http://localhost:3000/mcp/tools/generate_report \
  -H "Authorization: Bearer $ANALYST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "report_type": "monthly_analytics",
      "format": "json"
    }
  }' | jq '.' | head -20

echo ""
echo "3️⃣  Testing: audit_logs"
echo "   Parameters: action (optional), limit (optional)"
curl -s -X POST http://localhost:3000/mcp/tools/audit_logs \
  -H "Authorization: Bearer $ANALYST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "action": "list",
      "limit": 50
    }
  }' | jq '.' | head -20

echo ""
echo ""

# ============================================
# TEAM B - DEVOPS
# ============================================
echo "🎯 TEAM B - DevOps Server (port 8002)"
echo "========================================"
echo ""

echo "1️⃣  Testing: deploy_application"
echo "   Parameters: service (required), version (required), environment (optional)"
curl -s -X POST http://localhost:3000/mcp/tools/deploy_application \
  -H "Authorization: Bearer $DEPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "service": "api-service",
      "version": "2.5.1",
      "environment": "staging"
    }
  }' | jq '.' | head -20

echo ""
echo "2️⃣  Testing: restart_service"
echo "   Parameters: service (required)"
curl -s -X POST http://localhost:3000/mcp/tools/restart_service \
  -H "Authorization: Bearer $DEPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "service": "api-service"
    }
  }' | jq '.' | head -20

echo ""
echo "3️⃣  Testing: update_configuration"
echo "   Parameters: service (required), config_key (required), config_value (required)"
curl -s -X POST http://localhost:3000/mcp/tools/update_configuration \
  -H "Authorization: Bearer $DEPLOYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "service": "api-service",
      "config_key": "LOG_LEVEL",
      "config_value": "DEBUG"
    }
  }' | jq '.' | head -20

echo ""
echo ""

# ============================================
# TEAM C - DEVELOPER
# ============================================
echo "🎯 TEAM C - Developer Server (port 8003)"
echo "=========================================="
echo ""

echo "1️⃣  Testing: read_file"
echo "   Parameters: path (required)"
curl -s -X POST http://localhost:3000/mcp/tools/read_file \
  -H "Authorization: Bearer $DEVELOPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "path": "/var/app/config.json"
    }
  }' | jq '.' | head -20

echo ""
echo "2️⃣  Testing: list_directory"
echo "   Parameters: path (required)"
curl -s -X POST http://localhost:3000/mcp/tools/list_directory \
  -H "Authorization: Bearer $DEVELOPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "path": "/var/app"
    }
  }' | jq '.' | head -20

echo ""
echo "3️⃣  Testing: user_management"
echo "   Parameters: action (required), user_email (required), role (optional)"
curl -s -X POST http://localhost:3000/mcp/tools/user_management \
  -H "Authorization: Bearer $DEVELOPER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "arguments": {
      "action": "list",
      "user_email": "test@company.com",
      "role": "developer"
    }
  }' | jq '.' | head -20

echo ""
echo ""
echo "✅ All tests complete!"
echo ""
echo "📊 Check gateway metrics:"
echo "   curl http://localhost:3000/metrics"
echo ""
echo "📋 Check team configuration:"
echo "   curl http://localhost:3000/teams"
