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

# Function to check circuit breaker state for Team A
check_circuit_breaker() {
  CIRCUIT_STATE=$(curl -s -X GET ${API_URL}/health/circuit \
    -H "Authorization: Bearer $TOKEN" \
    2>/dev/null | jq -r '.teamCircuitBreakers.a.state // "unknown"')
  echo "$CIRCUIT_STATE"
}

# Function to get detailed circuit breaker metrics
get_circuit_breaker_details() {
  curl -s -X GET ${API_URL}/health/circuit \
    -H "Authorization: Bearer $TOKEN" \
    2>/dev/null | jq '.teamCircuitBreakers.a // {}'
}

# Log circuit breaker state with timestamp
log_cb_state() {
  STATE=$(check_circuit_breaker)
  DETAILS=$(get_circuit_breaker_details)
  TIMESTAMP=$(date '+%H:%M:%S')
  echo -e "${BLUE}[$TIMESTAMP] 🔌 Circuit Breaker State: ${YELLOW}$STATE${NC}"
  echo "$DETAILS" | jq -r '.failureCount as $f | .recentFailures as $r | "  └─ Failures: \($f), Recent (60s): \($r)"' 2>/dev/null || true
}

# Function to call generate_report tool from Team A
call_generate_report() {
  local report_type="${1:-daily}"
  local format="${2:-json}"
  curl -s -w "\n%{http_code}" -X POST ${API_URL}/mcp/tools/generate_report \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"arguments\": {\"report_type\": \"${report_type}\", \"format\": \"${format}\"}}" \
    2>/dev/null
}

# Function to get request stats
get_request_stats() {
  curl -s -X GET ${API_URL}/stats \
    -H "Authorization: Bearer $TOKEN" \
    2>/dev/null | jq '{allowed: .allowed, blocked: .blocked, anomalies: .anomalies}'
}

# Log request stats
log_request_stats() {
  STATS=$(get_request_stats)
  TIMESTAMP=$(date '+%H:%M:%S')
  echo "$STATS" | jq -r '.allowed as $a | .blocked as $b | .anomalies as $an | "[$TIMESTAMP] 📊 Requests - Success: \($a), Blocked: \($b), Anomalies: \($an)"' 2>/dev/null || true
}

# Configuration
CONTAINER_NAME="mcp-team-a"
KILL_DELAY=5   # seconds before killing the container
RESTART_DELAY=10  # seconds before restarting the container
TEST_DURATION=40  # total test duration

# Check initial circuit breaker state
echo ""
echo -e "${BLUE}📊 Checking initial Circuit Breaker state...${NC}"
log_cb_state
echo ""

# Start load generator in the background
echo -e "${BLUE}📊 Starting aggressive load generator (will continue entire test)...${NC}"
(
  REQS=0
  FAILS=0
  TOTAL_DURATION=60
  START=$(date +%s)
  
  while true; do
    CURRENT=$(date +%s)
    ELAPSED=$((CURRENT - START))
    
    if [ $ELAPSED -ge $TOTAL_DURATION ]; then
      echo "[Load Gen] ✅ Generation stopped. Total: $REQS requests, $FAILS failures"
      break
    fi
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST ${API_URL}/mcp/tools/generate_report \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"arguments": {"report_type": "daily", "format": "json"}}' \
      2>/dev/null)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "503" ] || [ "$HTTP_CODE" = "504" ]; then
      REQS=$((REQS + 1))
      if [ "$HTTP_CODE" != "200" ]; then
        FAILS=$((FAILS + 1))
        echo "[Load Gen] ❌ Request #$REQS failed (HTTP $HTTP_CODE)"
      fi
    else
      FAILS=$((FAILS + 1))
      REQS=$((REQS + 1))
      echo "[Load Gen] ❌ Request #$REQS failed (HTTP $HTTP_CODE)"
    fi
    
    sleep 0.2
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
echo -e "${YELLOW}📊 Pre-shutdown metrics:${NC}"
log_cb_state
log_request_stats
echo ""

docker kill $CONTAINER_NAME 2>/dev/null
echo -e "${RED}✅ Container killed${NC}"

echo -e "${RED}Container killed. Monitoring circuit breaker transitions...${NC}"
echo ""

# Monitor circuit breaker state transitions during failure window
FAILURE_WINDOW=$((RESTART_DELAY + 5))
ELAPSED=0
PREV_STATE=""
OPEN_TIME=0
OPEN_LOGGED=false

echo -e "${YELLOW}⏱️  Monitoring Circuit Breaker for ${RESTART_DELAY}s...${NC}"
while [ $ELAPSED -lt $FAILURE_WINDOW ]; do
  STATE=$(check_circuit_breaker)
  
  # Log state changes
  if [ "$STATE" != "$PREV_STATE" ]; then
    if [ "$STATE" = "open" ] && [ "$OPEN_LOGGED" = false ]; then
      echo -e "${RED}🚨 [FAILURE DETECTED] Circuit Breaker OPENED!${NC}"
      log_cb_state
      OPEN_TIME=$ELAPSED
      OPEN_LOGGED=true
    elif [ "$STATE" = "half_open" ] && [ "$PREV_STATE" = "open" ]; then
      echo -e "${YELLOW}⚡ Circuit Breaker transitioning to HALF_OPEN (recovery attempt)${NC}"
      log_cb_state
    elif [ "$STATE" = "closed" ] && [ "$PREV_STATE" = "half_open" ]; then
      echo -e "${GREEN}✅ Circuit Breaker CLOSED (recovered!)${NC}"
      log_cb_state
    fi
    PREV_STATE="$STATE"
  fi
  
  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

echo ""
if [ "$OPEN_LOGGED" = true ]; then
  echo -e "${GREEN}✅ Circuit Breaker successfully detected failure and opened${NC}"
else
  echo -e "${YELLOW}⚠️  Circuit Breaker did not open (may already be in different state)${NC}"
fi

echo -e "${YELLOW}Waiting ${RESTART_DELAY}s before restart...${NC}"

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}🔄 RESTARTING CONTAINER: $CONTAINER_NAME${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}📊 Pre-restart metrics:${NC}"
log_cb_state
log_request_stats
echo ""

docker start $CONTAINER_NAME 2>/dev/null
echo -e "${GREEN}✅ Container restarted${NC}"

echo -e "${GREEN}✅ Container restarted. Monitoring circuit breaker recovery...${NC}"
echo ""

# Monitor recovery
RECOVERY_WINDOW=20
ELAPSED=0
RECOVERED=false

echo -e "${BLUE}⏱️  Monitoring recovery for ${RECOVERY_WINDOW}s...${NC}"
while [ $ELAPSED -lt $RECOVERY_WINDOW ]; do
  STATE=$(check_circuit_breaker)
  log_cb_state
  log_request_stats
  
  if [ "$STATE" = "closed" ] && [ "$RECOVERED" = false ]; then
    echo -e "${GREEN}🎉 Circuit Breaker CLOSED - Full Recovery Complete!${NC}"
    RECOVERED=true
  elif [ "$STATE" = "half_open" ]; then
    echo -e "${YELLOW}⚡ Circuit Breaker in HALF_OPEN state (health check in progress)${NC}"
  fi
  
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

echo ""
if [ "$RECOVERED" = true ]; then
  echo -e "${GREEN}✅ Circuit Breaker fully recovered and service is operational${NC}"
else
  echo -e "${YELLOW}⚠️  Circuit Breaker did not return to CLOSED state within timeout${NC}"
fi

log_cb_state
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Chaos test finished${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Summary:${NC}"
echo -e "  1. Kill delay: ${KILL_DELAY}s"
echo -e "  2. Restart delay: ${RESTART_DELAY}s"
echo -e "  3. Container: $CONTAINER_NAME"
echo -e "  4. Tool tested: generate_report (Team A analytics)"
echo -e "  5. ✅ Circuit Breaker State Transitions Monitored:"
echo -e "     └─ CLOSED → OPEN (failure detection)"
echo -e "     └─ OPEN → HALF_OPEN (recovery attempt)"
echo -e "     └─ HALF_OPEN → CLOSED (full recovery)"
echo -e "  6. Check Dashboard → Metrics page for detailed metrics"
echo -e "  7. All state changes logged above with timestamps"
echo ""