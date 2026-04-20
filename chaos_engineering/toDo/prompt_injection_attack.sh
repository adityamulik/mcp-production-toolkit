# Terminal 1: Dashboard (watch it light up)
open http://localhost:5173

# Terminal 2: Start continuous legitimate traffic (baseline)
while true; do
  curl -s -X POST http://localhost:3000/mcp/tools/query_database \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"arguments": {"query": "SELECT * FROM analytics"}}' \
    > /dev/null
  sleep 2
done

# Terminal 3: Launch red team attack
npm run red-team-attack

# Output:
# 🔴 RED TEAM ATTACK SIMULATION
# Testing 30 attack patterns...
# [1/30] Testing: ignore_previous_simple      
# [2/30] Testing: ignore_previous_sophisticated
# ...
# [30/30] Testing: adversarial_suffix         

# 📊 ATTACK SIMULATION RESULTS
# ============================================================
# Total Attacks:     30
# Blocked:           29 (96.7%)
# Bypassed:          1 (3.3%)
# ============================================================

# BLOCK RATE BY SEVERITY:
# LOW        3/3 (100.0%)
# MEDIUM     8/8 (100.0%)
# HIGH       11/12 (91.7%)
# CRITICAL   7/7 (100.0%)

# DETECTION BY LAYER:
# pattern    18 attacks
# entropy    5 attacks
# intent     4 attacks
# llm        2 attacks

# AVG LATENCY:       47ms

# ✅ ALL CRITICAL ATTACKS BLOCKED

# Dashboard shows real-time:
# - Attack heatmap lighting up
# - Detection layer breakdown updating
# - Live feed scrolling with blocked attempts
# - 96.7% block rate displayed prominently