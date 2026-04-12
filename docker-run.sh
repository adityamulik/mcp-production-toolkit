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

Usage: ./docker-run.sh [COMMAND] [SERVICE]

Commands:
  up [SERVICE]       Start services (all if no service specified)
  up-only SERVICE    Start a single service without dependencies
  down [SERVICE]     Stop services (all if no service specified)
  logs [SERVICE]     View logs (all services if no service specified)
  ps                 Show status of all running services
  restart [SERVICE]  Restart services (all if no service specified)
  build [SERVICE]    Build images (all if no service specified)
  shell SERVICE      Open shell in a container
  test               Test all services are running
  help               Show this help message

Services:
  gateway    - Security gateway & API endpoint (port 3000)
  dashboard  - Web dashboard UI (port 5173)
  team-a     - Analytics MCP server (port 8001)
  team-b     - DevOps MCP server (port 8002)
  team-c     - Developer MCP server (port 8003)

Examples:
  # Start all services
  ./docker-run.sh up

  # Start only gateway
  ./docker-run.sh up gateway

  # Start team-a with its dependencies
  ./docker-run.sh up team-a

  # Start just team-b without dependencies
  ./docker-run.sh up-only team-b

  # View logs from gateway
  ./docker-run.sh logs gateway

  # Restart dashboard
  ./docker-run.sh restart dashboard

  # Open shell in team-a
  ./docker-run.sh shell team-a
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
# Main command handling
CMD="${1:-help}"
SERVICE="${2}"

# Validate service name if provided
validate_service() {
    case "$1" in
        gateway|dashboard|team-a|team-b|team-c)
            return 0
            ;;
        *)
            print_error "Unknown service: $1"
            echo "Valid services: gateway, dashboard, team-a, team-b, team-c"
            exit 1
            ;;
    esac
}

# Get service dependencies for startup order
get_service_deps() {
    case "$1" in
        gateway)
            echo "team-a team-b team-c gateway"
            ;;
        dashboard)
            echo "team-a team-b team-c gateway dashboard"
            ;;
        team-a|team-b|team-c)
            echo "$1"
            ;;
    esac
}

case "$CMD" in
    up)
        if [ -n "$SERVICE" ]; then
            validate_service "$SERVICE"
            SERVICES=$(get_service_deps "$SERVICE")
            print_header "Starting $SERVICE (with dependencies)"
            docker-compose up -d $SERVICES
            print_success "$SERVICE started"
        else
            print_header "Starting MCP Production Toolkit"
            docker-compose up -d
            print_success "All services started"
        fi
        sleep 3
        test_services
        echo ""
        echo -e "${GREEN}Services running at:${NC}"
        echo "  Gateway:   http://localhost:3000"
        echo "  Dashboard: http://localhost:5173"
        ;;
    
    up-only)
        if [ -z "$SERVICE" ]; then
            print_error "SERVICE required for up-only"
            echo "Usage: ./docker-run.sh up-only SERVICE"
            exit 1
        fi
        validate_service "$SERVICE"
        print_header "Starting $SERVICE (without dependencies)"
        docker-compose up -d "$SERVICE"
        print_success "$SERVICE started"
        ;;
    
    down)
        if [ -n "$SERVICE" ]; then
            validate_service "$SERVICE"
            print_header "Stopping $SERVICE"
            docker-compose down "$SERVICE"
            print_success "$SERVICE stopped"
        else
            print_header "Stopping All Services"
            docker-compose down
            print_success "All services stopped"
        fi
        ;;
    
    logs)
        if [ -n "$SERVICE" ]; then
            validate_service "$SERVICE"
            echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
            docker-compose logs -f "$SERVICE"
        else
            echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
            docker-compose logs -f
        fi
        ;;
    
    ps)
        print_header "Service Status"
        docker-compose ps
        ;;
    
    restart)
        if [ -n "$SERVICE" ]; then
            validate_service "$SERVICE"
            print_header "Restarting $SERVICE"
            docker-compose restart "$SERVICE"
            print_success "$SERVICE restarted"
        else
            print_header "Restarting All Services"
            docker-compose restart
            print_success "All services restarted"
        fi
        sleep 2
        docker-compose ps
        ;;
    
    build)
        if [ -n "$SERVICE" ]; then
            validate_service "$SERVICE"
            print_header "Building $SERVICE Image"
            docker-compose build "$SERVICE"
            print_success "$SERVICE image built"
        else
            print_header "Building All Images"
            docker-compose build
            print_success "All images built"
        fi
        ;;
    
    shell)
        if [ -z "$SERVICE" ]; then
            print_error "SERVICE required for shell"
            echo "Usage: ./docker-run.sh shell SERVICE"
            exit 1
        fi
        validate_service "$SERVICE"
        print_header "Opening shell in $SERVICE container"
        SHELL_CMD="sh"
        [ "$SERVICE" = "team-a" ] && SHELL_CMD="bash"
        docker-compose exec "$SERVICE" "$SHELL_CMD"
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
