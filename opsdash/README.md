# Operational Dashboard (opsdash)

Operational Dashboard surfaces week/month calendar activity inside Nextcloud: summary cards, per-calendar tables, charts, and configurable targets with balance insights. The app stores user preferences (selected calendars, category targets, notes) via the Nextcloud config backend.

## Compatibility
- Nextcloud 30–31 (see `appinfo/info.xml`)
- Node.js 18+ and npm (build time only)

## Quick Start (development)
1. Place the app folder at `<nextcloud>/apps/opsdash` (or another configured `apps_paths` entry).
2. Install dependencies and build assets:
   ```bash
   cd apps/opsdash
   npm install
   npm run build
   ```
3. Enable the app: `occ app:enable opsdash`
4. Visit `/index.php/apps/opsdash/config_dashboard`

Hot reload is available with `npm run dev`, but production-like flows should always run `npm run build` to refresh `js/.vite/manifest.json` and `js/assets/*`.

## Key Features
- **Summary cards** for time usage, targets, activity, and balance.
- **Calendar and category charts** (pie + stacked bars) fed by server stats.
- **Targets**: per-category goals with pacing thresholds, forecast band, and category assignment for each calendar (group ids are managed automatically).
- **Cards tab**: toggle Activity & Schedule metrics (weekend share, overlaps, hints) and Balance thresholds/insights without editing config files.
- **Balance overview**: category shares, relations, trend badge, warnings, and optional daily mix.
- **Notes**: previous/current period notes stored per user.
- **Heatmap & tables**: 24×7 heatmap, longest events, per-day and per-calendar breakdowns.

## Routing & Assets
- Primary controller endpoints live under `/apps/opsdash/config_dashboard/*`:
  - `GET /load?range=week|month&offset=0`
  - `POST /persist` (selection + targets)
  - `POST /notes`
- POST routes require the standard Nextcloud request token (`window.oc_requesttoken`).
- Static assets (`img/app.svg`, `img/app-dark.svg`, `js/assets/*`) are served from the same `apps_paths` entry that hosts the app (e.g., `/apps-extra/opsdash`).

## Documentation Map
- Architecture: `docs/ARCHITECTURE.md`
- API & payloads: `docs/API.md`
- Configuration & targets: `docs/CONFIGURATION.md`
- Dev workflow & packaging: `docs/DEV_WORKFLOW.md`, `docs/PACKAGING.md`
- Performance limits: `docs/PERFORMANCE.md`
- Troubleshooting: `docs/TROUBLESHOOTING.md`
- Security notes: `docs/SECURITY.md`
- Production readiness & next steps: `docs/PROD_READINESS.md`, `docs/NEXT_STEPS.md`

## Release Essentials
- Build: `npm ci && npm run build`
- Package: include `appinfo/`, `lib/`, `templates/`, `img/`, `css/`, `js/`, `README.md`, `docs/`
- Sign: `occ integrity:sign-app --path <app-root> …`
- Verify: `occ app:check-code opsdash`

## License
AGPL-3.0-or-later
