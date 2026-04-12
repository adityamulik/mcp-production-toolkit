#!/bin/bash

# ============================================
# Chaos Engineering Test - Server Crash
# ============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
AUTH_EMAIL="${AUTH_EMAIL:-analyst@company.com}"
AUTH_PASSWORD="${AUTH_PASSWORD:-analyst123}"

echo -e "${BLUE}🔐 Getting authentication token...${NC}"

# Get token from auth endpoint
TOKEN_RESPONSE=$(curl -s -X POST ${API_URL}/auth/token \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${AUTH_EMAIL}\",\"password\":\"${AUTH_PASSWORD}\"}")

TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to obtain authentication token${NC}"
  echo "Response: $TOKEN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Token obtained successfully${NC}"
echo -e "${YELLOW}Token: ${TOKEN:0:30}...${NC}"
echo ""

# Export token for use in subshells
export TOKEN

# Terminal 1: Start load generator (sends requests continuously)
echo -e "${BLUE}📊 Starting load generator...${NC}"
while true; do
  curl -s -X POST ${API_URL}/mcp/tools/query_database \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"arguments": {"query": "SELECT * FROM analytics"}}' \
    | jq -r '.result.status // .error' &
  sleep 0.5
done

# Output shows: "success" "success" "success" ...

# Terminal 2: Kill a server (simulating crash)
docker kill mcp-database-server-1

# Terminal 1 output changes to:
# "success" (server 2)
# "success" (server 3)
# "Circuit breaker OPEN for database-mcp-1" (logged)
# "success" (server 2)
# "success" (server 3)
# ... continues working, just routing around dead server

# Dashboard shows:
# 🔴 Circuit breaker OPEN: database-mcp-1
# 🟢 Requests still succeeding (routed to healthy servers)

# Terminal 3: Restart server
docker start mcp-database-server-1

# After 10 seconds (resetTimeout):
# Circuit breaker tries HALF_OPEN
# Test request succeeds
# Circuit breaker closes
# Traffic resumes to all 3 servers

# Dashboard shows:
# 🟢 Circuit breaker CLOSED: database-mcp-1
# ✅ All servers healthy