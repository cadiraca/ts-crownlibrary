# 👑 CrownLibrary

Personal research library with CLI, web reader, and mobile app.

King Charly (AI assistant) does deep research and saves docs. Carlos reads them on web or phone. Bookmark where you left off, pick up tomorrow.

## Quick Start

```bash
npm install
npm run build
cd packages/cli && npm link && cd ../..

# Add a document
cl add "My Research" --file research.md --tags sap,research

# List documents
cl ls

# Search
cl search "pricing"

# Start web server
cl serve
# → http://localhost:3020
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `cl add <title> --file <path> --tags tag1,tag2` | Add from file |
| `cl add <title> --stdin --tags tag1` | Add from stdin (pipe) |
| `cl ls` | List all documents |
| `cl ls --tag sap` | Filter by tag |
| `cl search <query>` | Full-text search |
| `cl read <id>` | Print to terminal |
| `cl export <id> --md` | Export markdown |
| `cl export <id> --pdf` | Export PDF (needs Chromium) |
| `cl delete <id>` | Delete document |
| `cl serve [--port 3020]` | Start web server |

## Storage

- **Database:** `~/.crown/library.db` (SQLite)
- **Files:** `~/.crown/library/files/`
- **Override:** Set `CL_DB_PATH` env var

## Web App

Dark-themed reader at `http://localhost:3020` (after `cl serve`):

- **Library** — search, filter by tag, grid/list view
- **Reader** — markdown renderer, TOC sidebar, reading progress, bookmarks, continue reading
- **Detail** — metadata, bookmark list, export

## Mobile App (Expo)

```bash
cd apps/mobile
npx expo start
```

Scan QR code with Expo Go on Android. Connects to the web server for docs.

Configure server URL in `app.json` → `extra.serverUrl`.

## Docker / Coolify

```bash
docker build -t crownlibrary .
docker run -p 3020:3020 -v crown-data:/data crownlibrary
```

## Stack

- **CLI:** Node.js + TypeScript + Commander + better-sqlite3
- **Server:** Express + TypeScript
- **Web:** React + Vite + TailwindCSS + React Router + react-markdown
- **Mobile:** Expo SDK 52 + React Native + react-native-markdown-display
- **DB:** SQLite (better-sqlite3) with FTS5 full-text search
- **PDF:** Puppeteer + Chromium
