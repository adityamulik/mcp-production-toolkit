# Start requests with latency tracking
# Load environment variables from .env.local
ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env.local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
echo ""

# Export token for use in subshells
export TOKEN

echo -e "${BLUE}📊 Starting latency tracking...${NC}"
while true; do
  START=$(date +%s%3N)
  
  curl -s -X POST ${API_URL}/mcp/tools/query_database \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"arguments": {"query": "SELECT * FROM analytics"}}'
  
  END=$(date +%s%3N)
  LATENCY=$((END - START))
  echo "Latency: ${LATENCY}ms"
  
  sleep 0.5
done

# Output: "Latency: 52ms" "Latency: 48ms" ...

# Inject latency in server 1
docker exec mcp-database-server-1 \
  bash -c "export INJECT_LATENCY=true LATENCY_MS=2000"

# Output changes:
# "Latency: 51ms" (hit server 2)
# "Latency: 2103ms" (hit server 1, slow!)
# "[RETRY] Timeout, retrying..."
# "Latency: 49ms" (retry hit server 2, fast)

# Dashboard shows:
# 🟡 High latency detected: database-mcp-1 (2.1s)
# 🔄 Retry triggered: Request rerouted
# ⚡ P99 latency: 53ms (acceptable despite one slow server)