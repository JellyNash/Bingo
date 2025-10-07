#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT_DIR/dev-logs"
CONSOLE_LOG="$LOG_DIR/console.log"
SCREEN_LOG="$LOG_DIR/screen.log"
PLAYER_LOG="$LOG_DIR/player.log"
API_LOG="$LOG_DIR/api.log"
REALTIME_LOG="$LOG_DIR/realtime.log"

mkdir -p "$LOG_DIR"

printf '\n[dev-refresh] Stopping existing pnpm/vite processes...\n'
pkill -f "pnpm.*dev" >/dev/null 2>&1 || true
pkill -f "vite" >/dev/null 2>&1 || true
pkill -f "bingo-api dev" >/dev/null 2>&1 || true
pkill -f "@bingo/realtime dev" >/dev/null 2>&1 || true

printf '\n[dev-refresh] Restarting Docker services...\n'
cd "$ROOT_DIR"
docker compose -f docker-compose.dev.yml down --remove-orphans
printf '[dev-refresh] Bringing up postgres and redis only...\n'
docker compose -f docker-compose.dev.yml up -d postgres redis

printf '\n[dev-refresh] Syncing workspace dependencies (no forced reinstall)...\n'
pnpm install --recursive

start_process() {
  local name="$1"
  local command="$2"
  local log_file="$3"
  printf '\n[dev-refresh] Starting %s (logs -> %s)...\n' "$name" "$log_file"
  nohup bash -lc "$command" >"$log_file" 2>&1 &
}

start_process "Console" "cd '$ROOT_DIR' && pnpm --filter @bingo/console dev -- --host 0.0.0.0" "$CONSOLE_LOG"
start_process "Screen" "cd '$ROOT_DIR' && pnpm --filter @bingo/screen dev -- --host 0.0.0.0" "$SCREEN_LOG"
start_process "Player" "cd '$ROOT_DIR' && pnpm --filter @bingo/player dev -- --host 0.0.0.0" "$PLAYER_LOG"
start_process "API" "cd '$ROOT_DIR' && pnpm --filter bingo-api dev" "$API_LOG"
start_process "Realtime" "cd '$ROOT_DIR' && pnpm --filter @bingo/realtime dev" "$REALTIME_LOG"

printf '\n[dev-refresh] Services launching. Logs:\n'
printf '  Console  : %s\n' "$CONSOLE_LOG"
printf '  Screen   : %s\n' "$SCREEN_LOG"
printf '  Player   : %s\n' "$PLAYER_LOG"
printf '  API      : %s\n' "$API_LOG"
printf '  Realtime : %s\n' "$REALTIME_LOG"
printf '\nAccess once ready:\n  Console  http://localhost:5174\n  Screen   http://localhost:5173\n  Player   http://localhost:5175\n  API      http://localhost:3000\n  Realtime ws://localhost:4000\n'
