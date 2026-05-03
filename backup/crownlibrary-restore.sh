#!/usr/bin/env bash
set -euo pipefail

# CrownLibrary Restore Script
# Restores from a backup .tar.gz file

CONTAINER="crownlibrary"
IMAGE="crownlibrary:latest"
VOLUME_PATH="/var/lib/docker/volumes/crownlibrary-data/_data"

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup-file.tar.gz>"
  echo "Example: $0 /data/backups/crownlibrary/crownlibrary-20260503-160000.tar.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Verify archive is valid
if ! tar -tzf "$BACKUP_FILE" >/dev/null 2>&1; then
  echo "ERROR: Invalid or corrupt archive: $BACKUP_FILE"
  exit 1
fi

echo "==> Restoring CrownLibrary from: $BACKUP_FILE"

TMP_DIR=$(mktemp -d)
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

# Extract backup
echo "  - Extracting backup..."
tar -xzf "$BACKUP_FILE" -C "$TMP_DIR"

# Verify DB file exists in backup
if [ ! -f "$TMP_DIR/crownlibrary.db" ]; then
  echo "ERROR: crownlibrary.db not found in backup"
  exit 1
fi

# Stop container
echo "  - Stopping container..."
docker stop "$CONTAINER" 2>/dev/null || true

# Restore files into volume via a temporary container
echo "  - Restoring database to volume..."
docker run --rm -v crownlibrary-data:/data -v "$TMP_DIR":/backup alpine sh -c '
  rm -f /data/crownlibrary.db /data/crownlibrary.db-wal /data/crownlibrary.db-shm
  cp /backup/crownlibrary.db /data/crownlibrary.db
  [ -f /backup/crownlibrary.db-wal ] && cp /backup/crownlibrary.db-wal /data/crownlibrary.db-wal
  [ -f /backup/crownlibrary.db-shm ] && cp /backup/crownlibrary.db-shm /data/crownlibrary.db-shm
  if [ -d /backup/exports ]; then
    rm -rf /data/exports
    cp -r /backup/exports /data/exports
  fi
  chown -R root:root /data/
'

# Start container
echo "  - Starting container..."
docker start "$CONTAINER"

# Wait for container to be healthy
echo "  - Waiting for container..."
for i in $(seq 1 15); do
  if docker ps --filter name="$CONTAINER" --filter status=running --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    sleep 2
    # Verify HTTP response
    if curl -sf -o /dev/null "http://localhost:3111" 2>/dev/null; then
      echo "==> SUCCESS: CrownLibrary restored and running"
      exit 0
    fi
  fi
  sleep 2
done

echo "WARNING: Container started but health check inconclusive. Check manually:"
echo "  docker logs $CONTAINER --tail 20"
echo "  curl http://localhost:3111"
