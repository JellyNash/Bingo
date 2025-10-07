# Bingo Development Environment Scripts

This directory contains platform-specific scripts for managing the Bingo development environment with proper DevOps practices and reliable process management.

## Scripts Overview

### 1. `RunDev.bat` - Windows Batch Script
**Platform**: Windows Command Prompt
**Usage**: `RunDev.bat`
**Features**:
- Enhanced port cleanup with retry logic
- Docker health checks with proper timeout
- Improved log file handling with proper encoding
- Process management with PID tracking

### 2. `restart-dev.ps1` - PowerShell Script
**Platform**: Windows PowerShell 5.0+
**Usage**: `.\restart-dev.ps1`
**Features**:
- Advanced process cleanup using `Get-NetTCPConnection`
- Real-time log streaming with proper error handling
- Service monitoring with automatic failure detection
- Comprehensive Docker service management

### 3. `rundev.sh` - Bash Shell Script
**Platform**: Linux/macOS/WSL
**Usage**: `./rundev.sh`
**Features**:
- POSIX-compliant with strict error handling (`set -euo pipefail`)
- Enhanced file permissions management
- Signal-based cleanup handlers
- Advanced process monitoring with service identification

## Service Architecture

The development environment consists of:

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │
│                 │    │                 │
│ • Console:5174  │    │ • API:3000      │
│ • Screen:5173   │    │ • Realtime:4000 │
│ • Player:5175   │    │                 │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
        ┌─────────────────┐
        │ Infrastructure  │
        │                 │
        │ • Postgres:5432 │
        │ • Redis:6379    │
        └─────────────────┘
```

## DevOps Best Practices Implemented

### 1. **Proper Process Management**

#### Problem: Services getting killed unexpectedly
**Solution**:
- Implement proper PID tracking in arrays
- Use graceful termination (SIGTERM) before force kill (SIGKILL)
- Add retry logic for process cleanup
- Monitor process health continuously

```bash
# Enhanced process cleanup with retry logic
for port in "${ports[@]}"; do
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
```

### 2. **Log File Permission Handling**

#### Problem: "Permission denied" errors on log files
**Solution**:
- Explicitly set directory permissions (755) and file permissions (644)
- Recreate log directory on each run to avoid permission conflicts
- Use proper file creation with `touch` and `chmod`

```bash
# Create log directory with proper permissions
mkdir -p "$LOG_DIR"
chmod 755 "$LOG_DIR"

# Create initial log files with proper permissions
touch "$CONSOLE_LOG" "$SCREEN_LOG" "$PLAYER_LOG" "$API_LOG" "$REALTIME_LOG"
chmod 644 "$CONSOLE_LOG" "$SCREEN_LOG" "$PLAYER_LOG" "$API_LOG" "$REALTIME_LOG"
```

### 3. **Service Startup Order & Race Conditions**

#### Problem: Services starting before dependencies are ready
**Solution**:
- Implement proper Docker health checks with timeout
- Add staged startup with dependency validation
- Use proper waiting mechanisms for service readiness

```bash
# Wait for Docker services with health checks
while [ $elapsed -lt $timeout ]; do
    if docker compose -f docker-compose.dev.yml ps --status running | grep -q postgres && \
       docker compose -f docker-compose.dev.yml ps --status running | grep -q redis; then
        echo "Docker services are ready."
        return 0
    fi
    sleep 2
    ((elapsed += 2))
done
```

### 4. **Port Cleanup & Resource Management**

#### Problem: Ports not being freed properly before restart
**Solution**:
- Enhanced port cleanup with multiple attempts
- Use proper signal handling (SIGTERM → SIGKILL progression)
- Implement timeout-based cleanup for Docker services

```powershell
# PowerShell: Kill processes on specific ports
$ports = @(5173, 5174, 5175, 3000, 4000)
foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                 Select-Object -ExpandProperty OwningProcess
    foreach ($pid in $processes) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}
```

### 5. **Error Handling & Retry Logic**

#### Problem: Scripts failing without proper error reporting
**Solution**:
- Comprehensive error handling with specific exit codes
- Retry logic for transient failures
- Detailed error messages with troubleshooting hints

```bash
# Enhanced dependency installation with error handling
install_dependencies() {
    if ! pnpm install --recursive --prefer-offline --reporter=silent; then
        echo "[ERROR] Failed to install dependencies."
        exit 1
    fi
    echo "[SUCCESS] Dependencies installed successfully."
}
```

## Configuration Requirements

### Environment Variables
```bash
# Required for proper operation
NODE_ENV=development
DATABASE_URL=postgresql://bingo:bingo@localhost:5432/bingo
REDIS_URL=redis://localhost:6379
```

### System Requirements
- **Docker**: Required for Postgres and Redis
- **Node.js**: 20.0.0 or higher
- **pnpm**: 8.0.0 or higher (specified in package.json)

### Workspace Configuration
The scripts use the following pnpm workspace filters:
- `@bingo/console` - React console application
- `@bingo/screen` - React screen display application
- `@bingo/player` - React player interface
- `bingo-api` - Fastify API server
- `@bingo/realtime` - Socket.io realtime server

## Troubleshooting Guide

### Common Issues

#### 1. **"Permission denied" on log files**
```bash
# Solution: Ensure proper permissions
chmod 755 /path/to/dev-logs
chmod 644 /path/to/dev-logs/*.log
```

#### 2. **Services not starting**
```bash
# Check log files for specific errors
tail -f dev-logs/api.log
tail -f dev-logs/console.log
```

#### 3. **Port conflicts**
```bash
# Find processes using required ports
lsof -i :5173 -i :5174 -i :5175 -i :3000 -i :4000
```

#### 4. **Docker services not ready**
```bash
# Check Docker service status
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs postgres
docker compose -f docker-compose.dev.yml logs redis
```

#### 5. **Prisma client generation fails**
```bash
# Manual Prisma generation
cd backend/api
pnpm prisma generate
```

### Performance Optimization

1. **Use `--prefer-offline` for pnpm** to reduce network requests
2. **Use `--reporter=silent`** to reduce log noise during installation
3. **Implement proper timeout values** for health checks (30 seconds)
4. **Use staged startup** (Docker → Dependencies → Prisma → Services)

## Monitoring & Logging

### Log Files Location
All logs are stored in `/dev-logs/` directory:
- `console.log` - Frontend console application logs
- `screen.log` - Frontend screen application logs
- `player.log` - Frontend player application logs
- `api.log` - Backend API server logs
- `realtime.log` - Realtime server logs

### Service Monitoring
The scripts include built-in monitoring that:
- Checks service health every 30 seconds
- Identifies which specific services have failed
- Provides clear error messages with troubleshooting hints
- Handles graceful shutdown on script termination

### Signal Handling
Proper signal handling is implemented for:
- `SIGINT` (Ctrl+C) - Graceful shutdown
- `SIGTERM` - Graceful shutdown
- `EXIT` - Cleanup on script exit

## Development Workflow

### Starting Development Environment
```bash
# Choose your platform-specific script:

# Windows Command Prompt
RunDev.bat

# Windows PowerShell
.\restart-dev.ps1

# Linux/macOS/WSL
./rundev.sh
```

### Stopping Services
- **Graceful**: Press `Ctrl+C` in the script terminal
- **Force**: Use platform-specific process management tools

### Monitoring Services
All scripts provide real-time monitoring with:
- Service health status
- Process identification numbers (PIDs)
- Log file locations
- Service URLs and ports

This comprehensive DevOps approach ensures reliable, repeatable development environment management across all platforms.