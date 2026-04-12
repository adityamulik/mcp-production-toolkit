# Installation & Deployment Guide

Complete guide to install and run the MCP Production Toolkit using Docker and Docker Compose.

## Table of Contents
- [Quick Start (5 minutes)](#quick-start-5-minutes)
- [Prerequisites](#prerequisites)
- [Installation Methods](#installation-methods)
- [Running the Application](#running-the-application)
- [Verification](#verification)
- [Accessing the Dashboard](#accessing-the-dashboard)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Quick Start (5 minutes)

### Clone and Run
```bash
# Clone the repository
git clone <repository-url>
cd mcp-production-toolkit

# Start everything with one command
docker-compose up -d

# Check status
docker-compose ps
```

That's it! All services will be running. Proceed to [Accessing the Dashboard](#accessing-the-dashboard).

---

## Prerequisites

### Required
- **Docker** 20.10 or later
  - [Install Docker](https://docs.docker.com/get-docker/)
  - Verify: `docker --version`

- **Docker Compose** 2.0 or later
  - Usually included with Docker Desktop
  - Verify: `docker-compose --version`

### System Requirements
- **Disk Space:** At least 2GB free
- **Memory:** At least 2GB available for containers
- **Ports Available:**
  - 3000 (gateway)
  - 5173 (dashboard)
  - 8001, 8002, 8003 (MCP servers)

### Verification
```bash
# Check Docker
docker --version
docker ps

# Check Docker Compose
docker-compose --version

# Verify ports are free
lsof -i :3000
lsof -i :5173
```

---

## Installation Methods

### Method 1: Using Helper Script (Recommended)
The easiest way - uses the provided helper script.

```bash
# Make the script executable (first time only)
chmod +x docker-run.sh

# Start all services
./docker-run.sh up

# View logs
./docker-run.sh logs

# Check status
./docker-run.sh ps

# Stop all services
./docker-run.sh down
```

### Method 2: Using Docker Compose Directly
More control over individual services.

```bash
# Start all services in background
docker-compose up -d

# Start in foreground (see logs)
docker-compose up

# View logs from all services
docker-compose logs -f

# View logs from specific service
docker-compose logs -f gateway
docker-compose logs -f dashboard
docker-compose logs -f team-a

# Show status
docker-compose ps

# Stop all services
docker-compose down

# Stop and remove everything (cleanup)
docker-compose down -v
```

### Method 3: Manual Build and Run
For development and customization.

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Follow logs
docker-compose logs -f
```

---

## Running the Application

### Initial Startup (First Time)
```bash
cd /path/to/mcp-production-toolkit
docker-compose up -d
```

**Wait for ~10-15 seconds** for all services to be healthy:
- Team A, Team B, Team C servers starting
- Gateway initializing and connecting to teams
- Dashboard building and starting

### Check Services Are Ready
```bash
# View all containers
docker-compose ps

# All should show "healthy" or "up"
# Example output:
NAME            IMAGE                              STATUS
mcp-dashboard   mcp-production-toolkit-dashboard   Up 5 seconds (healthy)
mcp-gateway     mcp-production-toolkit-gateway     Up 10 seconds (healthy)
mcp-team-a      mcp-production-toolkit-team-a      Up 15 seconds (healthy)
mcp-team-b      mcp-production-toolkit-team-b      Up 15 seconds (healthy)
mcp-team-c      mcp-production-toolkit-team-c      Up 15 seconds (healthy)
```

### Restart After Stopping
```bash
# Start services again
docker-compose up -d

# Or restart individual service
docker-compose restart gateway
```

### Stop Services (Cleanup)
```bash
# Stop all (keeps data)
docker-compose stop

# Remove all (cleanup everything)
docker-compose down

# Remove everything including volumes
docker-compose down -v
```

---

## Verification

### Test All Services
```bash
# Using helper script
./docker-run.sh test

# Or manually test each service
curl http://localhost:3000/metrics          # Gateway
curl http://localhost:8001/health           # Team A
curl http://localhost:8002/health           # Team B
curl http://localhost:8003/health           # Team C
curl http://localhost:5173/                 # Dashboard
```

### Test Authentication
```bash
# Get JWT token (use credentials from .env.local)
DEVELOPER_EMAIL="developer@company.com"
DEVELOPER_PASSWORD="your-password"  # Set in .env.local

curl -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DEVELOPER_EMAIL\",\"password\":\"$DEVELOPER_PASSWORD\"}"

# Expected response:
# {"access_token":"eyJhbGciOi..."}
```

# Test MCP Tool Call
```bash
# Use token from above and your actual credentials from .env.local
TOKEN="<your-token-here>"

curl -X POST http://localhost:3000/mcp/tools/list_directory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"arguments":{"path":"/tmp"}}'

# Expected: Directory listing
```

---

## Accessing the Dashboard

### URL
```
http://localhost:5173
```

**Note:** Open in a modern browser (Chrome, Firefox, Safari, Edge)

### Default Credentials

See [CREDENTIALS.md](CREDENTIALS.md) for credential setup and configuration.

| Username | Role |
|----------|------|
| `developer` | Developer |
| `admin` | Administrator |
| `analyst` | Analyst |
| `deployer` | Deployer |

### First Login

1. Open http://localhost:5173
2. Use credentials configured in `.env.local` (see [CREDENTIALS.md](CREDENTIALS.md))
3. Click "Login"

### Dashboard Pages
- **MCP Health** - Team server status and health checks
- **Security Events** - Real-time security monitoring
- **Metrics** - Performance metrics and statistics
- **Request Logs** - Audit trail of all requests

---

## Troubleshooting

### Services Won't Start

**Problem:** Containers fail to start or exit immediately

**Solution:**
```bash
# Check logs
docker-compose logs

# Check gateway logs specifically
docker-compose logs gateway

# Rebuild images
docker-compose down
docker-compose build
docker-compose up -d
```

### Port Already in Use

**Problem:** Error like "bind: address already in use"

**Solution:**
```bash
# Find what's using the port
lsof -i :3000              # Gateway port
lsof -i :5173              # Dashboard port
lsof -i :8001              # Team A port

# Option 1: Kill the process
kill -9 <PID>

# Option 2: Use different port in docker-compose.yml
# Change "3000:3000" to "3001:3000" etc.
```

### Dashboard Can't Connect to Gateway

**Problem:** "Connection refused" or "Cannot connect to gateway"

**Solution:**
```bash
# Check if gateway is running
docker-compose ps gateway

# Check gateway logs
docker-compose logs gateway

# Test gateway directly
curl http://localhost:3000/metrics

# If gateway not responding, restart it
docker-compose restart gateway
```

### MCP Servers Not Responding

**Problem:** Gateway returns 503 Service Unavailable

**Solution:**
```bash
# Check team server logs
docker-compose logs team-a
docker-compose logs team-b
docker-compose logs team-c

# Verify they're running
docker-compose ps team-a team-b team-c

# Test team servers directly
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health

# Restart specific team
docker-compose restart team-a
```

### Authentication Fails

**Problem:** "Invalid credentials" or "Login failed"

**Solution:** Check your `.env.local` file has correct credentials configured:
```bash
# Verify endpoint is /auth/token (not /oauth/token)
# Use your actual credentials from .env.local
curl -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"developer@company.com","password":"YOUR_PASSWORD"}'  # Replace YOUR_PASSWORD

# Check that you're using email field, not username
# Correct: {"email":"developer@company.com","password":"..."}  
# Wrong:  {"username":"developer","password":"..."}
```

### Containers Keep Restarting

**Problem:** Services in a restart loop

**Solution:**
```bash
# View logs to see error
docker-compose logs --tail=100

# Check specific service
docker-compose logs node-gateway

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Disk Space Issues

**Problem:** "no space left on device"

**Solution:**
```bash
# Clean up Docker resources
docker system prune -a

# Remove everything for this project
docker-compose down -v

# Check disk usage
docker system df
```

### Network Issues Between Containers

**Problem:** Gateway can't reach team servers or vice versa

**Solution:**
```bash
# Verify network exists
docker network ls | grep mcp-network

# Check network details
docker network inspect mcp-network

# Test connectivity from gateway
docker-compose exec gateway ping team-a
docker-compose exec gateway wget -O- http://team-a:8001/health

# If still failing, recreate network
docker-compose down
docker-compose up -d
```

---

## Performance Tuning

### Increase Resource Limits
Edit `docker-compose.yml` and add resource limits:

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

### Enable Docker BuildKit (Faster Builds)
```bash
export DOCKER_BUILDKIT=1
docker-compose build
```

### Optimize Image Size
```bash
# Remove unused images
docker image prune

# Remove unused containers
docker container prune

# Full cleanup
docker system prune -a
```

---

## Monitoring & Logs

### View Real-Time Logs
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

### Monitor Resource Usage
```bash
# Real-time resource stats
docker stats

# Specific container
docker stats mcp-gateway

# Show container processes
docker top mcp-gateway
```

### Access Container Shell
```bash
# Gateway shell
docker-compose exec gateway sh

# Dashboard shell
docker-compose exec dashboard sh

# Team A shell (Python)
docker-compose exec team-a bash
```

---

## Production Deployment

### Using Docker Swarm
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml mcp

# View services
docker service ls
```

### Using Kubernetes
```bash
# Convert docker-compose to Kubernetes
kompose convert -f docker-compose.yml -o k8s/

# Deploy
kubectl apply -f k8s/

# Check pods
kubectl get pods
```

### Volume Persistence
Add to `docker-compose.yml`:
```yaml
volumes:
  gateway-logs:
  team-a-logs:

services:
  gateway:
    volumes:
      - gateway-logs:/app/logs
```

---

## Next Steps

1. ✅ **Access Dashboard:** http://localhost:5173
2. ✅ **Login with:** credentials configured in `.env.local` (see [CREDENTIALS.md](CREDENTIALS.md))
3. ✅ **Explore pages:**
   - MCP Health - Check team server status
   - Security Events - View real-time security
   - Metrics - Monitor performance
   - Request Logs - Review audit trail

4. **Read Documentation:**
   - [TEAMS.md](TEAMS.md) - Team server information
   - [TOOLS.md](TOOLS.md) - Available tools reference
   - [DOCKER.md](DOCKER.md) - Advanced Docker configuration
   - [API.md](API.md) - Gateway API reference

5. **Test the System:**
   - Try calling different team tools
   - Generate security events
   - Monitor metrics in real-time
   - Check request logs

6. **Customize:**
   - Modify policy rules in `gateway/src/policy/`
   - Add new team servers
   - Extend security filters
   - Update authentication

---

## Support & Issues

### Check Logs First
```bash
docker-compose logs | grep -i error
```

### Common Issues
- **Port conflicts:** Check [Port Already in Use](#port-already-in-use)
- **Auth failures:** Check [Authentication Fails](#authentication-fails)
- **503 errors:** Check [MCP Servers Not Responding](#mcp-servers-not-responding)
- **Connection issues:** Check [Network Issues](#network-issues-between-containers)

### Get Help
1. Check troubleshooting section above
2. Review logs: `docker-compose logs`
3. Test services individually with curl
4. Rebuild everything: `docker-compose down -v && docker-compose up -d`

---

## Quick Reference

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# Logs
docker-compose logs -f

# Status
docker-compose ps

# Rebuild
docker-compose build

# Test
./docker-run.sh test

# Access dashboard
http://localhost:5173

# Auth token (use credentials from .env.local)
curl -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"developer@company.com","password":"YOUR_PASSWORD"}'  # Replace YOUR_PASSWORD
```

---

**Version:** 1.0.0  
**Last Updated:** April 2026  
**Status:** Production Ready ✅
