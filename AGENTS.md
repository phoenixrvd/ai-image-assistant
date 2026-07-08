# AGENTS.md

## Commands

- Use npm; `package-lock.json` is the lockfile.
- Dev server: `npm run dev` starts Vite on `0.0.0.0`.
- Verify with `npm run build`; it writes build metadata, runs `tsc -b`, then `vite build`.
- Typecheck only: `npm run typecheck`.
- No test or lint scripts are currently defined.
- After changing `public/pwa.svg`, run `npm run generate:icons`.

## Architecture

- Frontend-only React/Vite PWA: no backend routes, server secrets, server jobs, or server-side persistence.
- Provider requests run directly from the browser against configured image/chat providers.
- Data, API keys, generated images, chats, models, and options live locally in IndexedDB via Dexie.
- Preserve user data on DB changes: bump `DB_SCHEMA_VERSION` in `src/db/database.ts` and add Dexie migrations/default-data updates.
- Main wiring is `src/main.tsx` -> `HashRouter` -> `src/app/App.tsx`.
- Provider adapters live in `src/features/generation/providers/`; generation orchestration lives in `src/features/generation/services/`.
- Deployment assumes GitHub Pages on the custom domain root `/`; keep Vite `base`, PWA scope, manifest, and service worker paths compatible.

## Docs To Check

- Read relevant requirements in `doc/requirements/` before changing product behavior.
- Read relevant ADRs in `doc/adr/` before changing architecture, persistence, provider behavior, PWA/versioning, or deployment.
- Follow relevant coding guidelines in `doc/guidelines/`, especially coding rules, error handling, refactoring, and principles.
- Useful ADRs: frontend-only architecture, IndexedDB/Dexie persistence, layered frontend architecture, provider abstraction, direct request processing, PWA versioning, GitHub Pages deployment.
- Prefer executable config over docs when they conflict.

## Workflow

- Repo-local OpenCode agents live in `.opencode/agents/`.
- Release/commit conventions are documented there; notably commit messages are English and release agents must not push unless explicitly requested.
- Current app version in `package.json` must match the branch name, except when `main` is currently checked out.

## Text

- German user-facing text must use real umlauts: `für`, `löschen`, `wählen`, `enthält`, `unterstützt`, not `fuer`, `loeschen`, `waehlen`, `enthaelt`, `unterstuetzt`.
