# Repository Guidelines

## Project Structure & Module Organization
- `aaacalstatsdashxyz/` — Nextcloud app root
  - `appinfo/` (manifest, routes, nav), `lib/` (PHP controllers/services/settings), `templates/` (SPA mount), `img/` (icons)
  - `src/` (Vue 3 + TypeScript SPA), `style.css` (global styles), `vite.config.ts`
  - `docs/` (ARCHITECTURE, API, SECURITY, etc.)
- Top-level `docker-compose*.yml` provide a local NC environment.

## Build, Test, and Development Commands
- `cd aaacalstatsdashxyz && npm run dev` — Vite dev server for the SPA.
- `npm run build` — production build; outputs assets consumed by the PHP controller.
- `npm run preview` — serve the built assets locally.
- Nextcloud app lifecycle (inside the NC container/host):
  - `occ app:enable aaacalstatsdashxyz` / `occ app:disable aaacalstatsdashxyz`
  - Static file check (example): `http://<host>/apps-extra/aaacalstatsdashxyz/img/app.svg`

## Coding Style & Naming Conventions
- Indentation: 2 spaces (PHP, TS, Vue SFC).
- TypeScript: prefer explicit types; `script setup` in Vue SFCs.
- Vue components: `PascalCase.vue` in `src/components`.
- PHP: namespace `OCA\\Aaacalstatsdashxyz\\…`; controllers are thin, services hold logic.
- Avoid inline scripts/styles (CSP). Load assets via Nextcloud helpers.

## Testing Guidelines
- No formal test harness is included yet. Validate endpoints with curl:
  - `GET /index.php/apps/aaacalstatsdashxyz/config_dashboard/load?range=month&offset=0`
- Prefer adding unit tests for new TS logic with Vitest (if introduced). Keep functions small and pure.
- Manual checks: app navigation loads, charts render, POST routes require CSRF token.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat: …`, `fix: …`, `docs: …`, `refactor: …`.
- PRs should include: concise description, linked issues, screenshots of UI changes, and notes on security/CSP impact.
- Keep diffs focused; update `docs/` when APIs, behavior, or settings change.

## Security & Configuration Tips
- Target Nextcloud 31–32 (see `appinfo/info.xml`). Respect CSRF for POST; no user data in optional metrics.
- Place the app under a configured `apps_paths` and ensure the folder name matches `aaacalstatsdashxyz`.
- Colors and calendar metadata may fall back to WebDAV; handle errors gracefully and clamp inputs.
