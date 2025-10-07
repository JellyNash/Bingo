@echo off
setlocal enabledelayedexpansion

pushd %~dp0..\
set REPO=%CD%
set LOGDIR=%REPO%\dev-logs
set CONSOLE_LOG=%LOGDIR%\console.log
set SCREEN_LOG=%LOGDIR%\screen.log
set PLAYER_LOG=%LOGDIR%\player.log
set API_LOG=%LOGDIR%\api.log
set REALTIME_LOG=%LOGDIR%\realtime.log

:: Clean and create log directory with proper permissions
if exist "%LOGDIR%" (
    echo [dev-refresh] Cleaning old logs...
    del /Q "%LOGDIR%\*.log" 2>nul
    rmdir /Q "%LOGDIR%" 2>nul
)
mkdir "%LOGDIR%"

echo.
echo ========================================
echo    BINGO DEV ENVIRONMENT LAUNCHER
echo ========================================
echo.

echo [dev-refresh] Stopping existing dev processes...

:: Enhanced port cleanup with retry logic
for %%p in (5173 5174 5175 3000 4000) do (
    echo [dev-refresh] Cleaning port %%p...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%p ^| findstr LISTENING') do (
        taskkill /PID %%a /F 2>nul >nul
        timeout /t 1 /nobreak >nul
    )
)

:: Kill all node/pnpm processes more aggressively
echo [dev-refresh] Stopping all Node.js development processes...
taskkill /F /IM node.exe 2>nul >nul
taskkill /F /IM pnpm.exe 2>nul >nul
timeout /t 2 /nobreak >nul

echo.
echo [dev-refresh] Restarting Docker services...
docker compose -f docker-compose.dev.yml down --remove-orphans --timeout 10 2>nul
docker compose -f docker-compose.dev.yml up -d postgres redis
if errorlevel 1 (
    echo [ERROR] Failed to start Docker services. Make sure Docker is running.
    goto :error
)

:: Wait for Docker services with health checks
echo [dev-refresh] Waiting for Docker services to be ready...
:wait_docker
docker compose -f docker-compose.dev.yml ps --status running | findstr postgres >nul
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto :wait_docker
)
docker compose -f docker-compose.dev.yml ps --status running | findstr redis >nul
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    goto :wait_docker
)
echo [dev-refresh] Docker services are ready.

echo.
echo [dev-refresh] Installing dependencies...
call pnpm install --recursive --prefer-offline --reporter=silent
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies.
    goto :error
)

echo.
echo [dev-refresh] Generating Prisma client...
cd "%REPO%\backend\api"
call pnpm prisma generate
if errorlevel 1 (
    echo [WARNING] Failed to generate Prisma client, continuing anyway...
)
cd "%REPO%"

echo.
echo [dev-refresh] Starting development servers...
echo.

:: Create initial log files with proper encoding
echo. > "%CONSOLE_LOG%"
echo. > "%SCREEN_LOG%"
echo. > "%PLAYER_LOG%"
echo. > "%API_LOG%"
echo. > "%REALTIME_LOG%"

:: Launch Console (port 5174)
echo [dev-refresh] Starting Console on http://localhost:5174
start "Bingo Console (5174)" /min cmd /c "cd /d "%REPO%" && pnpm --filter @bingo/console dev >> "%CONSOLE_LOG%" 2>&1"
timeout /t 2 /nobreak >nul

:: Launch Screen (port 5173)
echo [dev-refresh] Starting Screen on http://localhost:5173
start "Bingo Screen (5173)" /min cmd /c "cd /d "%REPO%" && pnpm --filter @bingo/screen dev >> "%SCREEN_LOG%" 2>&1"
timeout /t 2 /nobreak >nul

:: Launch Player (port 5175)
echo [dev-refresh] Starting Player on http://localhost:5175
start "Bingo Player (5175)" /min cmd /c "cd /d "%REPO%" && pnpm --filter @bingo/player dev >> "%PLAYER_LOG%" 2>&1"
timeout /t 2 /nobreak >nul

:: Launch API (port 3000)
echo [dev-refresh] Starting API on http://localhost:3000
start "Bingo API (3000)" /min cmd /c "cd /d "%REPO%" && pnpm --filter bingo-api dev >> "%API_LOG%" 2>&1"
timeout /t 2 /nobreak >nul

:: Launch Realtime (port 4000)
echo [dev-refresh] Starting Realtime on ws://localhost:4000
start "Bingo Realtime (4000)" /min cmd /c "cd /d "%REPO%" && pnpm --filter @bingo/realtime dev >> "%REALTIME_LOG%" 2>&1"

echo.
echo ========================================
echo    ALL SERVICES LAUNCHING...
echo ========================================
echo.
echo   Console  : http://localhost:5174
echo   Screen   : http://localhost:5173
echo   Player   : http://localhost:5175
echo   API      : http://localhost:3000
echo   Realtime : ws://localhost:4000
echo.
echo   Logs     : %LOGDIR%
echo.
echo [dev-refresh] Services are starting up...
echo [dev-refresh] Wait 5-10 seconds for all services to be ready.
echo.
echo Press Ctrl+C to stop all services
echo.

popd

:: Keep window open and wait for user input
:wait
timeout /t 60 /nobreak >nul
goto :wait

:error
echo.
echo ========================================
echo    ERROR - CHECK OUTPUT ABOVE
echo ========================================
popd
pause
exit /b 1
