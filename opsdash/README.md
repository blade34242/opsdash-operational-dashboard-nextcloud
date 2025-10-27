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
4. Visit `/index.php/apps/opsdash/overview`

Hot reload is available with `npm run dev`, but production-like flows should always run `npm run build` to refresh `js/.vite/manifest.json` and `js/assets/*`.

## Key Features
- **Sidebar control centre** with dedicated tabs: Calendars, Targets, Summary, Activity & Schedule, Balance, Notes. Each tab configures a specific area or card so you decide what the dashboard shows.
- **Calendar mapping to custom categories** – create, rename, or remove categories in the Targets tab, then assign each calendar to a category in the Calendars tab. All headline cards and charts follow your mapping automatically.
- **Summary cards** (Time, Targets, Activity & Schedule, Balance) that surface high-impact metrics and react instantly to your sidebar toggles.
- **Charts that stay legible** – pie slices display hours and percentage right on the wedge, stacked bars display per-day totals plus an overall total, and charts redraw automatically when the layout changes.
- **Targets & pacing** – configurable totals, per-category goals, weekend inclusion, forecast method/padding, and pacing thresholds.
- **Balance insights** – adjust share/index warning levels, relation mode (ratio/factor), trend lookback, and optional insights/daily mix.
- **Notes** pane with wide, resizable fields for previous vs current period reflections.
- **Main analysis tabs** – By Calendar, By Day, Longest Tasks, and Heatmap give you the drill-down, backed by consistent chart colouring and automatic resizing.

## Routing & Assets
- Primary controller endpoints live under `/apps/opsdash/overview/*`:
  - `GET /load?range=week|month&offset=0`
  - `POST /persist` (selection + targets)
  - `POST /notes`
- POST routes require the standard Nextcloud request token (`window.oc_requesttoken`).
- Static assets (`img/app.svg`, `img/app-dark.svg`, `js/assets/*`) are served from the same `apps_paths` entry that hosts the app (e.g., `/apps-extra/opsdash`).

## Dashboard Anatomy

### Sidebar Tabs
- **Calendars** – toggle calendars, assign them to categories, and set per-calendar targets.
- **Targets** – create/rename/delete categories, edit totals, configure pacing & forecast, decide which charts appear.
- **Summary** – choose which metrics appear in the Time Summary card and switch between “Active days” vs “All days”.
- **Activity & Schedule** – toggle weekend/evening share, earliest/late times, overlaps, longest session, last day off, and the card hint.
- **Balance** – fine-tune warning thresholds, relation mode, trend lookback, insights, daily mix, and rounding precision.
- **Notes** – capture previous vs current period notes with instant save.

### Headline Cards
- **Time Summary** – totals, averages, medians, busiest day, weekday/weekend stats, top category, balance index.
- **Targets** – total progress, need-per-day, pace comparison, and detailed per-category status.
- **Activity & Schedule** – headline (events, active days, typical window) plus optional metrics (weekend/evening share, earliest/late, overlaps, longest session, last time off).
- **Balance Overview** – balance index, category mix, relations, week-over-week trend, warnings/insights.

### Main Content
- **By Calendar** – table, pie, and stacked bars powered by your category mapping.
- **By Day** – daily totals with quick navigation back into the calendar.
- **Longest Tasks** – ranked list of the longest blocks.
- **Heatmap** – 24×7 view with automatic redraw when the layout changes.

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
