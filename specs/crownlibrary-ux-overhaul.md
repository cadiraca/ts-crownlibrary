# Spec: CrownLibrary UX Overhaul

## Objective
Turn CrownLibrary from a functional CRUD into a genuinely comfortable reading library for organizing, resuming, archiving, exporting, and sharing documents.

## Approved Decisions
1. **Share** copies/shares the internal document link only.
2. **Recent view** will be **both**:
   - a top-level section on Home
   - a filter/tab in the main library view
3. **Folders** support hierarchical path strings like:
   - `globant`
   - `globant/spc`
   - `globant/spc/something`

## Commands
- Build all: `npm run build`
- Build server: `npm run build --workspace=packages/server`
- Build web: `npm run build --workspace=packages/web`
- Build cli: `npm run build --workspace=packages/cli`
- Run server dev: `npm run dev --workspace=packages/server`
- Run web dev: `npm run dev --workspace=packages/web`

## Project Structure
- `packages/server/src/db.ts` → SQLite schema/migrations
- `packages/server/src/routes/docs.ts` → document/export/archive/activity routes
- `packages/web/src/App.tsx` → library home/list/filtering
- `packages/web/src/DocView.tsx` → reading view and doc actions
- `packages/web/src/api.ts` → frontend API helpers

## Current Problems
- PDF export can return HTML fallback instead of a true PDF.
- No Markdown export from the UI.
- The library list feels flat and utility-first rather than reading-first.
- Tags are visually noisy.
- There is no archive state.
- There is no recent-reading view.
- There is no folder hierarchy.
- There is no share action in the document view.

## Data Model Changes
Add minimal fields to `documents`:
- `folder TEXT DEFAULT ''`
- `archived INTEGER DEFAULT 0`
- `last_opened_at TEXT NULL`

These fields enable:
- hierarchical folder organization
- archive/unarchive
- recent reading activity

## API Changes
### Extend `GET /api/docs`
Support filters and ordering:
- `folder`
- `archived`
- `sort=updated|created|recent`
- optionally `recentOnly=1` if that simplifies UI

### Reading activity
Track document opening so Home can show Recent docs.
Recommended implementation: update `last_opened_at` when the doc view loads through a dedicated endpoint.

Proposed endpoint:
- `POST /api/docs/:id/opened`

### Archive state
Add:
- `POST /api/docs/:id/archive`
- `POST /api/docs/:id/unarchive`

### Export
- `GET /api/docs/:id/export/pdf` must return a real PDF or a clear error.
- Markdown export can be handled client-side from fetched `content_md`.

## UX Direction

### Home / Library View
Add a more product-like structure:
- **Recent** section at the top
- main **Library** list below
- archived documents behind a filter/tab rather than mixed into the default flow

### Filters / Views
Provide lightweight quick filters/tabs:
- `All`
- `Recent`
- `Archived`

Support additional filtering by:
- search
- folder
- tag (kept available, but visually de-emphasized)
- sort order

### Folder UX
Folders are stored as path strings and interpreted in the UI.
Examples:
- `globant`
- `globant/spc`
- `globant/spc/architecture`

Recommended UI behavior:
- show folder path in cards and doc view
- support filtering by exact path or prefix
- render as breadcrumb-like text in doc view

### Card Redesign
Each document card should prioritize:
1. title
2. folder path
3. relevant date
4. size
5. quiet tag summary
6. compact actions

### Tag Redesign
Tags should stop dominating the list UI:
- show at most 2 tags inline on cards
- collapse extras into `+N`
- keep full tag visibility inside the document view
- use softer styling

### Document View Header Actions
Add compact actions in the header:
- Share
- Markdown
- PDF
- Archive / Unarchive
- Bookmark

### Share Behavior
Use a progressive enhancement flow:
1. `navigator.share()` when available
2. fallback to copying the current document URL to clipboard
3. show lightweight success feedback

## Code Style
- Keep implementation direct and local.
- Avoid unnecessary abstractions.
- Prefer small API helpers and focused component changes.
- Do not introduce a separate folders table in this iteration.

## Testing Strategy
### Build verification
- `npm run build`

### Functional verification
- PDF export returns `application/pdf` or a clear failure
- Markdown export downloads a `.md` file from the UI
- Share action works via native share or clipboard fallback
- Archive/unarchive works and changes library visibility
- Recent section populates after opening docs
- Folder hierarchy displays correctly and filters correctly
- Tags are visually quieter in the list UI

## Boundaries
- **Always:** preserve unrelated local changes already present in the repo
- **Ask first:** adding dependencies or making broad architectural changes
- **Never:** replace folder paths with a full relational folder system in this iteration

## Success Criteria
- CrownLibrary has a useful Recent experience
- folders support hierarchical paths like `globant/spc/...`
- Share is usable from the document view
- PDF export is fixed
- Markdown export is available from the UI
- archive/unarchive works
- tags are less visually annoying
- the overall UI feels more polished and reading-oriented

## Open Questions
None for this phase. Approved inputs received:
- Share: internal link only
- Recent view: both top section and filter/tab
