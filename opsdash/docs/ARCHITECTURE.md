# Architecture Overview

This app provides a Calendar Dashboard for Nextcloud. It consists of:

- PHP backend (AppFramework):
  - Controllers: thin HTTP endpoints only
  - Services: business logic (aggregation, notes)
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
- No admin settings; no usage metrics are collected.

Guiding principles:
- Strict read/write separation (read endpoints: side-effect free; write endpoints: POST+CSRF only).
- Clamp all inputs, intersect calendars with user principal.
- Add soft caps and expose truncation in `meta`.

## Frontend Modules (current)

- `src/App.vue`: hosts the content area, wires data to the docked sidebar and summary cards.
- `src/main.ts`: bootstraps the app.
- `src/components/SidebarDock.vue`: dockable container that persists open/close state and manages the global padding when the sidebar is hidden.
- `src/components/Sidebar.vue`: calendar selection, per-calendar targets, notes, and the targets configuration UI (categories, pacing, forecast, display).
- `src/components/TimeSummaryCard.vue` / `TimeTargetsCard.vue`: summary cards rendered in the main panel.
- `src/components/By*` + chart components: tables and charts rendered inside the tab panels.
- `src/services/targets.ts`: shared calculator for total/category progress, pace, and forecasts.

The "monolith App.vue" phase is over—the major widgets live in their own components, making future changes noticeably easier to reason about.
