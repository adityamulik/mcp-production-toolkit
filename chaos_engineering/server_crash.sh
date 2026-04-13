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

# Cleanup function - runs on exit
cleanup() {
  echo ""
  echo -e "${BLUE}🧹 Cleaning up...${NC}"
  if [ ! -z "$LOAD_GEN_PID" ] && kill -0 $LOAD_GEN_PID 2>/dev/null; then
    echo -e "${YELLOW}Killing load generator (PID: $LOAD_GEN_PID)...${NC}"
    kill -SIGTERM $LOAD_GEN_PID 2>/dev/null
    sleep 1
    kill -SIGKILL $LOAD_GEN_PID 2>/dev/null || true
  fi
  echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Set trap to run cleanup on exit
trap cleanup EXIT

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
KILL_DELAY=5   # seconds before killing the container
RESTART_DELAY=10  # seconds before restarting the container
TEST_DURATION=40  # total test duration

# Start load generator in the background
echo -e "${BLUE}📊 Starting load generator...${NC}"
(
  COUNT=0
  while [ $COUNT -lt 100 ]; do
    curl -s -X POST ${API_URL}/mcp/tools/query_database \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"arguments": {"query": "SELECT * FROM analytics"}}' \
      2>/dev/null | jq -r '.result.status // .error // "OK"' 
    COUNT=$((COUNT + 1))
    sleep 0.3
  done
) &

LOAD_GEN_PID=$!
echo -e "${YELLOW}Load generator started (PID: $LOAD_GEN_PID)${NC}"
echo ""

# Schedule container kill after delay
echo -e "${BLUE}⏱️  Waiting ${KILL_DELAY}s before killing container...${NC}"
sleep $KILL_DELAY

echo ""
echo -e "${RED}═══════════════════════════════════════${NC}"
echo -e "${RED}💥 KILLING CONTAINER: $CONTAINER_NAME${NC}"
echo -e "${RED}═══════════════════════════════════════${NC}"
docker kill $CONTAINER_NAME 2>/dev/null

echo -e "${RED}Container killed. Observe request failures...${NC}"
echo -e "${YELLOW}Waiting ${RESTART_DELAY}s before restart...${NC}"
sleep $RESTART_DELAY

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}🔄 RESTARTING CONTAINER: $CONTAINER_NAME${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
docker start $CONTAINER_NAME 2>/dev/null

echo -e "${GREEN}✅ Container restarted. Monitoring recovery...${NC}"
echo ""

# Keep monitoring for remaining duration
REMAINING=$((TEST_DURATION - KILL_DELAY - RESTART_DELAY - 5))
if [ $REMAINING -gt 0 ]; then
  echo -e "${YELLOW}Monitoring for ${REMAINING}s...${NC}"
  sleep $REMAINING
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Chaos test finished${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo -e "  1. Kill delay: ${KILL_DELAY}s"
echo -e "  2. Restart delay: ${RESTART_DELAY}s"
echo -e "  3. Container: $CONTAINER_NAME"
echo -e "  4. Check Dashboard → Metrics page for Circuit Breaker state transitions"
echo -e "  5. Expected: CLOSED → OPEN (after failures) → HALF_OPEN → CLOSED (recovery)"
echo ""