# Bingo Development Environment Launcher
# PowerShell version for improved reliability

$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$LogDir = Join-Path $RepoRoot "dev-logs"

# Colors for output
$Host.UI.RawUI.ForegroundColor = "White"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   BINGO DEV ENVIRONMENT LAUNCHER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create or clean log directory
if (Test-Path $LogDir) {
    Write-Host "[dev-refresh] Cleaning old logs..." -ForegroundColor Yellow
    Remove-Item "$LogDir\*.log" -Force -ErrorAction SilentlyContinue
} else {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

# Stop existing processes
Write-Host "[dev-refresh] Stopping existing dev processes..." -ForegroundColor Yellow

# Kill processes on specific ports
$ports = @(5173, 5174, 5175, 3000, 4000)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

# Kill any node processes with our window titles
Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -match "Bingo (Console|Screen|Player|API|Realtime)"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "[dev-refresh] Restarting Docker services..." -ForegroundColor Yellow
Set-Location $RepoRoot

# Stop and restart docker services
docker compose -f docker-compose.dev.yml down --remove-orphans 2>$null
docker compose -f docker-compose.dev.yml up -d postgres redis

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start Docker services. Make sure Docker is running." -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null
    exit 1
}

# Wait for services
Write-Host "[dev-refresh] Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "[dev-refresh] Installing dependencies..." -ForegroundColor Yellow
& pnpm install --recursive --prefer-offline

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install dependencies." -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null
    exit 1
}

Write-Host ""
Write-Host "[dev-refresh] Generating Prisma client..." -ForegroundColor Yellow
Push-Location "$RepoRoot\backend\api"
& npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Failed to generate Prisma client, continuing anyway..." -ForegroundColor Yellow
}
Pop-Location

Write-Host ""
Write-Host "[dev-refresh] Starting development servers..." -ForegroundColor Green
Write-Host ""

# Function to start a service
function Start-Service {
    param(
        [string]$Name,
        [string]$Filter,
        [string]$Port,
        [string]$LogFile,
        [string]$Url
    )

    Write-Host "[dev-refresh] Starting $Name on $Url" -ForegroundColor Green

    $scriptBlock = {
        param($RepoRoot, $Filter, $LogFile)
        Set-Location $RepoRoot
        & pnpm --filter $Filter dev 2>&1 | Out-File -FilePath $LogFile -Encoding UTF8
    }

    Start-Job -Name "Bingo $Name" -ScriptBlock $scriptBlock -ArgumentList $RepoRoot, $Filter, $LogFile | Out-Null
    Start-Sleep -Milliseconds 500
}

# Start all services
Start-Service -Name "Console" -Filter "@bingo/console" -Port "5174" `
              -LogFile "$LogDir\console.log" -Url "http://localhost:5174"

Start-Service -Name "Screen" -Filter "@bingo/screen" -Port "5173" `
              -LogFile "$LogDir\screen.log" -Url "http://localhost:5173"

Start-Service -Name "Player" -Filter "@bingo/player" -Port "5175" `
              -LogFile "$LogDir\player.log" -Url "http://localhost:5175"

Start-Service -Name "API" -Filter "bingo-api" -Port "3000" `
              -LogFile "$LogDir\api.log" -Url "http://localhost:3000"

Start-Service -Name "Realtime" -Filter "@bingo/realtime" -Port "4000" `
              -LogFile "$LogDir\realtime.log" -Url "ws://localhost:4000"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ALL SERVICES LAUNCHING..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Console  : http://localhost:5174" -ForegroundColor White
Write-Host "  Screen   : http://localhost:5173" -ForegroundColor White
Write-Host "  Player   : http://localhost:5175" -ForegroundColor White
Write-Host "  API      : http://localhost:3000" -ForegroundColor White
Write-Host "  Realtime : ws://localhost:4000" -ForegroundColor White
Write-Host ""
Write-Host "  Logs     : $LogDir" -ForegroundColor Gray
Write-Host ""
Write-Host "[dev-refresh] Services are starting up..." -ForegroundColor Yellow
Write-Host "[dev-refresh] Wait 5-10 seconds for all services to be ready." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Magenta
Write-Host ""

# Monitor jobs
try {
    while ($true) {
        $jobs = Get-Job -Name "Bingo *" -ErrorAction SilentlyContinue

        # Check if any job has failed
        $failedJobs = $jobs | Where-Object { $_.State -eq "Failed" }
        if ($failedJobs) {
            Write-Host ""
            Write-Host "[ERROR] Some services failed to start:" -ForegroundColor Red
            $failedJobs | ForEach-Object {
                Write-Host "  - $($_.Name): $($_.ChildJobs[0].Error)" -ForegroundColor Red
            }
            Write-Host ""
            Write-Host "Check the log files in: $LogDir" -ForegroundColor Yellow
        }

        Start-Sleep -Seconds 30
    }
} finally {
    # Cleanup on exit
    Write-Host ""
    Write-Host "[dev-refresh] Stopping all services..." -ForegroundColor Yellow

    # Stop all jobs
    Get-Job -Name "Bingo *" | Stop-Job -PassThru | Remove-Job

    # Stop docker services
    docker compose -f docker-compose.dev.yml down 2>$null

    Write-Host "[dev-refresh] All services stopped." -ForegroundColor Green
}