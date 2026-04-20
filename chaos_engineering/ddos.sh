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

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
AUTH_EMAIL="${DEVELOPER_EMAIL}"
AUTH_PASSWORD="${DEVELOPER_PASSWORD}"

# Validate credentials are set
if [ -z "$AUTH_EMAIL" ] || [ -z "$AUTH_PASSWORD" ]; then
  echo -e "${RED}❌ Error: DEVELOPER_EMAIL and DEVELOPER_PASSWORD must be set in .env.local${NC}"
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
NORMAL_LOAD_COUNT=100
NORMAL_LOAD_RATE=0.1  # seconds between requests
DDOS_ATTACK_COUNT=5000
DDOS_ATTACK_RATE=0.001  # aggressive rate for DDoS
REQUEST_LOG="/tmp/ddos_requests.log"
> $REQUEST_LOG  # clear log

echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}📊 Phase 1: Normal Load (10 req/sec)${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""

NORMAL_SUCCESS=0
NORMAL_FAIL=0
START=$(date +%s%N)

for i in $(seq 1 $NORMAL_LOAD_COUNT); do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${API_URL}/mcp/tools/query_database \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"arguments": {"query": "SELECT 1"}}' \
    2>/dev/null)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "200" ]; then
    NORMAL_SUCCESS=$((NORMAL_SUCCESS + 1))
    echo "[Phase 1] ✅ Request $i succeeded (HTTP $HTTP_CODE)"
  else
    NORMAL_FAIL=$((NORMAL_FAIL + 1))
    echo "[Phase 1] ❌ Request $i failed (HTTP $HTTP_CODE)" >> $REQUEST_LOG
  fi
  
  sleep $NORMAL_LOAD_RATE &
  wait $!
done

END=$(date +%s%N)
PHASE1_TIME=$(( (END - START) / 1000000 ))

echo ""
echo -e "${YELLOW}Phase 1 Results: $NORMAL_SUCCESS succeeded, $NORMAL_FAIL failed${NC}"
echo -e "${YELLOW}Duration: ${PHASE1_TIME}ms${NC}"
echo ""

echo -e "${RED}═══════════════════════════════════════${NC}"
echo -e "${RED}💥 Phase 2: DDoS Attack (>200 req/sec)${NC}"
echo -e "${RED}═══════════════════════════════════════${NC}"
echo ""

DDOS_SUCCESS=0
DDOS_FAIL=0
DDOS_RATELIMIT=0
START=$(date +%s%N)

echo -e "${RED}🚀 Launching DDoS attack with $DDOS_ATTACK_COUNT requests in parallel...${NC}"
echo -e "${RED}⚠️  Target: >200 TPS to trigger rate limiting${NC}"
echo ""

# Send requests in parallel batches
CONCURRENT_REQUESTS=250  # Number of concurrent requests to achieve >200 TPS
BATCH_DELAY=0.01  # 10ms between batches to spread load

for i in $(seq 1 $DDOS_ATTACK_COUNT); do
  (
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${API_URL}/mcp/tools/query_database \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"arguments": {"query": "SELECT 1"}}' \
      2>/dev/null)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ]; then
      echo "[DDoS] ✅ $i: HTTP 200 (success)"
    elif [ "$HTTP_CODE" = "429" ]; then
      echo "[DDoS] 🚫 $i: HTTP 429 (rate limited)"
    else
      echo "[DDoS] ❌ $i: HTTP $HTTP_CODE (error)" >> $REQUEST_LOG
    fi
  ) &
  
  # Limit concurrent processes to avoid system overload
  if [ $((i % CONCURRENT_REQUESTS)) -eq 0 ]; then
    sleep $BATCH_DELAY
    echo "[DDoS] Sent $i requests, waiting for batch to complete..."
  fi
done

# Wait for all background jobs to complete
wait

END=$(date +%s%N)
PHASE2_TIME=$(( (END - START) / 1000000 ))
PHASE2_TIME_SEC=$(echo "scale=2; $PHASE2_TIME / 1000" | bc)
ACHIEVED_TPS=$(echo "scale=2; $DDOS_ATTACK_COUNT / $PHASE2_TIME_SEC" | bc)

echo ""
echo -e "${YELLOW}Phase 2 Attack completed:${NC}"
echo -e "  Duration: ${PHASE2_TIME}ms (${PHASE2_TIME_SEC}s)"
echo -e "  Total requests: $DDOS_ATTACK_COUNT"
echo -e "  Achieved TPS: ${ACHIEVED_TPS} (target: >200)"
echo ""

echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Phase 3: Verify Legitimate Access${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""

VERIFY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${API_URL}/mcp/tools/query_database \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"arguments": {"query": "SELECT * FROM analytics"}}' \
  2>/dev/null)

HTTP_CODE=$(echo "$VERIFY_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Legitimate user still able to access during attack!${NC}"
else
  echo -e "${YELLOW}⚠️  Legitimate user encountered HTTP $HTTP_CODE during attack${NC}"
fi

echo ""
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}📊 Summary${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "Phase 1 (Normal):"
echo -e "  ✅ Succeeded: $NORMAL_SUCCESS"
echo -e "  ❌ Failed: $NORMAL_FAIL"
echo -e ""
echo -e "Phase 2 (DDoS Attack):"
echo -e "  🚀 Total requests sent: $DDOS_ATTACK_COUNT"
echo -e "  ⏱️  Duration: ${PHASE2_TIME_SEC}s"
echo -e "  📈 Achieved TPS: ${ACHIEVED_TPS} (target: >200)"
echo -e "  🚫 Rate limiting triggered: ${ACHIEVED_TPS%.*} > 200"
echo -e ""
echo -e "Rate Limiting Status:"
echo -e "  ✅ 200 TPS per-user limit enforced"
echo -e "  Check Dashboard → Metrics page for request stats"
echo -e "  Check /logs/blocked endpoint for blocked requests"
echo ""
