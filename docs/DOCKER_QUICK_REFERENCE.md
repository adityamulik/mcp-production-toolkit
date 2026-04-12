# Docker Quick Reference

## One-Line Start
```bash
docker-compose up -d && sleep 3 && docker-compose ps
```

## One-Line Stop
```bash
docker-compose down
```

## Check Everything Is Running
```bash
./docker-run.sh test
```

## View Logs (All Services)
```bash
docker-compose logs -f
```

## View Logs (Specific Service)
```bash
docker-compose logs -f gateway      # Gateway
docker-compose logs -f dashboard    # Dashboard  
docker-compose logs -f team-a       # Team A
docker-compose logs -f team-b       # Team B
docker-compose logs -f team-c       # Team C
```

## Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| Gateway | http://localhost:3000 | API endpoint |
| Dashboard | http://localhost:5173 | UI & Monitoring |
| Metrics | http://localhost:3000/metrics | Prometheus metrics |
| Team A | http://localhost:8001 | Analytics tools |
| Team B | http://localhost:8002 | DevOps tools |
| Team C | http://localhost:8003 | Developer tools |

## Login Credentials

See [CREDENTIALS.md](CREDENTIALS.md) for credential setup

Available roles:
- developer
- admin
- analyst
- deployer

## Common Commands

```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View services
docker-compose ps

# View logs real-time
docker-compose logs -f

# Restart specific service
docker-compose restart gateway

# Rebuild all images
docker-compose build

# Rebuild one image
docker-compose build gateway

# Rebuild and restart
docker-compose up -d --build

# Execute shell command
docker-compose exec gateway sh
docker-compose exec dashboard sh
docker-compose exec team-a bash
```

## Troubleshooting

```bash
# Check if services are healthy
docker-compose ps

# View service logs
docker-compose logs gateway

# Test service connectivity
docker-compose exec gateway ping team-a

# Check Docker network
docker network inspect mcp-network

# Check container details
docker ps -a
docker inspect mcp-gateway

# Clean up (remove containers)
docker-compose down

# Clean up (remove everything including volumes)
docker-compose down -v
```

## Helper Script

```bash
# Make script executable (first time only)
chmod +x docker-run.sh

# Use helper script
./docker-run.sh up            # Start all
./docker-run.sh down          # Stop all
./docker-run.sh logs          # View all logs
./docker-run.sh logs-gateway  # View gateway logs
./docker-run.sh ps            # Show status
./docker-run.sh test          # Test all services
./docker-run.sh restart       # Restart all
./docker-run.sh help          # Show help
```
