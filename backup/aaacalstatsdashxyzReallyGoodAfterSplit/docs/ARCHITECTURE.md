# Architecture Overview

This app provides a Calendar Dashboard for Nextcloud. It consists of:

- PHP backend (AppFramework):
  - Controllers: thin HTTP endpoints only
  - Services: business logic (aggregation, metrics, notes)
  - Settings: Admin settings for metrics (optional)
  - Templates: minimal mount point for the SPA
- Frontend (Vue 3 + Vite):
  - Single-page app rendered in the app content area
  - Charts drawn using canvas helpers
  - No runtime inline scripts; global CSS loaded via `Util::addStyle`

## Request Flow

1. User opens the app navigation entry → PHP controller loads CSS + JS and template.
2. Frontend boots and calls `GET /config_dashboard/load` with `range` + `offset`.
3. Server aggregates calendar stats and returns JSON with:
   - `stats`, `byCal`, `byDay`, `longest`, `charts`
   - `meta` with `from`, `to`, and optional `truncated` caps
   - `colors` and `groups` for client styling/grouping
4. User changes selection/groups → client POSTs to `persist` (CSRF); reloads data.
5. Notes are fetched and saved per period via `GET/POST /notes`.

## Backend Modules

- Controller/ConfigDashboardController.php: endpoints `index`, `load`, `save`, `persist`, `notes`, `notesSave`.
- Service/MetricsService.php: optional aggregate metrics.

Guiding principles:
- Strict read/write separation (read endpoints: side-effect free; write endpoints: POST+CSRF only).
- Clamp all inputs, intersect calendars with user principal.
- Add soft caps and expose truncation in `meta`.

## Frontend Modules (current)

- `src/App.vue`: main view (to be modularized into Sidebar/Notes/Charts/Tables).
- `src/main.ts`: bootstraps the app.
- `css/style.css`: extracted global styles for CSP compliance.

## Planned Modularization

- Components:
  - Sidebar: selection + groups
  - NotesPanel: previous/current notes
  - Charts: PieChart, StackedBars, Heatmap
  - Tables: ByCalendarTable, ByDayTable, TopEventsTable
- Composables:
  - `useRange`, `useCalendars`, `useCharts`, `useNotes`
- Services:
  - `api.ts` (typed client), `colors.ts`, `charts.ts`

This will keep files small (<150 LOC) and responsibilities clear.
