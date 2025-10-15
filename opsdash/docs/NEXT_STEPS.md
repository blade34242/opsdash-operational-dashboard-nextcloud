# Next Steps Roadmap

Living backlog for hardening and extending the Operational Dashboard.

## Current Snapshot
- Build artefacts are manifest-driven (`npm run build` ⇒ `js/.vite/manifest.json` + hashed files in `js/assets/`).
- Sidebar now splits Calendars and Targets into scrollable tabs; target summary derives from aggregated `byCal` data.
- `computePaceInfo` reads `opts.dailyHours`, resolving the zeroed Targets card regression.
- Core docs (Architecture, API, Configuration, Dev Workflow, Packaging, Troubleshooting) reflect the latest flow.

## P0 — Confidence & Maintenance
- Add Vitest coverage around `buildTargetsSummary`, `computePaceInfo`, and sidebar tab state.
- Document curl flows for `/config_dashboard/persist` and `/config_dashboard/notes` (with CSRF header examples).
- Remove the legacy `/config_dashboard/save` endpoint once consumers confirm the `/persist` JSON shape.

## P1 — Frontend Structure
- Extract remaining logic from `App.vue` into composables (`useStats`, `useTargets`, `useCharts`).
- Consolidate chart drawing helpers under `src/services/charts.ts` with explicit typing.
- Add component tests for chart color mapping, status chips, and tab focus/keyboard behaviour.

## P2 — Server & Performance
- Optionally buffer `load` responses with `OCP\ICacheFactory` (keyed by user + range + selection, TTL ≈ 60 s).
- Normalize heatmap bucketing to the user’s timezone (see `docs/KNOWN_ISSUES.md`).
- Profile aggregation paths and break out larger routines into services for targeted optimization.
- Rework seeding scripts to create realistic mixed-day schedules (08:00–19:00 focus with occasional evening events, category-aware tagging, varied weekday/weekend density).

## P3 — UX & Platform
- Integrate Nextcloud l10n to prepare UI strings for translation.
- Run an accessibility sweep: keyboard navigation in the sidebar, contrast on status chips, aria annotations for charts.
- Improve error UX for CalDAV color discovery (non-blocking toast/banner when DAV fails).

## Validation Checklist
- `npm run build` produces fresh hashed bundles; the HTML references `/apps-extra/opsdash/js/assets/...`.
- `GET /apps/opsdash/config_dashboard/load` returns expected stats/targets for seeded data.
- Sidebar tab selection persists across reloads; Targets card displays current totals/percentages.
- Docs (CHANGELOG, DEV_WORKFLOW, TROUBLESHOOTING, PACKAGING) align with the release artefacts.

## Watchlist / Questions
- Nextcloud 33 support: verify APIs and bump `<nextcloud max-version>` once tested.
- Should CalDAV color refresh be debounced to reduce traffic for large tenant calendars?
