#!/usr/bin/env bash
#
# PostgreSQL Restore Script for Bingo Platform
# Restores PostgreSQL database from a backup file
#

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_CONTAINER="${DB_CONTAINER:-postgres}"
DB_USER="${DB_USER:-bingo}"
DB_NAME="${DB_NAME:-bingo}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-bingo}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_prompt() {
    echo -e "${BLUE}[PROMPT]${NC} $1"
}

# Check if backup file is provided
if [ $# -eq 0 ]; then
    log_info "Available backups:"
    ls -lh "$BACKUP_DIR"/bingo-db-*.sql.gz 2>/dev/null || {
        log_error "No backups found in $BACKUP_DIR"
        exit 1
    }
    echo
    log_prompt "Usage: $0 <backup-file>"
    log_prompt "Example: $0 $BACKUP_DIR/bingo-db-20240115-120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Check if Docker Compose is running
if ! docker compose ps | grep -q "$DB_CONTAINER"; then
    log_error "PostgreSQL container is not running. Please start the services first."
    exit 1
fi

# Confirm restoration
log_warn "This will restore the database from: $BACKUP_FILE"
log_warn "⚠️  This will OVERWRITE the current database!"
echo
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_info "Restore cancelled."
    exit 0
fi

log_info "Starting PostgreSQL restore..."

# Create a temporary backup of current database
TEMP_BACKUP="$BACKUP_DIR/bingo-db-before-restore-$(date +%Y%m%d-%H%M%S).sql.gz"
log_info "Creating temporary backup of current database: $TEMP_BACKUP"
docker compose exec -T "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner | gzip -9 > "$TEMP_BACKUP"

# Perform the restore
log_info "Restoring database from backup..."
if gunzip -c "$BACKUP_FILE" | docker compose exec -T "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1; then
    log_info "Database restored successfully!"

    # Verify the restore
    TABLE_COUNT=$(docker compose exec -T "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")
    log_info "Restored database contains $TABLE_COUNT tables."

    log_info "Restore completed successfully!"
    log_info "A backup of the previous database was saved to: $TEMP_BACKUP"
else
    log_error "Restore failed!"
    log_warn "Attempting to restore from temporary backup..."

    if gunzip -c "$TEMP_BACKUP" | docker compose exec -T "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1; then
        log_info "Successfully restored previous database state."
    else
        log_error "Failed to restore previous state! Manual intervention required."
    fi
    exit 1
fi