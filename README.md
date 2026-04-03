# 📚 CrownLibrary

A personal research library for storing, reading, and syncing deep research documents.

## Architecture

```
ts-crownlibrary/
├── packages/
│   ├── server/     # Express API + SQLite backend
│   ├── cli/        # CLI tool (cl)
│   ├── web/        # React SPA (Vite + TailwindCSS dark theme)
│   └── mobile/     # Expo React Native app
├── package.json    # Workspace root
└── README.md
```

## Quick Start

```bash
# Install all dependencies
npm install

# Build everything
npm run build

# Link CLI globally
cd packages/cli && npm link

# Start the server (serves API + web frontend)
npm start
# or
cl serve
```

## CLI Usage

```bash
cl add research.md --title 'SAP Pricing Analysis' --tags sap,research
cl ls                                          # list all docs
cl ls --tag sap                                # filter by tag
cl search 'pricing'                            # full-text search
cl read <id>                                   # read in terminal (less)
cl export <id> --pdf                           # export to PDF
cl bookmark <id> --section 'Pricing' --note 'Left off here'
cl bookmarks                                   # show all bookmarks
cl serve                                       # start web server
```

Short IDs work — just use the first 8 characters.

## Web App

- Dark theme with CrownLibrary design system
- Auto-generated Table of Contents from headings
- Scroll position tracking & bookmarks
- 📌 "Continue Here" — saves your reading position
- PDF export
- Drag & drop file upload
- Search & tag filtering

## Android App (Expo)

- Document list with pull-to-refresh
- Markdown reader with bookmark support
- Offline reading (long-press to download)
- WiFi-only sync toggle
- Configurable server URL

```bash
cd packages/mobile
npx expo start --android
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/docs` | List docs (query: `tag`, `search`, `limit`, `offset`) |
| GET | `/api/docs/:id` | Get doc with bookmarks |
| POST | `/api/docs` | Add doc (JSON: title, content_md, tags) |
| POST | `/api/docs/upload` | Upload .md file |
| PUT | `/api/docs/:id` | Update doc |
| DELETE | `/api/docs/:id` | Delete doc |
| POST | `/api/docs/:id/bookmark` | Add bookmark |
| GET | `/api/docs/:id/bookmarks` | Get doc bookmarks |
| DELETE | `/api/docs/:id/bookmark/:bmId` | Delete bookmark |
| GET | `/api/docs/:id/export/pdf` | Export as PDF |
| GET | `/api/docs/bookmarks/all` | All bookmarks |
| GET | `/api/health` | Health check |

## Stack

- **Backend:** Express + better-sqlite3 + FTS5
- **CLI:** Commander.js + chalk
- **Web:** React 19 + Vite + TailwindCSS
- **Mobile:** Expo + React Native
- **PDF:** Puppeteer (with HTML fallback)
- **Database:** SQLite at `~/.crown/library.db`

## License

Private — Carlos Diego Ramírez
