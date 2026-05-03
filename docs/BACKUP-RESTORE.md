# CrownLibrary Backup & Restore

## What's Backed Up

- **SQLite DB:** `/data/crownlibrary.db` (+ WAL/SHM files)
- **Exports:** `/data/exports/` (generated PDFs)
- **Volume:** `crownlibrary-data` → `/var/lib/docker/volumes/crownlibrary-data/_data`

## Backup

```bash
bash backup/crownlibrary-backup.sh
```

- Checkpoints WAL → main DB for consistency
- Copies DB + exports via `docker cp` (no downtime)
- Creates timestamped `.tar.gz` in `/data/backups/crownlibrary/`
- Auto-deletes backups older than 30 days

## Restore

```bash
bash backup/crownlibrary-restore.sh /data/backups/crownlibrary/crownlibrary-YYYYMMDD-HHMMSS.tar.gz
```

- Stops container, restores DB + exports to volume, starts container
- Verifies container comes back up and responds on port 3111

### Gotchas

- Restore **stops the container** briefly (~5-10 seconds)
- WAL mode: backup script checkpoints first, so restored DB is self-contained
- If container won't start after restore, check `docker logs crownlibrary --tail 30`

## Backup Location

```
/data/backups/crownlibrary/
├── crownlibrary-20260503-160000.tar.gz
├── crownlibrary-20260504-040000.tar.gz
└── ...
```

## Retention

- **30 days** automatic cleanup on each backup run
- Adjust `find ... -mtime +30` in `crownlibrary-backup.sh`

## Schedule (cron)

```bash
# Daily at 4:00 AM UTC
0 4 * * * /home/spider/apps/local/ts-crownlibrary/backup/crownlibrary-backup.sh >> /var/log/crownlibrary-backup.log 2>&1
```
