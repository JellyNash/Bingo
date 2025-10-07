#!/usr/bin/env bash

# Bingo Development Environment Launcher
# Enhanced shell script for Linux/macOS/WSL with proper error handling and process management

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'
readonly GRAY='\033[0;37m'
readonly NC='\033[0m' # No Color

# Get script directory and repo root
readonly SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
readonly REPO_ROOT="$(dirname "$SCRIPT_DIR")"
readonly LOG_DIR="$REPO_ROOT/dev-logs"

# Define log files
readonly CONSOLE_LOG="$LOG_DIR/console.log"
readonly SCREEN_LOG="$LOG_DIR/screen.log"
readonly PLAYER_LOG="$LOG_DIR/player.log"
readonly API_LOG="$LOG_DIR/api.log"
readonly REALTIME_LOG="$LOG_DIR/realtime.log"

# Process tracking array
declare -a SERVICE_PIDS=()

# Change to repo root
cd "$REPO_ROOT"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}   BINGO DEV ENVIRONMENT LAUNCHER${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Create log directory with proper permissions
create_log_directory() {
    if [ -d "$LOG_DIR" ]; then
        echo -e "${YELLOW}[dev-refresh] Cleaning old logs...${NC}"
        rm -rf "$LOG_DIR"
    fi

    mkdir -p "$LOG_DIR"
    chmod 755 "$LOG_DIR"

    # Create initial log files with proper permissions
    touch "$CONSOLE_LOG" "$SCREEN_LOG" "$PLAYER_LOG" "$API_LOG" "$REALTIME_LOG"
    chmod 644 "$CONSOLE_LOG" "$SCREEN_LOG" "$PLAYER_LOG" "$API_LOG" "$REALTIME_LOG"
}

# Enhanced process cleanup function
cleanup_processes() {
    echo -e "${YELLOW}[dev-refresh] Stopping existing dev processes...${NC}"

    # Kill processes on specific ports with retry logic
    local ports=(5173 5174 5175 3000 4000)
    for port in "${ports[@]}"; do
        echo -e "${GRAY}  Cleaning port $port...${NC}"
        local attempts=0
        while [ $attempts -lt 3 ]; do
            local pid=$(lsof -ti ":$port" 2>/dev/null || true)
            if [ -n "$pid" ]; then
                kill -TERM "$pid" 2>/dev/null || true
                sleep 1
                if ! kill -0 "$pid" 2>/dev/null; then
                    break
                fi
                if [ $attempts -eq 2 ]; then
                    kill -KILL "$pid" 2>/dev/null || true
                fi
            else
                break
            fi
            ((attempts++))
        done
    done

    # Kill remaining development processes
    pkill -f "pnpm.*dev" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "tsx.*server.ts" 2>/dev/null || true

    sleep 2
}

# Docker service management with health checks
manage_docker_services() {
    echo -e "${YELLOW}[dev-refresh] Managing Docker services...${NC}"

    # Stop existing services gracefully
    docker compose -f docker-compose.dev.yml down --remove-orphans --timeout 10 2>/dev/null || true

    # Start only required services
    echo -e "${YELLOW}[dev-refresh] Starting postgres and redis...${NC}"
    if ! docker compose -f docker-compose.dev.yml up -d postgres redis; then
        echo -e "${RED}[ERROR] Failed to start Docker services. Make sure Docker is running.${NC}"
        exit 1
    fi

    # Wait for services to be healthy with timeout
    echo -e "${YELLOW}[dev-refresh] Waiting for Docker services to be ready...${NC}"
    local timeout=30
    local elapsed=0

    while [ $elapsed -lt $timeout ]; do
        if docker compose -f docker-compose.dev.yml ps --status running | grep -q postgres && \
           docker compose -f docker-compose.dev.yml ps --status running | grep -q redis; then
            echo -e "${GREEN}[dev-refresh] Docker services are ready.${NC}"
            return 0
        fi
        sleep 2
        ((elapsed += 2))
    done

    echo -e "${RED}[ERROR] Docker services failed to start within timeout period.${NC}"
    exit 1
}

# Enhanced dependency installation
install_dependencies() {
    echo -e "${YELLOW}[dev-refresh] Installing workspace dependencies...${NC}"

    if ! pnpm install --recursive --prefer-offline --reporter=silent; then
        echo -e "${RED}[ERROR] Failed to install dependencies.${NC}"
        exit 1
    fi

    echo -e "${GREEN}[dev-refresh] Dependencies installed successfully.${NC}"
}

# Prisma client generation with error handling
initialize_prisma() {
    echo -e "${YELLOW}[dev-refresh] Generating Prisma client...${NC}"

    cd "$REPO_ROOT/backend/api"
    if pnpm prisma generate; then
        echo -e "${GREEN}[dev-refresh] Prisma client generated successfully.${NC}"
    else
        echo -e "${YELLOW}[WARNING] Prisma client generation failed, continuing anyway...${NC}"
    fi
    cd "$REPO_ROOT"
}

# Enhanced service starter with proper logging and error handling
start_service() {
    local name="$1"
    local filter="$2"
    local port="$3"
    local log_file="$4"
    local url="$5"

    echo -e "${GREEN}[dev-refresh] Starting $name on $url${NC}"
    echo -e "${GRAY}  Logs: $log_file${NC}"

    # Ensure log file exists with proper permissions
    touch "$log_file"
    chmod 644 "$log_file"

    # Start service in background with proper error handling
    (
        cd "$REPO_ROOT"
        exec pnpm --filter "$filter" dev 2>&1
    ) > "$log_file" &

    local pid=$!
    SERVICE_PIDS+=($pid)

    # Give service time to start and check if it's still running
    sleep 2
    if ! kill -0 "$pid" 2>/dev/null; then
        echo -e "${RED}[ERROR] Failed to start $name (PID: $pid)${NC}"
        echo -e "${YELLOW}Check log file: $log_file${NC}"
        return 1
    fi

    echo -e "${GREEN}  Started $name (PID: $pid)${NC}"
    return 0
}

# Cleanup function for script exit
cleanup_on_exit() {
    echo ""
    echo -e "${YELLOW}[dev-refresh] Stopping all services...${NC}"

    # Stop all tracked service processes
    for pid in "${SERVICE_PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${GRAY}  Stopping process $pid...${NC}"
            kill -TERM "$pid" 2>/dev/null || true
        fi
    done

    # Wait a moment for graceful shutdown
    sleep 2

    # Force kill any remaining processes
    for pid in "${SERVICE_PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill -KILL "$pid" 2>/dev/null || true
        fi
    done

    # Clean up ports one more time
    cleanup_processes

    # Stop docker services
    docker compose -f docker-compose.dev.yml down 2>/dev/null || true

    echo -e "${GREEN}[dev-refresh] All services stopped.${NC}"
    exit 0
}

# Monitor services function
monitor_services() {
    echo -e "${YELLOW}[dev-refresh] Monitoring services...${NC}"

    while true; do
        local running_count=0
        local failed_services=()

        for i in "${!SERVICE_PIDS[@]}"; do
            local pid="${SERVICE_PIDS[$i]}"
            if kill -0 "$pid" 2>/dev/null; then
                ((running_count++))
            else
                # Identify which service failed
                case $i in
                    0) failed_services+=("Console") ;;
                    1) failed_services+=("Screen") ;;
                    2) failed_services+=("Player") ;;
                    3) failed_services+=("API") ;;
                    4) failed_services+=("Realtime") ;;
                esac
            fi
        done

        if [ $running_count -eq 0 ]; then
            echo ""
            echo -e "${RED}[ERROR] All services have stopped unexpectedly.${NC}"
            echo -e "${YELLOW}Failed services: ${failed_services[*]}${NC}"
            echo -e "${YELLOW}Check the log files in: $LOG_DIR${NC}"
            exit 1
        elif [ ${#failed_services[@]} -gt 0 ]; then
            echo -e "${YELLOW}[WARNING] Some services have failed: ${failed_services[*]}${NC}"
            echo -e "${GRAY}  $running_count/${#SERVICE_PIDS[@]} services still running...${NC}"
        else
            echo -e "${GRAY}  All $running_count services running normally...${NC}"
        fi

        sleep 30
    done
}

# Set up signal handlers for cleanup
trap cleanup_on_exit EXIT INT TERM

# Main execution sequence
main() {
    create_log_directory
    cleanup_processes
    manage_docker_services
    install_dependencies
    initialize_prisma

    echo ""
    echo -e "${GREEN}[dev-refresh] Starting development servers...${NC}"
    echo ""

    # Start all services with error checking
    start_service "Console" "@bingo/console" 5174 "$CONSOLE_LOG" "http://localhost:5174" || exit 1
    start_service "Screen" "@bingo/screen" 5173 "$SCREEN_LOG" "http://localhost:5173" || exit 1
    start_service "Player" "@bingo/player" 5175 "$PLAYER_LOG" "http://localhost:5175" || exit 1
    start_service "API" "bingo-api" 3000 "$API_LOG" "http://localhost:3000" || exit 1
    start_service "Realtime" "@bingo/realtime" 4000 "$REALTIME_LOG" "ws://localhost:4000" || exit 1

    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}   ALL SERVICES LAUNCHING...${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
    echo -e "  Console  : ${NC}http://localhost:5174"
    echo -e "  Screen   : ${NC}http://localhost:5173"
    echo -e "  Player   : ${NC}http://localhost:5175"
    echo -e "  API      : ${NC}http://localhost:3000"
    echo -e "  Realtime : ${NC}ws://localhost:4000"
    echo ""
    echo -e "  ${GRAY}Logs Directory: $LOG_DIR${NC}"
    echo ""
    echo -e "${YELLOW}[dev-refresh] Services are starting up...${NC}"
    echo -e "${YELLOW}[dev-refresh] Wait 5-10 seconds for all services to be ready.${NC}"
    echo ""
    echo -e "${MAGENTA}Press Ctrl+C to stop all services${NC}"
    echo ""

    # Start monitoring
    monitor_services
}

# Execute main function
main "$@"