#!/usr/bin/env bash
#
# PostgreSQL Backup Script for Bingo Platform
# Creates timestamped backups of the PostgreSQL database
#

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_CONTAINER="${DB_CONTAINER:-postgres}"
DB_USER="${DB_USER:-bingo}"
DB_NAME="${DB_NAME:-bingo}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-bingo}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/bingo-db-$TIMESTAMP.sql.gz"

# Check if Docker Compose is running
if ! docker compose ps | grep -q "$DB_CONTAINER"; then
    log_error "PostgreSQL container is not running. Please start the services first."
    exit 1
fi

log_info "Starting PostgreSQL backup..."
log_info "Backup file: $BACKUP_FILE"

# Perform the backup
if docker compose exec -T "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --clean --if-exists | gzip -9 > "$BACKUP_FILE"; then
    log_info "Backup completed successfully!"

    # Get file size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "Backup size: $SIZE"

    # Verify the backup
    if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
        log_info "Backup verification passed."
    else
        log_error "Backup verification failed! The backup file may be corrupted."
        exit 1
    fi
else
    log_error "Backup failed!"
    exit 1
fi

# Clean old backups
log_info "Cleaning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "bingo-db-*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

# List recent backups
log_info "Recent backups:"
ls -lh "$BACKUP_DIR"/bingo-db-*.sql.gz 2>/dev/null | tail -5 || log_warn "No backups found"

log_info "Backup process completed."