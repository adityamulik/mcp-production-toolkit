# Start continuous load
./load-test.sh 50  # 50 req/sec

# Dashboard shows: All 3 servers healthy, traffic distributed

# Kill server 1
docker kill mcp-server-1
# Circuit opens, traffic → servers 2 & 3

# Overload server 2 (inject high CPU usage)
docker exec mcp-server-2 stress --cpu 4 --timeout 30s
# Server 2 becomes slow, circuit opens

# Now all traffic → server 3
# Server 3 handles it (auto-scaled or just survives)

# Dashboard shows cascade:
# 🔴 Server 1: OPEN (crashed)
# 🔴 Server 2: OPEN (overloaded)
# 🟢 Server 3: CLOSED (handling all traffic)
# ✅ 0% error rate (no requests failed)

# Restart servers
docker start mcp-server-1 mcp-server-2

# Circuits close gradually, traffic redistributes