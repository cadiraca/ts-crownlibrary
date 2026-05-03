# CrownLibrary — Carlab Setup Guide

## Prerequisites

- Docker (with `coolify` network)
- Git
- `/data/backups/crownlibrary/` for backup storage
- DNS: `*.carlab.local → 192.168.1.56` (via dnsmasq)

## Step-by-Step

### 1. Clone

```bash
cd /home/spider/apps/local
git clone https://github.com/cadiraca/ts-crownlibrary.git
cd ts-crownlibrary
```

### 2. Build

```bash
docker build -t crownlibrary:latest .
```

### 3. Create Volume & Run

```bash
docker volume create crownlibrary-data

docker run -d \
  --name crownlibrary \
  --network coolify \
  --restart unless-stopped \
  -p 3111:3011 \
  -v crownlibrary-data:/data \
  -l "traefik.enable=true" \
  -l "traefik.http.routers.crownlibrary.entryPoints=http" \
  -l "traefik.http.routers.crownlibrary.rule=Host(\`crownlibrary.carlab.local\`)" \
  -l "traefik.http.services.crownlibrary.loadbalancer.server.port=3011" \
  crownlibrary:latest
```

### 4. Restore DB (if restoring from backup)

```bash
bash backup/crownlibrary-restore.sh /data/backups/crownlibrary/crownlibrary-YYYYMMDD-HHMMSS.tar.gz
```

### 5. Verify

```bash
# Container running
docker ps --filter name=crownlibrary

# HTTP response
curl -s -o /dev/null -w "%{http_code}" http://localhost:3111

# Via Traefik
curl -s -H "Host: crownlibrary.carlab.local" http://127.0.0.1/
```

## Ports

| Internal | External | Access |
|----------|----------|--------|
| 3011 | 3111 | `http://localhost:3111` |
| 3011 | 80 (Traefik) | `http://crownlibrary.carlab.local` |
