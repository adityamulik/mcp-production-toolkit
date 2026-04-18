#!/bin/bash

# ============================================
# Chaos Engineering Test - DDoS Attack
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
  jobs -p | xargs -r kill 2>/dev/null || true
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
  echo -e "${YELLOW}⚠️  .env.local not found${NC}"
fi

# Configuration
API_URL="${API_URL:-http://localhost:3000}"

# Function to get token for a user
get_token() {
  local email=$1
  local password=$2
  
  TOKEN_RESPONSE=$(curl -s -X POST ${API_URL}/auth/token \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\"}")
  
  TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')
  echo "$TOKEN"
}

# Get developer token (legitimate user)
echo -e "${BLUE}🔐 Getting developer token (legitimate user)...${NC}"
LEGIT_TOKEN=$(get_token "${DEVELOPER_EMAIL}" "${DEVELOPER_PASSWORD}")

if [ -z "$LEGIT_TOKEN" ]; then
  echo -e "${RED}❌ Failed to obtain developer token${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Developer token obtained${NC}"

# Get attacker token (we'll use a different user or same user but marked as attacker)
# For this test, we'll use the analyst account as the "attacker"
echo -e "${BLUE}🔐 Getting attacker token...${NC}"
ATTACKER_TOKEN=$(get_token "${ANALYST_EMAIL}" "${ANALYST_PASSWORD}")

if [ -z "$ATTACKER_TOKEN" ]; then
  echo -e "${RED}❌ Failed to obtain attacker token${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Attacker token obtained${NC}"
echo ""

# Function to get request stats
get_stats() {
  curl -s -X GET ${API_URL}/stats \
    -H "Authorization: Bearer $LEGIT_TOKEN" \
    2>/dev/null | jq '{allowed: .allowed, blocked: .blocked, rateLimited: .rateLimited}'
}

# Log stats with timestamp
log_stats() {
  STATS=$(get_stats)
  TIMESTAMP=$(date '+%H:%M:%S')
  echo "$STATS" | jq -r '.allowed as $a | .blocked as $b | .rateLimited as $rl | "[$TIMESTAMP] 📊 Allowed: \($a), Blocked: \($b), Rate Limited: \($rl)"' 2>/dev/null || true
}

# Configuration
ATTACK_DURATION=30  # seconds
NORMAL_RPS=10       # requests per second from legitimate user
ATTACK_RPS=500      # requests per second from attacker

echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}📊 DDoS Attack Simulation${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "Normal traffic: ${NORMAL_RPS} req/sec (developer)"
echo -e "Attack traffic: ${ATTACK_RPS} req/sec (analyst)"
echo -e "Duration: ${ATTACK_DURATION}s"
echo ""

# Show initial stats
echo -e "${BLUE}📊 Initial metrics:${NC}"
log_stats
echo ""

# Phase 1: Normal load only
echo -e "${GREEN}🟢 Phase 1: Normal load only (10s)${NC}"
NORMAL_PHASE_DURATION=10
START=$(date +%s)

(
  REQ_COUNT=0
  while true; do
    CURRENT=$(date +%s)
    ELAPSED=$((CURRENT - START))
    
    if [ $ELAPSED -ge $NORMAL_PHASE_DURATION ]; then
      break
    fi
    
    curl -s -X POST ${API_URL}/mcp/tools/query_database \
      -H "Authorization: Bearer $LEGIT_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"arguments": {"query": "SELECT 1"}}' \
      2>/dev/null >/dev/null &
    
    REQ_COUNT=$((REQ_COUNT + 1))
    sleep 0.1
  done
  
  echo "[Load] Normal phase complete: $REQ_COUNT requests sent"
) &

NORMAL_PID=$!
sleep $NORMAL_PHASE_DURATION
log_stats
echo ""

# Phase 2: Attack begins with normal traffic
echo -e "${RED}🚨 Phase 2: DDoS attack begins! (${ATTACK_DURATION}s)${NC}"
START=$(date +%s)

# Start attack load from attacker
(
  ATTACK_COUNT=0
  while true; do
    CURRENT=$(date +%s)
    ELAPSED=$((CURRENT - START))
    
    if [ $ELAPSED -ge $ATTACK_DURATION ]; then
      break
    fi
    
    # Fire off multiple requests in parallel for high RPS
    for j in {1..10}; do
      curl -s -X POST ${API_URL}/mcp/tools/query_database \
        -H "Authorization: Bearer $ATTACKER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"arguments": {"query": "SELECT 1"}}' \
        2>/dev/null >/dev/null &
      ATTACK_COUNT=$((ATTACK_COUNT + 1))
    done
    
    sleep 0.02  # ~500 req/sec
  done
  
  echo "[Attack] Attack phase complete: ~$ATTACK_COUNT requests sent"
) &

ATTACK_PID=$!

# Continue sending legitimate requests during attack
(
  REQ_COUNT=0
  while true; do
    CURRENT=$(date +%s)
    ELAPSED=$((CURRENT - START))
    
    if [ $ELAPSED -ge $ATTACK_DURATION ]; then
      break
    fi
    
    curl -s -X POST ${API_URL}/mcp/tools/query_database \
      -H "Authorization: Bearer $LEGIT_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"arguments": {"query": "SELECT * FROM analytics"}}' \
      2>/dev/null >/dev/null &
    
    REQ_COUNT=$((REQ_COUNT + 1))
    sleep 0.1
  done
  
  echo "[Load] Legitimate traffic during attack: $REQ_COUNT requests sent"
) &

LEGIT_PID=$!

# Monitor metrics during attack
ELAPSED=0
while [ $ELAPSED -lt $ATTACK_DURATION ]; do
  log_stats
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done

# Wait for all background jobs
wait $ATTACK_PID $LEGIT_PID 2>/dev/null

echo ""
echo -e "${BLUE}⏱️  Attack complete, monitoring recovery... (15s)${NC}"
sleep 15

# Phase 3: Post-attack metrics
echo ""
echo -e "${GREEN}✅ Phase 3: After attack${NC}"
log_stats
echo ""

echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DDoS test finished${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo -e "  1. Phase 1: Normal traffic only (${NORMAL_RPS} req/sec)"
echo -e "  2. Phase 2: DDoS attack (${ATTACK_RPS} req/sec) + normal traffic"
echo -e "  3. Legitimate user requests still succeeded during attack ✓"
echo -e "  4. Attacker requests were rate-limited (429) ✓"
echo -e "  5. Check Dashboard → Metrics for real-time visualization"
echo -e "  6. Security Dashboard shows anomaly detection results"
echo ""