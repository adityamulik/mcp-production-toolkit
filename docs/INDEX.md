# Documentation Index

Complete documentation for the MCP Production Toolkit.

## Getting Started

### [INSTALLATION.md](INSTALLATION.md) 🚀 **START HERE**
Comprehensive guide to install and run the entire application using Docker Compose.

**Includes:**
- Quick start (5 minutes)
- Prerequisites and system requirements
- Three installation methods (helper script, docker-compose, manual)
- Verification and testing
- Troubleshooting guide
- Performance tuning
- Production deployment options

**Best for:** First-time users, deployment teams, quick setup

---

## Architecture & Configuration

### [TEAMS.md](TEAMS.md)
Complete guide to the multi-team architecture with separate MCP servers.

**Includes:**
- Team A (Analytics) - Database queries, reporting, audit logs
- Team B (DevOps) - Application deployment, service management
- Team C (Developer) - File operations, permissions, user management
- Tool routing and access control
- Customization guide

**Best for:** Understanding architecture, adding new teams, customization

### [TOOLS.md](TOOLS.md)
Reference documentation for all available MCP tools and their parameters.

**Includes:**
- Complete tool catalog
- Request/response formats
- Parameter requirements
- Example usage
- Testing examples

**Best for:** Tool developers, API integration, reference lookup

---

## Docker & Deployment

### [DOCKER.md](DOCKER.md)
In-depth Docker configuration and deployment guide.

**Includes:**
- Docker image specifications
- Build process details
- Environment variables
- Health checks
- Production best practices
- Kubernetes deployment
- Scaling guides

**Best for:** DevOps, Docker expertise, production deployments

### [DOCKER_QUICK_REFERENCE.md](DOCKER_QUICK_REFERENCE.md)
Quick cheat sheet for common Docker commands.

**Includes:**
- One-liner commands
- Access points
- Common troubleshooting
- Login credentials
- Helper script usage

**Best for:** Quick reference, terminal alongside window

---

## Gateway & Security

### Gateway API
The gateway provides REST endpoints for MCP tool execution with authentication and security controls.

**Authentication Endpoint:**
```
POST /auth/token
```

**Tool Execution Endpoint:**
```
POST /mcp/tools/{tool_name}
Authorization: Bearer {token}
```

**Metrics Endpoint:**
```
GET /metrics
```

**Request Logs:**
```
GET /logs
GET /logs/user/{userId}
GET /logs/tool/{tool}
GET /logs/team/{team}
GET /logs/blocked
GET /logs/stats
GET /logs/stream (SSE)
```

---

## Dashboard

The React dashboard provides real-time monitoring at http://localhost:5173

### Pages
- **MCP Health** - Team server status and tool discovery
- **Security Events** - Real-time security monitoring and alerts
- **Metrics** - Performance metrics and statistics
- **Request Logs** - Audit trail with filtering

### Default Credentials
- **developer** / **dev123** (Developer role)
- **admin** / **admin123** (Admin role)
- **analyst** / **analyst123** (Analyst role)
- **deployer** / **deploy123** (Deployer role)

---

## Quick Links

| Need | Document | Time |
|------|----------|------|
| **First time setup** | [INSTALLATION.md](INSTALLATION.md) | 5 min |
| **Quick Docker commands** | [DOCKER_QUICK_REFERENCE.md](DOCKER_QUICK_REFERENCE.md) | 2 min |
| **Understanding architecture** | [TEAMS.md](TEAMS.md) | 10 min |
| **Tool reference** | [TOOLS.md](TOOLS.md) | 5 min |
| **Advanced Docker** | [DOCKER.md](DOCKER.md) | 20 min |

---

## Common Tasks

### Start the Application
See: [INSTALLATION.md - Quick Start](INSTALLATION.md#quick-start-5-minutes)

```bash
docker-compose up -d
```

### Access the Dashboard
See: [INSTALLATION.md - Accessing Dashboard](INSTALLATION.md#accessing-the-dashboard)

**URL:** http://localhost:5173  
**Login:** developer / dev123

### Check Service Status
See: [INSTALLATION.md - Verification](INSTALLATION.md#verification)

```bash
docker-compose ps
./docker-run.sh test
```

### View Logs
See: [DOCKER_QUICK_REFERENCE.md](DOCKER_QUICK_REFERENCE.md)

```bash
docker-compose logs -f
docker-compose logs -f gateway
```

### Call an MCP Tool
See: [TOOLS.md](TOOLS.md)

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"developer","password":"dev123"}' | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

# Call tool
curl -X POST http://localhost:3000/mcp/tools/list_directory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"arguments":{"path":"/tmp"}}'
```

### Add a New Team
See: [TEAMS.md - Adding New Teams](TEAMS.md)

### Troubleshoot Issues
See: [INSTALLATION.md - Troubleshooting](INSTALLATION.md#troubleshooting)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│             React Dashboard (Port 5173)                 │
│   - MCP Health • Security • Metrics • Request Logs      │
└────────────────────────┬────────────────────────────────┘
                         │ (HTTP over localhost)
                         ↓
┌─────────────────────────────────────────────────────────┐
│         Security Gateway (Port 3000)                    │
│  - Auth • RBAC • Validation • Retry • Circuit Breaker   │
│  - Request Logging • Rate Limiting • Anomaly Detection  │
└──────────┬──────────────┬──────────────┬────────────────┘
           │              │              │
    ┌──────↓──┐   ┌──────↓──┐   ┌──────↓──┐
    │ Team A  │   │ Team B  │   │ Team C  │
    │ (8001)  │   │ (8002)  │   │ (8003)  │
    ├─────────┤   ├─────────┤   ├─────────┤
    │Analytics│   │DevOps   │   │Developer│
    │FastMCP  │   │FastMCP  │   │FastMCP  │
    │Python   │   │Python   │   │Python   │
    └─────────┘   └─────────┘   └─────────┘
```

---

## File Structure

```
mcp-production-toolkit/
├── docs/                          # All documentation
│   ├── INSTALLATION.md           # Setup guide (START HERE)
│   ├── TEAMS.md                  # Team architecture
│   ├── TOOLS.md                  # Tool reference
│   ├── DOCKER.md                 # Advanced Docker
│   ├── DOCKER_QUICK_REFERENCE.md # Docker cheat sheet
│   └── INDEX.md                  # This file
│
├── gateway/                       # TypeScript/Node.js security layer
│   ├── src/
│   │   ├── server.ts             # Main gateway server
│   │   ├── config/               # Configuration
│   │   ├── policies/             # Security policies
│   │   ├── resilience/           # Circuit breaker, retry
│   │   ├── observability/        # Metrics, logging, events
│   │   ├── auth/                 # Authentication
│   │   └── security/             # Filters, detectors
│   └── dist/                     # Compiled JavaScript
│
├── dashboard/                     # React/TypeScript UI
│   ├── src/
│   │   ├── App.tsx               # Main app
│   │   ├── components/           # React components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── HealthDiscovery.tsx
│   │   │   ├── SecurityDashboard.tsx
│   │   │   ├── MetricsView.tsx
│   │   │   └── Logs.tsx
│   │   └── index.tsx
│   └── dist/                     # Built static files
│
├── mcp_server/                    # Python FastMCP servers
│   ├── server_team_a.py          # Analytics team
│   ├── server_team_b.py          # DevOps team
│   ├── server_team_c.py          # Developer team
│   ├── http_bridge_team_a.py     # Flask HTTP bridge A
│   ├── http_bridge_team_b.py     # Flask HTTP bridge B
│   ├── http_bridge_team_c.py     # Flask HTTP bridge C
│   └── requirements.txt          # Python dependencies
│
├── docker-compose.yml            # Complete orchestration
├── Dockerfile.gateway            # Gateway container
├── Dockerfile.dashboard          # Dashboard container
├── Dockerfile.mcp               # MCP servers container
├── docker-run.sh                # Helper script
├── .dockerignore                # Build optimization
│
└── README.md                    # Main project readme
```

---

## Related Resources

- **FastMCP Documentation:** https://docs.anthropic.com/en/docs/build-with-claude/mcp/server
- **Docker Documentation:** https://docs.docker.com/
- **Docker Compose:** https://docs.docker.com/compose/
- **Express.js Guide:** https://expressjs.com/
- **React Documentation:** https://react.dev/

---

## Version Information

| Component | Version | Status |
|-----------|---------|--------|
| Gateway | 1.0.0 | ✅ Production |
| Dashboard | 1.0.0 | ✅ Production |
| MCP Servers | 1.0.0 | ✅ Production |
| Docker Compose | 2.0+ | ✅ Compatible |
| Node.js | 20-alpine | ✅ Supported |
| Python | 3.11-slim | ✅ Supported |

---

## Support

For issues or questions:
1. Check [INSTALLATION.md Troubleshooting](INSTALLATION.md#troubleshooting)
2. Review service logs: `docker-compose logs`
3. Test individual services with curl
4. Read relevant documentation above

---

**Last Updated:** April 2026  
**Status:** Documentation Complete ✅
