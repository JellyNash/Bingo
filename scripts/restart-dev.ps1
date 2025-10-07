$ErrorActionPreference = "Stop"

# PowerShell script for Bingo Development Environment
# Enhanced version with proper error handling, port cleanup, and service management

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $root "..")
$repo = $root.Path
$logDir = Join-Path $repo "dev-logs"

# Define log files
$consoleLog = Join-Path $logDir "console.log"
$screenLog = Join-Path $logDir "screen.log"
$playerLog = Join-Path $logDir "player.log"
$apiLog = Join-Path $logDir "api.log"
$realtimeLog = Join-Path $logDir "realtime.log"

# Clean and recreate log directory
if (Test-Path $logDir) {
    Remove-Item -Path $logDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   BINGO DEV ENVIRONMENT LAUNCHER" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Enhanced process cleanup function
function Stop-DevProcesses {
    Write-Host "[dev-refresh] Stopping existing development processes..." -ForegroundColor Yellow

    # Kill processes on specific ports
    $ports = @(5173, 5174, 5175, 3000, 4000)
    foreach ($port in $ports) {
        Write-Host "  Cleaning port $port..." -ForegroundColor Gray
        $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                     Select-Object -ExpandProperty OwningProcess
        foreach ($pid in $processes) {
            try {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            } catch {
                # Ignore errors for already stopped processes
            }
        }
    }

    # Kill all Node.js and pnpm processes
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "pnpm" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

    Start-Sleep -Seconds 2
}

# Docker service management function
function Start-DockerServices {
    Write-Host "`n[dev-refresh] Managing Docker services..." -ForegroundColor Yellow
    Set-Location $repo

    try {
        & docker compose -f docker-compose.dev.yml down --remove-orphans --timeout 10 2>$null
        & docker compose -f docker-compose.dev.yml up -d postgres redis

        # Wait for services to be healthy
        Write-Host "[dev-refresh] Waiting for Docker services to be ready..." -ForegroundColor Yellow
        $timeout = 30
        $elapsed = 0
        do {
            Start-Sleep -Seconds 2
            $elapsed += 2
            $running = & docker compose -f docker-compose.dev.yml ps --status running --format json | ConvertFrom-Json
            $postgresRunning = $running | Where-Object { $_.Service -eq "postgres" }
            $redisRunning = $running | Where-Object { $_.Service -eq "redis" }
        } while ((-not $postgresRunning -or -not $redisRunning) -and $elapsed -lt $timeout)

        if ($elapsed -ge $timeout) {
            throw "Docker services failed to start within timeout period"
        }

        Write-Host "[dev-refresh] Docker services are ready." -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to start Docker services: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Make sure Docker Desktop is running and try again." -ForegroundColor Red
        exit 1
    }
}

# Enhanced dependency installation
function Install-Dependencies {
    Write-Host "`n[dev-refresh] Installing workspace dependencies..." -ForegroundColor Yellow
    try {
        & pnpm install --recursive --prefer-offline --reporter=silent
        if ($LASTEXITCODE -ne 0) {
            throw "pnpm install failed with exit code $LASTEXITCODE"
        }
        Write-Host "[dev-refresh] Dependencies installed successfully." -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to install dependencies: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Prisma client generation
function Initialize-Prisma {
    Write-Host "`n[dev-refresh] Generating Prisma client..." -ForegroundColor Yellow
    Set-Location (Join-Path $repo "backend\api")
    try {
        & pnpm prisma generate
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[WARNING] Prisma client generation failed, continuing anyway..." -ForegroundColor Yellow
        } else {
            Write-Host "[dev-refresh] Prisma client generated successfully." -ForegroundColor Green
        }
    } catch {
        Write-Host "[WARNING] Prisma client generation failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    Set-Location $repo
}

# Enhanced frontend service starter
function Start-Frontend($serviceName, $filter, $port, $logFile) {
    Write-Host "`n[dev-refresh] Starting $serviceName on http://localhost:$port" -ForegroundColor Green
    Write-Host "  Logs: $logFile" -ForegroundColor Gray

    # Create empty log file
    New-Item -Path $logFile -ItemType File -Force | Out-Null

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "pnpm"
    $psi.Arguments = "--filter $filter dev"
    $psi.WorkingDirectory = $repo
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi

    # Set up logging
    $process.add_OutputDataReceived({
        param($sender, $e)
        if ($e.Data) {
            Add-Content -Path $logFile -Value $e.Data
        }
    })

    $process.add_ErrorDataReceived({
        param($sender, $e)
        if ($e.Data) {
            Add-Content -Path $logFile -Value "ERROR: $($e.Data)"
        }
    })

    try {
        $process.Start() | Out-Null
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()

        # Give the process time to start
        Start-Sleep -Seconds 1

        return $process
    } catch {
        Write-Host "[ERROR] Failed to start $serviceName: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Main execution
try {
    Stop-DevProcesses
    Start-DockerServices
    Install-Dependencies
    Initialize-Prisma

    Write-Host "`n[dev-refresh] Starting development servers..." -ForegroundColor Green

    # Start all frontend services
    $processes = @()
    $processes += Start-Frontend "Console" "@bingo/console" 5174 $consoleLog
    $processes += Start-Frontend "Screen" "@bingo/screen" 5173 $screenLog
    $processes += Start-Frontend "Player" "@bingo/player" 5175 $playerLog
    $processes += Start-Frontend "API" "bingo-api" 3000 $apiLog
    $processes += Start-Frontend "Realtime" "@bingo/realtime" 4000 $realtimeLog

    # Remove null processes (failed starts)
    $processes = $processes | Where-Object { $_ -ne $null }

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "   ALL SERVICES LAUNCHING..." -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "`n  Console  : http://localhost:5174" -ForegroundColor White
    Write-Host "  Screen   : http://localhost:5173" -ForegroundColor White
    Write-Host "  Player   : http://localhost:5175" -ForegroundColor White
    Write-Host "  API      : http://localhost:3000" -ForegroundColor White
    Write-Host "  Realtime : ws://localhost:4000" -ForegroundColor White
    Write-Host "`n  Logs Directory: $logDir" -ForegroundColor Gray
    Write-Host "`n[dev-refresh] Services are starting up..." -ForegroundColor Yellow
    Write-Host "[dev-refresh] Wait 5-10 seconds for all services to be ready." -ForegroundColor Yellow
    Write-Host "`nPress Ctrl+C to stop all services" -ForegroundColor Magenta

    # Monitor processes
    Write-Host "`nMonitoring services..." -ForegroundColor Yellow
    while ($true) {
        Start-Sleep -Seconds 30

        $runningCount = 0
        foreach ($process in $processes) {
            if (-not $process.HasExited) {
                $runningCount++
            }
        }

        if ($runningCount -eq 0) {
            Write-Host "`n[ERROR] All services have stopped unexpectedly." -ForegroundColor Red
            Write-Host "Check the log files in: $logDir" -ForegroundColor Yellow
            break
        }

        Write-Host "  $runningCount/$($processes.Count) services running..." -ForegroundColor Gray
    }

} catch {
    Write-Host "`n[ERROR] Script execution failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Cleanup function
    Write-Host "`n[dev-refresh] Cleaning up..." -ForegroundColor Yellow
    if ($processes) {
        foreach ($process in $processes) {
            if (-not $process.HasExited) {
                $process.Kill()
            }
        }
    }
}