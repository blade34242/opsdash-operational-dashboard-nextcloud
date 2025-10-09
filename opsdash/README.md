# Operational Dashboard (opsdash)

A Nextcloud app that aggregates calendar statistics (hours, events, heatmaps) across selected calendars, with optional calendar grouping, per-category targets, and dockable navigation.

Built with Codex CLI (OpenAI’s agentic coding assistant) for maintainability, security, and modern CSP‑friendly patterns.

## Requirements
- Target: Nextcloud 31–32
- Node.js 18+ and npm for building the frontend (dev only)

## Install (development)
1. Place this app in `apps/opsdash`.
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
- Place your app folder `opsdash` in ONE of these paths. The folder name must match the app id.
- Test static icons directly, without `index.php`, using the prefix that matches where your app lives:
  - If in `apps-extra`: `http://<host>/apps-extra/opsdash/img/app.svg`
  - If in `apps-writable`: `http://<host>/apps-writable/opsdash/img/app.svg`
- App routes (PHP) use the front controller and do include `index.php`:
  - `http://<host>/index.php/apps/opsdash/main_dashboard`

Notes
- The app menu entry appears only after the app is installed in a configured `apps_paths` AND enabled (`occ app:enable opsdash`).
- The theming icon endpoints will pick up `img/app.svg` (and `img/app-dark.svg`) automatically after the app is enabled.

## Documentation
- Architecture: docs/ARCHITECTURE.md
- API: docs/API.md
- Security: docs/SECURITY.md
- Performance: docs/PERFORMANCE.md
- Operations: docs/OPERATIONS.md
- Dev Workflow: docs/DEV_WORKFLOW.md
- Packaging: docs/PACKAGING.md
- Directory Structure: docs/DIRECTORY_STRUCTURE.md
- Release Process: docs/RELEASE.md
- Publishing Checklist: docs/PUBLISHING_CHECKLIST.md
- App Store Publishing Policy: docs/APP_STORE_PUBLISHING.md
- Calendar App Setup (dev): docs/CALENDAR_DEV_SETUP.md
- Configuration: docs/CONFIGURATION.md
- Seeding test data: docs/SEEDING.md
- Troubleshooting: docs/TROUBLESHOOTING.md
- Known Issues: docs/KNOWN_ISSUES.md
- Upgrade Notes: docs/UPGRADE.md
- Contributing: CONTRIBUTING.md
- Next Steps: docs/NEXT_STEPS.md

### Features
- Dockable sidebar with persistent user configuration (calendar selection, notes, target presets).
- Per-category targets with configurable pacing thresholds, forecast band, and category assignment per calendar.
- Optional calendar grouping (0–9 per calendar). Groups render per-group pie + stacked charts when selected.
- Charts: overall pie and per-day stacked bars; heatmap (24×7) with blue→purple palette.
- Stats: total/avg hours, events, busiest day, weekend/evening shares, typical start/end, deltas vs previous period.

### Behavior
- First load: if no saved selection exists, all calendars are selected by default.
- Groups/Categories: if no saved mapping exists, calendars default to category “Unassigned” (group 0). Assigning a category automatically maps the calendar to the category’s underlying group id.
- Saving: selection, groups, categories, and target settings persist immediately; selection changes trigger a reload.

## Admin Metrics
Removed. No usage metrics are collected or exposed in admin settings.

## Server Endpoints
- `GET  /apps/opsdash/main_dashboard/load` — loads stats for the selected range (week/month + offset). Accepts optional selection for previewing.
- `POST /apps/opsdash/main_dashboard/save` — saves selected calendars and optional groups per user
- `POST /apps/opsdash/main_dashboard/persist` — persists selection (and groups) and returns the saved/read‑back values

CSRF is required for POST endpoints and is handled via `window.oc_requesttoken`.

## Colors
- Calendar colors are taken from Nextcloud (getColor/getCalendarColor/Colour) when available.
- If missing, the app attempts a WebDAV `PROPFIND` to read `calendar-color` per calendar.
- As a fallback, a deterministic color derived from the calendar id is used.

## Build Artifacts
- Vite outputs a `js/main*.js` bundle (resolved at runtime via the manifest, fallback `main47`).

## License
AGPL-3.0-or-later
