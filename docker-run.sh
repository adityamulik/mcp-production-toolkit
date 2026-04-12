#!/bin/bash

# Docker Compose Runner for MCP Production Toolkit
# This script helps manage the entire Docker Compose setup

set -e

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

show_help() {
    cat << EOF
${BLUE}MCP Production Toolkit - Docker Compose Helper${NC}

Usage: ./docker-run.sh [COMMAND]

Commands:
  up              Start all services in background
  down            Stop and remove all containers
  logs            View logs from all services (follow mode)
  logs-gateway    View logs from gateway service only
  logs-dashboard  View logs from dashboard service only
  logs-team-a     View logs from Team A (Analytics) service
  logs-team-b     View logs from Team B (DevOps) service
  logs-team-c     View logs from Team C (Developer) service
  ps              Show status of all running services
  restart         Restart all services
  build           Build all Docker images
  build-gateway   Build gateway image only
  build-dashboard Build dashboard image only
  build-mcp       Build MCP servers image only
  shell-gateway   Open shell in gateway container
  shell-dashboard Open shell in dashboard container
  shell-team-a    Open shell in Team A container
  test            Test all services are running
  help            Show this help message

All Services:
  - Gateway:  http://localhost:3000
  - Dashboard: http://localhost:5173
  - Team A:   http://localhost:8001
  - Team B:   http://localhost:8002
  - Team C:   http://localhost:8003

Example:
  # Start all services
  ./docker-run.sh up

  # View logs
  ./docker-run.sh logs

  # Stop everything
  ./docker-run.sh down
EOF
}

test_services() {
    print_header "Testing Services"
    
    SERVICES=("gateway:3000" "dashboard:5173" "team-a:8001" "team-b:8002" "team-c:8003")
    
    for service in "${SERVICES[@]}"; do
        IFS=: read -r name port <<< "$service"
        echo -n "Testing $name on port $port... "
        
        if curl -s --max-time 2 "http://localhost:$port" > /dev/null 2>&1 || \
           curl -s --max-time 2 "http://localhost:$port/health" > /dev/null 2>&1 || \
           curl -s --max-time 2 "http://localhost:$port/metrics" > /dev/null 2>&1; then
            print_success "$name is running"
        else
            print_error "$name is not responding"
        fi
    done
}

# Main command handling
CMD="${1:-help}"

case "$CMD" in
    up)
        print_header "Starting MCP Production Toolkit"
        docker-compose up -d
        print_success "All services started in background"
        sleep 3
        test_services
        echo ""
        echo -e "${GREEN}Services are running at:${NC}"
        echo "  Gateway:   http://localhost:3000"
        echo "  Dashboard: http://localhost:5173"
        echo ""
        echo -e "${YELLOW}Available roles (configure in .env.local):${NC}"
        echo "  developer"
        echo "  admin"
        echo "  analyst"
        echo "  deployer"
        echo ""
        echo "For credential setup, see: CREDENTIALS.md"
        ;;
    
    down)
        print_header "Stopping All Services"
        docker-compose down
        print_success "All services stopped and removed"
        ;;
    
    logs)
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
        docker-compose logs -f
        ;;
    
    logs-gateway)
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
        docker-compose logs -f gateway
        ;;
    
    logs-dashboard)
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
        docker-compose logs -f dashboard
        ;;
    
    logs-team-a)
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
        docker-compose logs -f team-a
        ;;
    
    logs-team-b)
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
        docker-compose logs -f team-b
        ;;
    
    logs-team-c)
        echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
        docker-compose logs -f team-c
        ;;
    
    ps)
        print_header "Service Status"
        docker-compose ps
        ;;
    
    restart)
        print_header "Restarting All Services"
        docker-compose restart
        print_success "All services restarted"
        sleep 2
        docker-compose ps
        ;;
    
    build)
        print_header "Building All Images"
        docker-compose build
        print_success "All images built successfully"
        ;;
    
    build-gateway)
        print_header "Building Gateway Image"
        docker-compose build gateway
        print_success "Gateway image built successfully"
        ;;
    
    build-dashboard)
        print_header "Building Dashboard Image"
        docker-compose build dashboard
        print_success "Dashboard image built successfully"
        ;;
    
    build-mcp)
        print_header "Building MCP Servers Image"
        docker-compose build team-a team-b team-c
        print_success "MCP servers images built successfully"
        ;;
    
    shell-gateway)
        print_header "Opening shell in gateway container"
        docker-compose exec gateway sh
        ;;
    
    shell-dashboard)
        print_header "Opening shell in dashboard container"
        docker-compose exec dashboard sh
        ;;
    
    shell-team-a)
        print_header "Opening shell in Team A container"
        docker-compose exec team-a bash
        ;;
    
    test)
        test_services
        ;;
    
    help | --help | -h)
        show_help
        ;;
    
    *)
        print_error "Unknown command: $CMD"
        echo ""
        show_help
        exit 1
        ;;
esac
