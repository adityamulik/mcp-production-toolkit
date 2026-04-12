# Docker Setup for MCP Production Toolkit

Complete Docker containerization for the entire MCP Production Toolkit stack.

## Quick Start

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- At least 2GB of free disk space
- Ports available: 3000, 5173, 8001, 8002, 8003

### Start Everything in One Command

```bash
# Using the helper script (recommended)
./docker-run.sh up

# Or use docker-compose directly
docker-compose up -d
```

That's it! All services will be running:

| Service | URL | Purpose |
|---------|-----|---------|
| **Gateway** | http://localhost:3000 | MCP security proxy & routing |
| **Dashboard** | http://localhost:5173 | React UI for monitoring |
| **Team A** | http://localhost:8001 | Analytics MCP server |
| **Team B** | http://localhost:8002 | DevOps MCP server |
| **Team C** | http://localhost:8003 | Developer MCP server |

### Access Dashboard

1. Open browser: **http://localhost:5173**
2. Login with credentials:
   - **Username:** `developer`
   - **Password:** `dev123`
3. Other available credentials:
   - `admin` / `admin123`
   - `analyst` / `analyst123`
   - `deployer` / `deploy123`

## Docker Compose Helper Script

The `docker-run.sh` script provides convenient commands:

```bash
# Start all services
./docker-run.sh up

# View logs (real-time)
./docker-run.sh logs
./docker-run.sh logs-gateway
./docker-run.sh logs-dashboard
./docker-run.sh logs-team-a
./docker-run.sh logs-team-b
./docker-run.sh logs-team-c

# Show service status
./docker-run.sh ps

# Restart services
./docker-run.sh restart

# Build images
./docker-run.sh build
./docker-run.sh build-gateway
./docker-run.sh build-dashboard
./docker-run.sh build-mcp

# Open container shell
./docker-run.sh shell-gateway
./docker-run.sh shell-dashboard
./docker-run.sh shell-team-a

# Test all services
./docker-run.sh test

# Show help
./docker-run.sh help

# Stop everything
./docker-run.sh down
```

## Manual Docker Compose Commands

```bash
# Start all services in background
docker-compose up -d

# View logs from all services (real-time)
docker-compose logs -f

# View logs from specific service
docker-compose logs -f gateway
docker-compose logs -f dashboard

# Show status of all services
docker-compose ps

# Stop all services
docker-compose stop

# Stop and remove all containers
docker-compose down

# Rebuild images
docker-compose build

# Rebuild specific service
docker-compose build gateway

# Restart all services
docker-compose restart

# Execute command in running container
docker-compose exec gateway sh
docker-compose exec dashboard sh
```

## Architecture

### Services

**Gateway (TypeScript/Node.js)**
- Port: 3000
- Dockerfile: `Dockerfile.gateway`
- Built from source, TypeScript compiled to JavaScript
- Handles authentication, routing, security policies
- Routes requests to team-specific MCP servers
- Provides metrics and security event streaming

**Dashboard (React/TypeScript/Vite)**
- Port: 5173
- Dockerfile: `Dockerfile.dashboard`
- Built as static site, served by `serve`
- Real-time monitoring of gateway, teams, and requests
- Uses SSE for live updates

**Team Servers (Python/FastMCP)**
- Ports: 8001 (Team A), 8002 (Team B), 8003 (Team C)
- Dockerfile: `Dockerfile.mcp`
- Single Dockerfile with TEAM environment variable
- Each team gets dedicated instance
- HTTP bridges expose tool endpoints

### Networking

All services communicate via Docker bridge network `mcp-network`:
- Gateway connects to team servers using service names (not localhost)
- Gateway detects Docker environment via `IN_DOCKER=true` env var
- Dashboard connects to gateway using service name

### Health Checks

Each service includes health checks:
- Gateway: Checks `/metrics` endpoint
- Dashboard: Checks root `/` endpoint
- Team servers: Check `/health` endpoint
- Gateway depends on teams (waits for them to be healthy)
- Dashboard depends on gateway (waits for it to be healthy)

## Docker Images

### Building Images

```bash
# Build all images
docker-compose build

# Build specific images
docker-compose build gateway
docker-compose build dashboard
docker-compose build team-a team-b team-c
```

### Image Details

| Image | Base | Size | BuildTime |
|-------|------|------|-----------|
| Gateway | `node:20-alpine` | ~300MB | ~30s |
| Dashboard | `node:20-alpine` | ~250MB | ~25s |
| MCP servers | `python:3.11-slim` | ~200MB | ~20s |

### Pushing to Registry

```bash
# Tag images
docker tag mcp-production-toolkit-gateway myregistry/mcp-gateway:1.0
docker tag mcp-production-toolkit-dashboard myregistry/mcp-dashboard:1.0
docker tag mcp-production-toolkit-team-a myregistry/mcp-team-a:1.0

# Push to registry
docker push myregistry/mcp-gateway:1.0
docker push myregistry/mcp-dashboard:1.0
docker push myregistry/mcp-team-a:1.0
```

## Environment Variables

### Gateway
- `IN_DOCKER`: Set to `true` to use Docker service names instead of localhost
- `NODE_ENV`: Set to `production`

### MCP Servers
- `TEAM`: Set to `A`, `B`, or `C` to specify which team to run
- `MCP_PORT`: Port number (8001, 8002, 8003)
- `MCP_HOST`: Host to bind to (defaults to 0.0.0.0 for Docker)

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find and kill processes on specific ports
lsof -i :3000      # Find gateway port
lsof -i :5173      # Find dashboard port
lsof -i :8001      # Find Team A port

# Or adjust docker-compose.yml port mappings
# Change "3000:3000" to "3001:3000" etc.
```

### Services Not Communicating

```bash
# View docker network
docker network inspect mcp-network

# Test connectivity between containers
docker-compose exec gateway ping team-a

# Check service names in /etc/hosts inside container
docker-compose exec gateway cat /etc/hosts
```

### Service Crashes

```bash
# View full logs
docker-compose logs gateway

# Check exit code
docker-compose ps

# View container details
docker inspect mcp-gateway

# Rebuild and restart
docker-compose build gateway
docker-compose up -d gateway
```

### Disk Space Issues

```bash
# Clean up unused Docker resources
docker system prune -a

# Remove all containers for this project
docker-compose down -v

# View disk usage
docker system df
```

## Performance Tuning

### Increase Resource Limits

Edit `docker-compose.yml` to add resource constraints:

```yaml
services:
  gateway:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Enable Docker BuildKit

```bash
export DOCKER_BUILDKIT=1
docker-compose build
```

## Production Deployment

### Using Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml mcp

# View services
docker service ls

# Scale service
docker service scale mcp_gateway=3
```

### Using Kubernetes

```bash
# Convert docker-compose to Kubernetes manifests
kompose convert -f docker-compose.yml -o k8s/

# Deploy to Kubernetes
kubectl apply -f k8s/
```

### Volume Persistence

To persist logs or data:

```yaml
volumes:
  gateway-logs:
  team-a-logs:

services:
  gateway:
    volumes:
      - gateway-logs:/app/logs
```

## Monitoring

### View Container Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f gateway

# Last 100 lines
docker-compose logs --tail=100 gateway

# With timestamps
docker-compose logs -f --timestamps gateway
```

### Monitor Resources

```bash
# Real-time resource usage
docker stats

# Specific container
docker stats mcp-gateway
```

### Access Metrics

```bash
# Prometheus metrics (gateway)
curl http://localhost:3000/metrics

# Health endpoints
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
```

## Common Issues & Solutions

### Gateway can't connect to team servers

**Problem:** Gateway shows "connection refused" errors

**Solution:**
1. Ensure `IN_DOCKER=true` is set on gateway
2. Verify teams.ts uses correct service names (team-a, team-b, team-c)
3. Check team server health: `docker-compose ps`

### Dashboard shows "No Gateway Connection"

**Problem:** Dashboard can't reach gateway

**Solution:**
1. Verify gateway is running: `docker-compose ps`
2. Check gateway logs: `docker-compose logs gateway`
3. Test connectivity: `docker-compose exec dashboard wget http://gateway:3000/metrics`

### Python packages not found

**Problem:** MCP servers fail with "ModuleNotFoundError"

**Solution:**
1. Update requirements.txt with missing packages
2. Rebuild MCP image: `docker-compose build team-a`
3. Restart: `docker-compose up -d`

## Cleanup

```bash
# Stop all services
docker-compose down

# Remove volumes (local data)
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Full cleanup
docker system prune -a --volumes
```

## File Structure

```
mcp-production-toolkit/
├── Dockerfile.gateway        # Gateway container definition
├── Dockerfile.dashboard      # Dashboard container definition
├── Dockerfile.mcp           # MCP servers container definition
├── docker-compose.yml       # Orchestration configuration
├── docker-run.sh           # Helper script
├── .dockerignore           # Files to exclude from build
├── gateway/
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── dist/              # Built JavaScript (in container)
├── dashboard/
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── dist/              # Built static files (in container)
└── mcp_server/
    ├── requirements.txt
    ├── server_team_a.py
    ├── server_team_b.py
    ├── server_team_c.py
    ├── http_bridge_team_a.py
    ├── http_bridge_team_b.py
    └── http_bridge_team_c.py
```

## Next Steps

1. ✅ Start all services: `./docker-run.sh up`
2. ✅ Open dashboard: http://localhost:5173
3. Login with credentials
4. Explore MCP Health, Security Events, and Request Logs
5. Test tools through the UI

## Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Verify all services are running: `docker-compose ps`
3. Test connectivity: `./docker-run.sh test`
4. Review Docker documentation: https://docs.docker.com
