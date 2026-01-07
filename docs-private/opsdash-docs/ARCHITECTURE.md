# Architecture Overview

Opsdash is a Nextcloud app with a PHP backend and a Vue 3 SPA. The backend focuses on data collection,
sanitisation, and persistence; the frontend renders widgets and drives configuration.

## Request Flow

1. User opens the app navigation entry -> PHP controller loads CSS + JS and template.
2. Frontend boots and calls `GET /overview/load` with `range` + `offset`.
3. Server aggregates calendar stats and returns JSON with:
   - `stats`, `byCal`, `byDay`, `longest`, `charts`
   - `meta` with `from`, `to`, and optional `truncated` caps
   - `colors` and `groups` (categories map to group ids internally; UI exposes category selectors)
4. User adjusts selection/targets -> client POSTs to `persist` (CSRF); reloads data.
5. Notes are fetched and saved per period via `GET/POST /notes`.

## Backend Modules

- Controllers:
  - `Controller/OverviewController.php`: `index`, `load`, `ping`.
  - `Controller/PersistController.php`: `persist` (POST `/overview/persist`)
  - `Controller/NotesController.php`: `notes` (GET) / `notesSave` (POST) at `/overview/notes`
  - `Controller/PresetsController.php`: profile list/save/load/delete at `/overview/presets`
- No admin settings; no usage metrics are collected.
- Services:
  - `PersistSanitizer`: sanitises targets/balance/reporting/deck/onboarding/theme payloads.
  - `UserConfigService`: centralises read-back + defaults for user config blobs (theme/reporting/deck/targets/onboarding).
  - `OverviewEventsCollector`, `OverviewAggregationService`, `OverviewChartsBuilder`, `OverviewBalanceService`: read-path helpers used by `/overview/load`.

Guiding principles:
- Strict read/write separation (read endpoints: side-effect free; write endpoints: POST+CSRF only).
- Clamp all inputs, intersect calendars with user principal.
- Add soft caps and expose truncation in `meta`.

## Frontend Modules (current)

- `src/App.vue`: root orchestrator (load, persist, widget layout, sidebar wiring).
- `src/components/Sidebar.vue`: sidebar shell; panes under `src/components/sidebar/`.
- `composables/useDashboard*`: load/persist/selection/profile orchestration helpers.
- `composables/useCategories.ts`, `useCharts.ts`, `useSummaries.ts`, `useBalance.ts`: shared data shaping for cards/widgets.
- `src/services/widgetsRegistry/`: widget definitions + default layout/options.
- `src/services/targets/`: targets math, forecasts, pace logic.

Widget rendering is registry-driven; most visual units are standalone components to keep App.vue lean.
