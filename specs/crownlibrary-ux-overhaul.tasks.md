# Tasks: CrownLibrary UX Overhaul

- [x] Task 1: Extend document schema for UX metadata
  - Acceptance: `documents` supports `folder`, `archived`, and `last_opened_at` without breaking existing data
  - Verify: `npm run build --workspace=packages/server`
  - Files: `packages/server/src/db.ts`

- [x] Task 2: Add document activity, archive, folder, and sort API support
  - Acceptance: docs list supports recent/archive/folder-aware querying; open/archive/unarchive routes exist
  - Verify: `npm run build --workspace=packages/server`
  - Files: `packages/server/src/routes/docs.ts`

- [x] Task 3: Fix PDF export correctness
  - Acceptance: `/export/pdf` returns a real PDF or a clear error; no HTML fallback masquerading as PDF
  - Verify: `npm run build --workspace=packages/server`
  - Files: `packages/server/src/routes/docs.ts`

- [x] Task 4: Add frontend helpers for recent/archive/export actions
  - Acceptance: frontend has API helpers for open/archive/unarchive and richer doc list querying
  - Verify: `npm run build --workspace=packages/web`
  - Files: `packages/web/src/api.ts`

- [x] Task 5: Upgrade document view actions and metadata
  - Acceptance: doc view supports Share, Markdown export, PDF export, Archive/Unarchive, folder breadcrumbs, calmer tags
  - Verify: `npm run build --workspace=packages/web`
  - Files: `packages/web/src/DocView.tsx`

- [x] Task 6: Redesign home/library for Recent + Archive + folders
  - Acceptance: home shows Recent section, view filters, folder-aware cards/filters, quieter tags
  - Verify: `npm run build --workspace=packages/web`
  - Files: `packages/web/src/App.tsx`

- [x] Task 7: End-to-end verification
  - Acceptance: full workspace build passes and core UX flows work
  - Verify: `npm run build`
  - Files: `packages/server/src/db.ts`, `packages/server/src/routes/docs.ts`, `packages/web/src/api.ts`, `packages/web/src/DocView.tsx`, `packages/web/src/App.tsx`
