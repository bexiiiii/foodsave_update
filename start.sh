#!/bin/bash

# FoodSave Docker Control Script
# Usage: ./start.sh [command]
# Commands: up, down, build, logs, restart, clean

set -e

COMPOSE_FILE="docker-compose.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}   FoodSave Docker Manager${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Create .env file if not exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found, copying from .env.example"
    cp .env.example .env
    print_info "Created .env file - check if values are correct!"
fi

case "$1" in
    up)
        print_header
        print_info "Starting all services..."
        docker compose -f $COMPOSE_FILE up -d
        echo ""
        print_info "Services started!"
        echo ""
        echo -e "${GREEN}Services:${NC}"
        echo "  Mini App:     http://localhost:3000  (or https://miniapp.foodsave.kz)"
        echo "  Admin Panel:  http://localhost:3001  (or https://admin.foodsave.kz)"
        echo "  Backend API:  http://localhost:8080  (or https://foodsave.kz)"
        echo ""
        echo -e "${YELLOW}External services (already running):${NC}"
        echo "  PostgreSQL:   10.114.0.4:5432"
        echo "  Redis:        10.114.0.4:6379"
        ;;
    
    down)
        print_info "Stopping all services..."
        docker compose -f $COMPOSE_FILE down
        print_info "Services stopped!"
        ;;
    
    build)
        print_info "Building all services..."
        docker compose -f $COMPOSE_FILE build --no-cache
        print_info "Build complete!"
        ;;
    
    rebuild)
        print_info "Rebuilding and restarting all services..."
        docker compose -f $COMPOSE_FILE down
        docker compose -f $COMPOSE_FILE build --no-cache
        docker compose -f $COMPOSE_FILE up -d
        print_info "Rebuild complete!"
        print_info "Mini App: http://localhost:3000"
        print_info "Admin Panel: http://localhost:3001"
        print_info "Backend API: http://localhost:8080"
        ;;
    
    logs)
        if [ -z "$2" ]; then
            docker compose -f $COMPOSE_FILE logs -f
        else
            docker compose -f $COMPOSE_FILE logs -f $2
        fi
        ;;
    
    restart)
        print_info "Restarting all services..."
        docker compose -f $COMPOSE_FILE restart
        print_info "Services restarted!"
        ;;
    
    clean)
        print_warning "This will remove all containers, volumes, and images for this project"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker compose -f $COMPOSE_FILE down -v --rmi all
            print_info "Cleanup complete!"
        fi
        ;;
    
    status)
        docker compose -f $COMPOSE_FILE ps
        ;;
    
    *)
        echo ""
        echo "FoodSave Docker Control Script"
        echo ""
        echo "Usage: $0 {up|down|build|rebuild|logs|restart|clean|status}"
        echo ""
        echo "Commands:"
        echo "  up       - Start all services"
        echo "  down     - Stop all services"
        echo "  build    - Build all images"
        echo "  rebuild  - Rebuild and restart all services"
        echo "  logs     - Show logs (optionally: logs [service_name])"
        echo "  restart  - Restart all services"
        echo "  clean    - Remove all containers, volumes and images"
        echo "  status   - Show service status"
        echo ""
        echo "Services will be available at:"
        echo "  Mini App:     http://localhost:3000  -> https://miniapp.foodsave.kz"
        echo "  Admin Panel:  http://localhost:3001  -> https://admin.foodsave.kz"
        echo "  Backend API:  http://localhost:8080  -> https://foodsave.kz"
        echo ""
        echo "External services (already configured):"
        echo "  PostgreSQL:   10.114.0.4:5432 (user: behruz, db: foodsave)"
        echo "  Redis:        10.114.0.4:6379"
        ;;
esac
