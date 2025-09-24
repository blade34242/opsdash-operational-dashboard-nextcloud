# Next Steps Roadmap

This document captures a prioritized plan to harden, modularize, and validate the Calendar Dashboard app.

## Current State (summary)
- Backend: Thin controller exposes read-only `load`, POST `persist`/`save` (legacy), notes endpoints; input clamps; color normalization; soft caps with truncation metadata.
- Frontend: Single `App.vue` with Sidebar/Charts/Notes mixed; global CSS extracted; charts drawn via canvas helpers in-SFC.
- Build: Vite with `@nextcloud/vite-config`; controller loads `css/style.css` and `js/main46.js`.
- Docs: Architecture, API, Security, Performance, Operations, Configuration, Troubleshooting, Upgrade, Changelog, Contributing.

## Risks / Gaps
- Asset name coupling: hard-coded `main46` in PHP (brittle with future builds).
- Large `App.vue`: lower readability/testability; planned modularization not yet applied.
- Template fallback uses inline styles (minor CSP risk if strict `style-src`).
- No unit tests for TS logic; no lightweight stubs for API client.
- Optional: no caching for repeated queries; could improve perceived performance.

## P0 — Immediate (stability, clarity)
- Asset reference: adopt Vite manifest loader in PHP to resolve the built entry dynamically (remove hard-coded `main46`).
- Remove dead code path: drop POST handling branch in `load()` (route is GET-only); simplify to avoid confusion.
- Template cleanup: replace inline styles in `templates/config_dashboard.php` fallback with CSS classes in `css/style.css`.
- Docs: add curl examples for `persist` and `notes` with CSRF header; verify README references to `main46.js` (done) and link this roadmap.

## P1 — Frontend modularization (maintainability)
- Split `App.vue` into components:
  - `components/Sidebar.vue` (selection, groups, notes panel)
  - `components/Charts/` (PieChart, StackedBars, Heatmap)
  - `components/Tables/` (ByCalendarTable, ByDayTable, LongestTable)
- Add composables in `src/composables/`:
  - `useRange.ts`, `useCalendars.ts`, `useCharts.ts`, `useNotes.ts`
- Extract chart drawing utils into `src/services/charts.ts`; consolidate color helpers in `src/services/colors.ts`.

## P2 — Testing and performance (confidence)
- Add Vitest + `jsdom` unit tests for composables and chart utils; mock fetch for API client.
- Introduce optional caching on server via `OCP\\ICacheFactory` keyed by user+range+selection; short TTL (e.g., 60–120s).
- Add lightweight PHP unit tests (where feasible) for input clamps and color normalization.

## P3 — Enhancements (nice-to-have)
- Internationalization scaffolding (Nextcloud l10n) for UI strings.
- Accessibility sweep: labels, contrast, keyboard navigation for sidebar and tabs.
- Error UX: user-friendly banners for DAV/color discovery failures.

## Acceptance Criteria
- P0: App loads without asset-name changes after rebuild; `load` is GET-only; no inline styles in template fallback; docs include verified curl flows.
- P1: `App.vue` < 200 LOC; major UI pieces live in dedicated components; composables tested.
- P2: Unit test suite runs via `npm test`; server cache toggled behind simple boolean for easy rollback.

## Validation Checklist
- Build: `npm run build` produces assets; PHP resolves entry from manifest.
- API: `GET /load`, `POST /persist`, `GET/POST /notes` pass curl checks (with session + CSRF for POST).
- UI: Charts render; truncation banner shows when caps hit; notes save and reload correctly.

## Open Questions
- Should we support NC 31–32 only or extend to 33 when available? (affects API calls and assets)
- Do we want to keep `save` (legacy) or deprecate fully in favor of `persist`?

