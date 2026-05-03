#!/usr/bin/env bash
set -euo pipefail

# CrownLibrary Backup Script
# Creates timestamped backup of SQLite DB + exports from the running container

CONTAINER="crownlibrary"
BACKUP_DIR="/data/backups/crownlibrary"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="crownlibrary-${TIMESTAMP}"
TMP_DIR=$(mktemp -d)

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

# Ensure backup dir exists
mkdir -p "$BACKUP_DIR"

# Verify container is running
if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "ERROR: Container '$CONTAINER' is not running"
  exit 1
fi

echo "==> Backing up CrownLibrary (${TIMESTAMP})"

# Checkpoint WAL into main DB file for a consistent copy
echo "  - Checkpointing WAL..."
# Try container's sqlite3 first, fall back to a temporary alpine+sqlite container
if ! docker exec "$CONTAINER" sqlite3 /data/crownlibrary.db "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null; then
  docker run --rm -v crownlibrary-data:/data alpine sh -c '
    apk add --no-cache sqlite >/dev/null 2>&1
    sqlite3 /data/crownlibrary.db "PRAGMA wal_checkpoint(TRUNCATE);"
  ' 2>/dev/null || true
fi

# Copy DB and exports from running container (no downtime)
echo "  - Copying database..."
docker cp "$CONTAINER":/data/crownlibrary.db "$TMP_DIR/crownlibrary.db"

# Copy WAL/SHM if they still exist after checkpoint
docker cp "$CONTAINER":/data/crownlibrary.db-wal "$TMP_DIR/crownlibrary.db-wal" 2>/dev/null || true
docker cp "$CONTAINER":/data/crownlibrary.db-shm "$TMP_DIR/crownlibrary.db-shm" 2>/dev/null || true

echo "  - Copying exports..."
docker cp "$CONTAINER":/data/exports "$TMP_DIR/exports" 2>/dev/null || true

# Create tarball
echo "  - Creating archive..."
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" -C "$TMP_DIR" .

# Verify archive
if tar -tzf "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" >/dev/null 2>&1; then
  SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
  echo "==> SUCCESS: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz (${SIZE})"
else
  echo "ERROR: Archive verification failed"
  exit 1
fi

# Retention: delete backups older than 30 days
find "$BACKUP_DIR" -name "crownlibrary-*.tar.gz" -mtime +30 -delete 2>/dev/null || true
echo "==> Retention cleanup done (30-day policy)"
