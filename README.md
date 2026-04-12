# MCP Production Toolkit

> Production-ready security, reliability, and observability layer for Model Context Protocol servers

## 🚀 Quick Start (2 minutes)

### Prerequisites
- Docker & Docker Compose installed
- Ports 3000, 5173, 8001-8003 available

### Start Everything
```bash
# Clone and navigate
git clone <repository>
cd mcp-production-toolkit

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# Open dashboard
# → http://localhost:5173
```

**Login Credentials:**
- Username: `developer`
- Password: `dev123`

---

## 📚 Documentation

> **New here?** Start with [**Installation Guide →**](docs/INSTALLATION.md)

| Document | Purpose | Time |
|----------|---------|------|
| [**INSTALLATION.md**](docs/INSTALLATION.md) | Complete setup and deployment guide | 5 min |
| [**DOCKER_QUICK_REFERENCE.md**](docs/DOCKER_QUICK_REFERENCE.md) | Common Docker commands cheat sheet | 2 min |
| [**TEAMS.md**](docs/TEAMS.md) | Multi-team architecture overview | 10 min |
| [**TOOLS.md**](docs/TOOLS.md) | Available MCP tools reference | 5 min |
| [**DOCKER.md**](docs/DOCKER.md) | Advanced Docker configuration | 20 min |
| [**INDEX.md**](docs/INDEX.md) | Complete documentation index | - |

---

## What You Get

### 🔒 Zero-Trust Security
- **JWT Authentication** with configurable credentials
- **Role-Based Access Control (RBAC)** - control who can access what
- **Prompt Injection Detection** - ML-powered security
- **Complete Audit Trail** - request logging with filtering
- **Multi-level Authorization** - user → role → tool → resource

### 💪 Enterprise Reliability
- **Circuit Breaker Pattern** - prevent cascade failures
- **Automatic Retries** - exponential backoff strategy
- **Health Checks** - continuous service monitoring
- **Service Isolation** - independent team servers
- **Graceful Degradation** - maintain uptime during issues

### 📊 Full Observability  
- **Real-time Dashboard** - live security and health monitoring
- **Request Logging** - complete audit trail with filtering
- **Live Metrics** - request duration, success rates, blocked attempts
- **Security Events** - real-time alerts and monitoring
- **Stream Logs** - Server-Sent Events for live updates

### ⚙️ Multi-Team Architecture
- **3 Independent MCP Servers** - Team A (Analytics), Team B (DevOps), Team C (Developer)
- **Dynamic Tool Routing** - automatically routes to the correct team
- **Tool Isolation** - clear role-based tool boundaries
- **Separate Authentication** - per-team service management
- **Easy Scaling** - add new teams without code changes

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│      React Dashboard (Port 5173)                │
│  Pages: Health • Security • Metrics • Logs      │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────↓──────────────────────────────┐
│    Security Gateway (Port 3000)                 │
│  Auth • RBAC • Validation • Retry • Logging     │
└──────────────┬──────────────┬──────────────────┘
               │              │
        ┌──────↓──┐    ┌──────↓──┐    ┌──────┐
        │ Team A  │    │ Team B  │    │TeamC │
        │(8001)   │    │(8002)   │    │(8003)│
        │Analytics│    │DevOps   │    │Devlpr│
        │FastMCP  │    │FastMCP  │    │FastM │
        └─────────┘    └─────────┘    └──────┘
```

---

## Services & Ports

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Dashboard** | 5173 | http://localhost:5173 | Web UI for monitoring |
| **Gateway** | 3000 | http://localhost:3000 | API endpoint & security layer |
| **Team A** | 8001 | http://localhost:8001 | Analytics tools |
| **Team B** | 8002 | http://localhost:8002 | DevOps tools |
| **Team C** | 8003 | http://localhost:8003 | Developer tools |

---

## Common Tasks

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f gateway
docker-compose logs -f dashboard
docker-compose logs -f team-a

# Use helper script
./docker-run.sh logs
```

### Check Status
```bash
docker-compose ps
./docker-run.sh test
```

### Stop Services
```bash
docker-compose down
./docker-run.sh down
```

### Access Container Shell
```bash
# Gateway shell
docker-compose exec gateway sh

# Team A shell
docker-compose exec team-a bash

# Dashboard shell
docker-compose exec dashboard sh
```

### Restart Specific Service
```bash
docker-compose restart gateway
docker-compose restart dashboard
docker-compose restart team-a
```

---

## Available Tools

### Team A - Analytics
- `query_database` - Execute database queries
- `generate_report` - Generate reports
- `audit_logs` - Access audit logs

### Team B - DevOps  
- `deploy_application` - Deploy an application
- `restart_service` - Restart a service
- `update_configuration` - Update configuration

### Team C - Developer
- `list_directory` - List directory contents
- `read_file` - Read file contents
- `modify_permissions` - Modify file permissions
- `user_management` - Manage users

See [TOOLS.md](docs/TOOLS.md) for detailed tool reference and examples.

---

## Test the System

### 1. Get Authentication Token
```bash
curl -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"developer","password":"dev123"}'
```

### 2. Call an MCP Tool
```bash
TOKEN="<your-token-here>"

curl -X POST http://localhost:3000/mcp/tools/list_directory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"arguments":{"path":"/tmp"}}'
```

### 3. View Logs
```bash
curl http://localhost:3000/logs \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Troubleshooting

### Services Won't Start
```bash
# Check logs
docker-compose logs

# Rebuild everything
docker-compose down -v
docker-compose build
docker-compose up -d
```

### Dashboard Can't Connect
```bash
# Verify gateway is running
curl http://localhost:3000/metrics

# Restart gateway
docker-compose restart gateway
```

### Port Already in Use
```bash
# Check what's using the port
lsof -i :3000

# Or change ports in docker-compose.yml
# Change "3000:3000" to "3001:3000" etc.
```

**More help:** See [Installation Troubleshooting](docs/INSTALLATION.md#troubleshooting)

---

## Dashboard Pages

### 🏥 MCP Health
- Real-time status of all three team servers
- Health check indicators
- Tool discovery and validation
- Auto-refresh every 30 seconds

### 🔐 Security Events
- Real-time security monitoring
- Blocked requests and violations
- User activities
- Anomaly detection alerts

### 📊 Metrics
- Request counts and rates
- Response duration statistics
- Success/failure breakdown
- Tool usage analytics

### 📋 Request Logs
- Complete audit trail
- Filtering by user, tool, team, status
- Real-time log streaming
- Blocked request details

---

## Default Users

| Username | Password | Role |
|----------|----------|------|
| `developer` | `dev123` | Developer |
| `admin` | `admin123` | Administrator |
| `analyst` | `analyst123` | Analyst |
| `deployer` | `deploy123` | Deployer |

---

## Features

✅ **Authentication & Authorization**
- JWT token-based auth
- Role-based access control
- Fine-grained permission control

✅ **Security**
- Prompt injection detection
- Anomaly detection
- Request validation
- Complete audit trail

✅ **Reliability**
- Circuit breaker pattern
- Automatic retries with backoff
- Health checks
- Graceful error handling

✅ **Observability**
- Real-time dashboard
- Request logging with filtering
- Live security events
- Performance metrics

✅ **Multi-Team Support**
- Independent team servers
- Dynamic tool routing
- Separate configurations
- Easy scaling

---

## Architecture Highlights

### 3-Layer Design
1. **Dashboard** (React frontend) - Real-time monitoring UI
2. **Gateway** (TypeScript backend) - Security, routing, logging
3. **Team Servers** (Python FastMCP) - Actual tool implementations

### Security Pipeline
Request → Auth → RBAC → Resource Check → Prompt Filter → 
Anomaly Detection → Circuit Breaker → Team Routing → Retry → Logging

### Networking
- Services communicate via Docker network
- Encrypted token-based auth
- Request/response logging
- Error handling with retries

---

## Production Ready

✅ Containerized with Docker  
✅ Health checks and monitoring  
✅ Error handling and retries  
✅ Security best practices  
✅ Comprehensive logging  
✅ Multi-team architecture  
✅ Scalable design  

---

## Next Steps

1. **[Follow Installation Guide →](docs/INSTALLATION.md)**
2. Open Dashboard: http://localhost:5173
3. Login with `developer` / `dev123`
4. Explore pages: Health, Security, Metrics, Logs
5. Test tools via cURL or dashboard
6. Read [TEAMS.md](docs/TEAMS.md) to understand architecture
7. Review [TOOLS.md](docs/TOOLS.md) for tool reference

---

## Project Structure

```
docs/                   ← All documentation files
gateway/               ← TypeScript security layer
dashboard/             ← React web UI
mcp_server/            ← Python FastMCP servers
docker-compose.yml     ← Orchestration config
docker-run.sh          ← Helper script
```

See [docs/INDEX.md](docs/INDEX.md) for complete file listing.

---

## Support

- 📖 **Documentation:** [docs/INDEX.md](docs/INDEX.md)
- 🆘 **Troubleshooting:** [docs/INSTALLATION.md#troubleshooting](docs/INSTALLATION.md#troubleshooting)
- 🔧 **Docker Help:** [docs/DOCKER_QUICK_REFERENCE.md](docs/DOCKER_QUICK_REFERENCE.md)
- 📋 **Tools Reference:** [docs/TOOLS.md](docs/TOOLS.md)

---

**Version:** 1.0.0  
**Status:** Production Ready ✅  
**Last Updated:** April 2026

Made with ❤️ for production teams building with MCP