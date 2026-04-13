# CLAUDE.MD - Project Guidelines & Context Management

## 📋 Project Overview

**MCP Production Toolkit** = 3-tier system:
- **Dashboard** (React/TypeScript) - Web UI on port 5173
- **Gateway** (TypeScript) - API layer & security on port 3000  
- **MCP Servers** (Python) - 3 team-specific services on ports 8001-8003

Remember: **Always specify which component(s)** you're working on to keep context focused.

---

## 🎯 Context Window Best Practices

### DO: Keep Requests Scoped & Specific

**✅ GOOD**: "Fix the circuit breaker timeout in gateway/src/resilience/circuit-breaker.ts"
- Specific file
- Clear problem
- Single component

**❌ BAD**: "The system is slow, fix everything"
- Vague scope
- Unclear which component
- Wastes context tokens

### Rule: Request Template

When asking for help, include:
```
[COMPONENT] [Task Type] - [Specific Request]
[Context: file paths, line numbers if known]
[Expected outcome]
```

**Example**:
```
[Gateway] Bug fix - POST /mcp/tools/:tool endpoint returns 500
File: gateway/src/server.ts, around line 150
Need error handling for missing team config
```

---

## 🏗️ Component-Specific Guidelines

### Dashboard (dashboard/)
**Stack**: React, TypeScript, Vite  
**Key Files**:
- `src/App.tsx` - Main app component
- `src/components/*.tsx` - UI panels (Sidebar, Logs, MetricsView, etc.)
- `src/index.tsx` - Entry point
- `vite.config.ts` - Build config

**When asking for changes**:
- Mention the component file (e.g., `CircuitBreakerPanel.tsx`)
- Specify UI behavior or styling issue
- Reference port 5173 if testing

---

### Gateway (gateway/)
**Stack**: TypeScript/Node.js  
**Key Files**:
- `src/server.ts` - Main server & routing
- `src/auth/oauth-server.ts` - Authentication logic
- `src/security/anomaly-detector.ts` - Threat detection
- `src/resilience/circuit-breaker.ts` - Fault tolerance
- `src/policy/engine.ts` - Policy enforcement
- Port: 3000

**When asking for changes**:
- Specify the middleware/module (auth, security, resilience, policy)
- Include the endpoint path if relevant (e.g., `POST /auth/token`)
- Reference the team channel if using TEAMS.md context

---

### MCP Servers (mcp_server/)
**Stack**: Python  
**Key Files**:
- `http_bridge_team_a.py` - Team A bridge (port 8001)
- `http_bridge_team_b.py` - Team B bridge (port 8002)
- `http_bridge_team_c.py` - Team C bridge (port 8003)
- `server_team_a.py`, `server_team_b.py`, `server_team_c.py` - Actual tool implementations
- `requirements.txt` - Dependencies

**When asking for changes**:
- Specify which team (A/B/C) or "all teams"
- Name the specific tool you're modifying
- Include the expected input/output if unclear

---

## 🧹 Code Cleanliness Standards

### File Organization
Each component keeps its concerns separated:

```
dashboard/src/
  ├── components/        ← UI only
  ├── App.tsx            ← Orchestration
  └── index.tsx          ← Entry

gateway/src/
  ├── auth/              ← Authentication only
  ├── security/          ← Security/anomaly detection
  ├── resilience/        ← Circuit breaker, retries
  ├── policy/            ← Policy engine
  └── server.ts          ← Routing only

mcp_server/
  ├── http_bridge_*      ← HTTP wrapper
  ├── server_*           ← Tool implementations
  └── requirements.txt   ← Dependencies
```

### Import Pattern
**Keep imports scoped to modules**:
```typescript
// ✅ GOOD - Import only what you need
import { CircuitBreaker } from './resilience/circuit-breaker';

// ❌ BAD - Broad imports
import * from './resilience';
```

### Function Size
- **Dashboard components**: Single responsibility, <200 LOC
- **Gateway middleware**: <100 LOC (delegate to helper modules)
- **Python tools**: <150 LOC (business logic only)

### Documentation
- **TypeScript files**: JSDoc for exported functions only
  ```typescript
  /**
   * Routes MCP tool request to appropriate team server.
   * @param tool - Tool name
   * @returns Team configuration
   */
  function getTeamForTool(tool: string) { ... }
  ```
- **Python files**: Docstring for public functions
  ```python
  def handle_request(request):
      """Process incoming MCP request and route to handler."""
  ```

---

## 📝 Instruction Clarity Checklist

Before writing instructions for changes, ensure:

- [ ] **Which component?** (Dashboard/Gateway/MCP Servers)
- [ ] **Specific file path?** (no vague "somewhere in the codebase")
- [ ] **Desired outcome?** (what should the user see/test?)
- [ ] **Existing patterns?** (follow repo conventions)
- [ ] **Scoped changes?** (no refactoring entire folders)
- [ ] **Dependencies clear?** (if one component affects another)

---

## 🔗 Key Reference Files

| Task | File | Access |
|------|------|--------|
| Team configuration | /memories/repo/multi-team-setup.md | Read this first |
| Tool mappings | gateway/src/config/teams.ts | Source of truth |
| Available tools | docs/TOOLS.md | Public reference |
| Architecture | docs/architecture.md | High-level view |
| Credentials | docs/CREDENTIALS.md | Auth details |
| Docker setup | docs/DOCKER_QUICK_REFERENCE.md | Container ref |

---

## 🚀 Quick Commands (Copy-Paste Ready)

### Start All Services
```bash
docker-compose up -d
```

### Start Individual Components

**Dashboard** (terminal 1):
```bash
cd dashboard && npm run dev
```

**Gateway** (terminal 2):
```bash
cd gateway && npm run dev
```

**Team A Server** (terminal 3):
```bash
cd mcp_server && python3 http_bridge_team_a.py
```

**Team B Server** (terminal 4):
```bash
cd mcp_server && python3 http_bridge_team_b.py
```

**Team C Server** (terminal 5):
```bash
cd mcp_server && python3 http_bridge_team_c.py
```

### Test API Endpoint
```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | jq -r '.token')

# Call a tool
curl -X POST http://localhost:3000/mcp/tools/query_database \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"team":"a"}'
```

---

## 🎓 Common Tasks & Where They Go

| Task | Component | File |
|------|-----------|------|
| Add new tool | MCP Server | `server_team_X.py` |
| Add auth method | Gateway | `gateway/src/auth/*` |
| Add security check | Gateway | `gateway/src/security/*` |
| Add retry logic | Gateway | `gateway/src/resilience/*` |
| Add UI panel | Dashboard | `dashboard/src/components/*.tsx` |
| Add API endpoint | Gateway | `gateway/src/server.ts` |
| Change team config | Gateway | `gateway/src/config/teams.ts` |

---

## ⚡ Context Window Tips

### What NOT to Include

- ❌ Entire `node_modules/` or requirements
- ❌ Package lock files unless explicitly needed
- ❌ Build artifacts or logs
- ❌ Other teams' server code (if only fixing Team A)
- ❌ Full file histories or git logs

### What TO Include

- ✅ Specific file paths
- ✅ Relevant line numbers (5-line context around change)
- ✅ Error messages or test failures
- ✅ Expected vs. actual behavior
- ✅ Which component(s) are affected

### Example: Smart Request

```
[Gateway + Dashboard] Feature request - Real-time team status

Files to review:
- gateway/src/server.ts (line 45-65) - team status endpoint
- dashboard/src/components/Sidebar.tsx (line 20-40) - sidebar display

Needed:
1. Add GET /teams/status endpoint returning live health
2. Display status in Sidebar with color indicators (green=healthy, red=error)
3. Update every 5 seconds via polling
```

---

## 🧠 Memory for Repeated Patterns

Store answers to these in /memories/repo/ for quick reference:

1. **How do I add a new tool to Team X?**
   → Edit `server_team_X.py`, add function, register in bridge
   
2. **How do I add a new API endpoint?**
   → Edit `gateway/src/server.ts`, add route, validate with middleware
   
3. **How do I test a tool?**
   → Use quick command above or write test in `mcp_server/` directory

---

## ✅ Checklist: Before Asking for Help

- [ ] Identified the component (Dashboard/Gateway/MCP)
- [ ] Found the specific file path
- [ ] Included error message or expected behavior
- [ ] Checked existing files for similar patterns
- [ ] Specified: what you're changing and why
- [ ] Clear on: what success looks like

---

## 🔍 How to Read This Repo Efficiently

**Day 1 - Get Overview** (15 min):
1. Read this file (5 min)
2. Check /memories/repo/multi-team-setup.md (5 min)
3. Skim docs/TEAMS.md (5 min)

**Day 2+ - Component Deep Dives** (as needed):
- Dashboard: Read dashboard/src/App.tsx + one component
- Gateway: Read gateway/src/server.ts + one middleware
- MCP: Read one server_team_X.py

**Don't read**: Full documentation unless stuck, build artifacts, or node_modules

---

## 📞 Asking for Changes - Template

Use this structure for maximum clarity:

```markdown
[COMPONENT] [ACTION] - Brief description

**Current state**: What exists now or what breaks

**Desired state**: What you want to achieve

**Location**: Specific files and line numbers

**Context**: Any edge cases or dependencies

**Testing**: How to verify the change works
```

**Real example**:

```markdown
[Gateway] Bug fix - Token validation fails for expired tokens

**Current state**: 
GET /auth/validate returns 500 for expired JWT instead of 401

**Desired state**: 
Return 401 Unauthorized with clear "token_expired" error message

**Location**: 
gateway/src/auth/oauth-server.ts, lines 85-110 (validateToken function)

**Context**: 
This blocks dashboard refresh after token expires. Dashboard should redirect to login on 401.

**Testing**: 
1. Generate token
2. Wait for expiry (or manually set expiry to past date)
3. Call GET /auth/validate
4. Should receive 401 with { error: "token_expired" }
```

---

## 🧪 Testing Philosophy

- **Unit tests**: Write for auth, security, resilience logic
- **Integration tests**: Test gateway routing to teams
- **Manual tests**: Dashboard UI, end-to-end flows
- **Automated tests**: CI/CD via Docker

Before shipping:
1. Test locally (docker-compose up -d)
2. Run through a real scenario
3. Check dashboard shows correct metrics

---

## 📊 Component Complexity & Who to Ask

| Component | Complexity | Ask For |
|-----------|-----------|---------|
| Dashboard UI | Low | CSS, component layout, state mgmt |
| Gateway routing | Medium | Auth, policy, error handling |
| Resilience | Medium | Circuit breaker, retries tuning |
| Security | High | Anomaly detection, threat modeling |
| MCP tools | Medium | Tool logic, error cases |

---

## Final Rule

> **"One request, one component, one clear outcome."**

If you need changes across multiple components, break it into separate requests. This keeps context focused and solutions cleaner.

