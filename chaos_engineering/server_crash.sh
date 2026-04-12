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

# Load environment variables from .env.local
ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env.local"

if [ -f "$ENV_FILE" ]; then
  echo -e "${BLUE}📄 Loading credentials from .env.local...${NC}"
  set -a
  source "$ENV_FILE"
  set +a
  echo -e "${GREEN}✅ Loaded .env.local${NC}"
else
  echo -e "${YELLOW}⚠️  .env.local not found at $ENV_FILE${NC}"
  echo -e "${YELLOW}Using default credentials${NC}"
fi

# Configuration - use env vars from .env.local
API_URL="${API_URL:-http://localhost:3000}"
AUTH_EMAIL="${ANALYST_EMAIL}"
AUTH_PASSWORD="${ANALYST_PASSWORD}"

# Validate credentials are set
if [ -z "$AUTH_EMAIL" ] || [ -z "$AUTH_PASSWORD" ]; then
  echo -e "${RED}❌ Error: ANALYST_EMAIL and ANALYST_PASSWORD must be set in .env.local${NC}"
  exit 1
fi

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

# Configuration
CONTAINER_NAME="mcp-team-a"
KILL_DELAY=10  # seconds before killing the container
RESTART_DELAY=15  # seconds before restarting the container

# Start load generator in the background
echo -e "${BLUE}📊 Starting load generator...${NC}"
while true; do
  curl -s -X POST ${API_URL}/mcp/tools/query_database \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"arguments": {"query": "SELECT * FROM analytics"}}' \
    | jq -r '.result.status // .error' 
  sleep 0.5
done &

LOAD_GEN_PID=$!
echo -e "${YELLOW}Load generator started (PID: $LOAD_GEN_PID)${NC}"
echo ""

# Schedule container kill after delay
sleep $KILL_DELAY
echo -e "${RED}💥 KILLING CONTAINER: $CONTAINER_NAME${NC}"
docker kill $CONTAINER_NAME

echo -e "${RED}Container killed. Observe the load generator output above...${NC}"
echo -e "${YELLOW}Waiting $RESTART_DELAY seconds before restart...${NC}"
sleep $RESTART_DELAY

echo -e "${GREEN}🔄 RESTARTING CONTAINER: $CONTAINER_NAME${NC}"
docker start $CONTAINER_NAME

echo -e "${GREEN}✅ Container restarted. Monitor circuit breaker recovery...${NC}"
echo -e "${YELLOW}Dashboard: Circuit Breaker page should show transition from OPEN → HALF_OPEN → CLOSED${NC}"
echo ""

# Keep monitoring for another 30 seconds
sleep 30
echo -e "${BLUE}Test complete. Killing load generator...${NC}"
kill $LOAD_GEN_PID 2>/dev/null || true

echo -e "${GREEN}✅ Chaos test finished${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo -e "  1. Kill delay: ${KILL_DELAY}s"
echo -e "  2. Restart delay: ${RESTART_DELAY}s"
echo -e "  3. Container: $CONTAINER_NAME"
echo -e "  4. Check Dashboard → Circuit Breaker for state transitions"