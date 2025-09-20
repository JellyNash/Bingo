#!/usr/bin/env bash
#
# Bingo Platform Deployment Script
# Quick deployment for offline/cloud profiles
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${PURPLE}========================================${NC}"
    echo -e "${PURPLE}     $1${NC}"
    echo -e "${PURPLE}========================================${NC}"
}

# Default values
PROFILE="offline"
OBSERVABILITY="false"
BUILD="false"
ENV_FILE=".env"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --profile|-p)
            PROFILE="$2"
            shift 2
            ;;
        --observability|-o)
            OBSERVABILITY="true"
            shift
            ;;
        --build|-b)
            BUILD="true"
            shift
            ;;
        --env-file|-e)
            ENV_FILE="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -p, --profile <profile>    Deployment profile (offline|cloud) [default: offline]"
            echo "  -o, --observability        Enable observability stack (Prometheus, Grafana, Loki)"
            echo "  -b, --build               Force rebuild of Docker images"
            echo "  -e, --env-file <file>     Environment file to use [default: .env]"
            echo "  -h, --help                Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

log_header "Bingo Platform Deployment"
log_info "Profile: $PROFILE"
log_info "Observability: $OBSERVABILITY"
log_info "Environment file: $ENV_FILE"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    log_error "Docker Compose is not available. Please install Docker Compose V2."
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    log_warn "Environment file not found: $ENV_FILE"
    log_info "Creating default environment file..."

    if [ "$PROFILE" = "cloud" ]; then
        cp .env.cloud.example "$ENV_FILE" 2>/dev/null || {
            log_error "Cloud environment template not found. Please create .env.cloud.example"
            exit 1
        }
        log_warn "Please edit $ENV_FILE and set your domain and email for TLS certificates"
        exit 1
    else
        cp .env.offline.example "$ENV_FILE" 2>/dev/null || {
            cat > "$ENV_FILE" << 'EOF'
# Bingo Platform - Offline Environment
JWT_SECRET=change-me-to-a-secure-secret
DATABASE_URL=postgresql://bingo:bingo@postgres:5432/bingo
REDIS_URL=redis://redis:6379
EVENT_CHANNEL=bingo:events
GAME_SEED_SECRET=change-me-too
NODE_ENV=production
API_PORT=3000
REALTIME_PORT=4000
DOMAIN=localhost
EMAIL=admin@bingo.local
POSTGRES_PASSWORD=bingo
GRAFANA_ADMIN_PASSWORD=admin
EOF
        }
        log_info "Created default environment file: $ENV_FILE"
        log_warn "Please review and update the secrets in $ENV_FILE"
    fi
fi

# Load environment file
set -a
source "$ENV_FILE"
set +a

# Build profiles string
PROFILES="$PROFILE"
if [ "$OBSERVABILITY" = "true" ]; then
    PROFILES="$PROFILES,obs"
fi

# Build or pull images
if [ "$BUILD" = "true" ]; then
    log_info "Building Docker images..."
    docker compose --profile "$PROFILES" build
else
    log_info "Pulling Docker images..."
    docker compose --profile "$PROFILES" pull 2>/dev/null || {
        log_warn "Some images not found, building locally..."
        docker compose --profile "$PROFILES" build
    }
fi

# Start services
log_info "Starting services with profile: $PROFILES"
docker compose --profile "$PROFILES" up -d

# Wait for services to be ready
log_info "Waiting for services to be healthy..."
sleep 5

# Check service health
log_info "Checking service status..."
docker compose --profile "$PROFILES" ps

# Display access URLs
echo
log_header "Access URLs"

if [ "$PROFILE" = "offline" ]; then
    log_info "Main Screen: ${GREEN}http://localhost/screen${NC} or ${GREEN}http://bingo.local/screen${NC}"
    log_info "Admin Console: ${GREEN}http://localhost/console${NC} or ${GREEN}http://bingo.local/console${NC}"
    log_info "Player App: ${GREEN}http://localhost/player${NC} or ${GREEN}http://bingo.local/player${NC}"
    log_info "API Documentation: ${GREEN}http://localhost/docs${NC}"
else
    log_info "Main Screen: ${GREEN}https://${DOMAIN}/screen${NC}"
    log_info "Admin Console: ${GREEN}https://${DOMAIN}/console${NC}"
    log_info "Player App: ${GREEN}https://${DOMAIN}/player${NC}"
    log_info "API Documentation: ${GREEN}https://${DOMAIN}/docs${NC}"
fi

if [ "$OBSERVABILITY" = "true" ]; then
    log_info "Prometheus: ${GREEN}http://localhost:9090${NC}"
    log_info "Grafana: ${GREEN}http://localhost:3001${NC} (admin/${GRAFANA_ADMIN_PASSWORD:-admin})"
    log_info "Loki: ${GREEN}http://localhost:3100${NC}"
fi

echo
log_header "Useful Commands"
echo "View logs:       docker compose --profile $PROFILES logs -f"
echo "Stop services:   docker compose --profile $PROFILES down"
echo "Backup database: ./scripts/pg-backup.sh"
echo "Health check:    curl http://localhost/health"
echo
log_info "Deployment completed successfully! 🎉"