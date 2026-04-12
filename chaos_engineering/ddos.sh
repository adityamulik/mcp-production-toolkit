# Normal load (10 req/sec)
for i in {1..100}; do
  curl -s -X POST http://localhost:3000/mcp/tools/query_database \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"arguments": {"query": "SELECT 1"}}' &
  sleep 0.1
done

# All succeed

# DDoS attack (500 req/sec)
for i in {1..5000}; do
  curl -s -X POST http://localhost:3000/mcp/tools/query_database \
    -H "Authorization: Bearer $ATTACKER_TOKEN" \
    -d '{"arguments": {"query": "SELECT 1"}}' &
done

# First 100 succeed, rest get 429 Too Many Requests

# Legitimate user during attack
curl -X POST http://localhost:3000/mcp/tools/query_database \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"arguments": {"query": "SELECT * FROM analytics"}}'

# Still works! (separate rate limit bucket)

# Dashboard shows:
# 🔴 4,900 requests rate limited
# 🟢 100 requests succeeded (legitimate users)
# 📊 Rate limit buckets: attacker (0 tokens), legit user (95 tokens)