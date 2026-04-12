#!/bin/bash

# ============================================
# Chaos Engineering - Cascading Failure Test
# ============================================
# Demonstrates how system handles when multiple
# services fail in sequence (cascading failures)

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
  exit 1
fi

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
AUTH_EMAIL="${ANALYST_EMAIL}"
AUTH_PASSWORD="${ANALYST_PASSWORD}"

# Validate credentials
if [ -z "$AUTH_EMAIL" ] || [ -z "$AUTH_PASSWORD" ]; then
  echo -e "${RED}❌ Error: ANALYST_EMAIL and ANALYST_PASSWORD must be set in .env.local${NC}"
  exit 1
fi

echo -e "${BLUE}🔐 Getting authentication token...${NC}"

# Get token
TOKEN_RESPONSE=$(curl -s -X POST ${API_URL}/auth/token \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${AUTH_EMAIL}\",\"password\":\"${AUTH_PASSWORD}\"}")

TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to obtain authentication token${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Token obtained${NC}"
export TOKEN

# Configuration
SERVERS=("mcp-team-a" "mcp-team-b" "mcp-team-c")
REQUEST_RATE=0.3  # seconds between requests

echo ""
echo -e "${BLUE}🎯 Cascading Failure Scenario${NC}"
echo "This test demonstrates what happens when multiple services fail sequentially"
echo ""

# Start load generator in background
echo -e "${BLUE}📊 Starting continuous load generator...${NC}"
REQUEST_COUNT=0
while true; do
  curl -s -X POST ${API_URL}/mcp/tools/query_database \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"arguments": {"query": "SELECT * FROM analytics"}}' > /dev/null
  REQUEST_COUNT=$((REQUEST_COUNT + 1))
  echo -e "${BLUE}[Request #$REQUEST_COUNT]${NC}"
  sleep $REQUEST_RATE
done &

LOAD_GEN_PID=$!
echo -e "${YELLOW}Load generator running (PID: $LOAD_GEN_PID)${NC}"
sleep 3

# Phase 1: Kill first server
echo ""
echo -e "${RED}═══════════════════════════════════════${NC}"
echo -e "${RED}PHASE 1: Kill Team A - Circuit opens${NC}"
echo -e "${RED}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}Traffic reroutes to Team B and Team C${NC}"
sleep 2
docker kill ${SERVERS[0]}
echo -e "${RED}💥 ${SERVERS[0]} KILLED${NC}"
sleep 5

# Phase 2: Kill second server
echo ""
echo -e "${RED}═══════════════════════════════════════${NC}"
echo -e "${RED}PHASE 2: Kill Team B - Another opens${NC}"
echo -e "${RED}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}All traffic now → Team C only${NC}"
sleep 2
docker kill ${SERVERS[1]}
echo -e "${RED}💥 ${SERVERS[1]} KILLED${NC}"
sleep 5

# Phase 3: Monitor cascading failure impact
echo ""
echo -e "${YELLOW}⚠️  CASCADING STATE:${NC}"
echo -e "  Circuit: ${SERVERS[0]} OPEN (failed)"
echo -e "  Circuit: ${SERVERS[1]} OPEN (failed)"
echo -e "  Circuit: ${SERVERS[2]} CLOSED (taking all traffic)"
echo -e "  Status: Requests still succeeding (routed to Team C)"
sleep 8

# Phase 4: Recovery - restart servers
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}PHASE 4: Recovery - Restart servers${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"

echo -e "${YELLOW}Restarting ${SERVERS[0]}...${NC}"
docker start ${SERVERS[0]}
sleep 5

echo -e "${YELLOW}Restarting ${SERVERS[1]}...${NC}"
docker start ${SERVERS[1]}
sleep 10

echo ""
echo -e "${GREEN}✅ Cascading failure test complete!${NC}"
echo -e "${YELLOW}Expected behavior:${NC}"
echo -e "  1. Phase 1: Team A fails → Circuit OPEN"
echo -e "  2. Phase 2: Team B fails → Both circuits OPEN"
echo -e "  3. Phase 3: Team C handles all traffic"
echo -e "  4. Phase 4: Recovery in progress (HALF_OPEN)"
echo -e "  5. All servers healthy: Circuits CLOSED"
echo ""
echo -e "${BLUE}Check Dashboard → Circuit Breaker page to see state transitions${NC}"
echo ""

# Cleanup
sleep 3
kill $LOAD_GEN_PID 2>/dev/null || true
echo -e "${GREEN}Test finished${NC}"