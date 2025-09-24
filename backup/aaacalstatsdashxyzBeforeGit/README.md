# Calendar Dashboard (aaacalstatsdashxyz)

A Nextcloud app that aggregates calendar statistics (hours, events, heatmaps) across selected calendars, with optional calendar grouping and per‑group charts.

Built with Codex CLI (OpenAI’s agentic coding assistant) for maintainability, security, and modern CSP‑friendly patterns.

## Requirements
- Nextcloud 32
- PHP compatible with your NC32 instance
- Node.js 18+ and npm for building the frontend

## Install (development)
1. Place this app in `apps/aaacalstatsdashxyz`.
2. Install frontend deps: `npm install`
3. Build assets: `npm run build`
4. Enable the app in Nextcloud and open it from the navigation.

## Development
- `npm run dev` starts Vite in dev mode; for integration with Nextcloud you typically build and let Nextcloud serve the built assets.
- Frontend is Vue 3 + Vite and uses `@nextcloud/vite-config`.
- UI uses `@nextcloud/vue` components for a native look.

### Static assets and apps_paths (NC 31/32)
- Nextcloud serves static files (e.g., `img/app.svg`) from the app directories configured in `config.php` → `apps_paths`.
- Each path has a public URL prefix, for example:
  - `/var/www/html/apps` → `/apps` (usually read-only)
  - `/var/www/html/apps-extra` → `/apps-extra` (read-only)
  - `/var/www/html/apps-writable` → `/apps-writable` (writable; used by App Store)
- Place your app folder `aaacalstatsdashxyz` in ONE of these paths. The folder name must match the app id.
- Test static icons directly, without `index.php`, using the prefix that matches where your app lives:
  - If in `apps-extra`: `http://<host>/apps-extra/aaacalstatsdashxyz/img/app.svg`
  - If in `apps-writable`: `http://<host>/apps-writable/aaacalstatsdashxyz/img/app.svg`
- App routes (PHP) use the front controller and do include `index.php`:
  - `http://<host>/index.php/apps/aaacalstatsdashxyz/config_dashboard`

Notes
- The app menu entry appears only after the app is installed in a configured `apps_paths` AND enabled (`occ app:enable aaacalstatsdashxyz`).
- The theming icon endpoints will pick up `img/app.svg` (and `img/app-dark.svg`) automatically after the app is enabled.

## Documentation
- Architecture: docs/ARCHITECTURE.md
- API: docs/API.md
- Security: docs/SECURITY.md
- Performance: docs/PERFORMANCE.md
- Operations: docs/OPERATIONS.md
- Configuration: docs/CONFIGURATION.md
- Troubleshooting: docs/TROUBLESHOOTING.md
- Upgrade Notes: docs/UPGRADE.md
- Contributing: CONTRIBUTING.md

### Features
- Calendar selection per user (stored server‑side).
- Optional calendar grouping (0–9 per calendar; default 0). Groups 1–9 render per‑group pie + stacked charts when selected.
- Charts: overall pie and per‑day stacked bars; heatmap (24×7) with blue→purple palette.
- Stats: total/avg hours, events, busiest day, weekend/evening shares, typical start/end, deltas vs previous period.

### Behavior
- First load: if no saved selection exists, all calendars are selected by default.
- Groups: if no saved group mapping exists, all calendars default to group 0.
- Saving: selection and groups persist immediately; selection changes reload data, group changes do not force a reload.

## Admin Metrics
Removed. No usage metrics are collected or exposed in admin settings.

## Server Endpoints
- `GET  /apps/aaacalstatsdashxyz/config_dashboard/load` — loads stats for the selected range (week/month + offset). Accepts optional selection for previewing.
- `POST /apps/aaacalstatsdashxyz/config_dashboard/save` — saves selected calendars and optional groups per user
- `POST /apps/aaacalstatsdashxyz/config_dashboard/persist` — persists selection (and groups) and returns the saved/read‑back values

CSRF is required for POST endpoints and is handled via `window.oc_requesttoken`.

## Colors
- Calendar colors are taken from Nextcloud (getColor/getCalendarColor/Colour) when available.
- If missing, the app attempts a WebDAV `PROPFIND` to read `calendar-color` per calendar.
- As a fallback, a deterministic color derived from the calendar id is used.

## Build Artifacts
- Vite outputs a `js/main46.js` bundle that the controller loads via `Util::addScript($app, 'main46')`.

## License
AGPL-3.0-or-later
