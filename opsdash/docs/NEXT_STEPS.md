# Next Steps Roadmap

Living backlog for hardening and extending the Operational Dashboard.

## Current Snapshot
- Build artefacts are manifest-driven (`npm run build` ⇒ `js/.vite/manifest.json` + hashed files in `js/assets/`).
- Sidebar panes live in dedicated components with shared validation helpers; target summary derives from aggregated `byCal` data.
- `computePaceInfo` reads `opts.dailyHours`, resolving the zeroed Targets card regression.
- All-day calendar events are normalised server-side (structured query + ICS fallback) and use the configurable “All-day event (h per day)” slider in the Targets pane; charts now show a single-day column for all-day entries.
- Core docs (Architecture, API, Configuration, Dev Workflow, Packaging, Troubleshooting) reflect the latest flow.

## Execution Order (Lean + Tested)
1. Lock requirements for onboarding, targets, theming (answer open questions) — ✅ decisions captured in `docs/ONBOARDING_WORKFLOW.md` and `docs/LIGHT_DARK_THEMING.md` (2025-03).
2. Establish testing infrastructure (PHPUnit + Vitest) and add baseline coverage.
3. Implement shared validation helpers with inline feedback — ✅ numeric validation helper extracted (2025-10); structured 400 responses + full localisation wiring (2025-11).
4. Execute architecture refactor (split App/Sidebar/targets/services) — 🔄 `App.vue` trimmed; sidebar panes/composables in place; continue carving persistence.
5. Build onboarding wizard + strategy profiles.
6. Roll out theming, collapsed controls, keyboard shortcuts overlay.
7. Update endpoints/docs (rename to `/overview/`) and polish copy (balance card).
8. Keep tests green after every milestone, add cases as features land.
- When refactoring Sidebar → composables, ship helpers behind opt-in flags and smoke-test in the Nextcloud instance first. A direct swap to `useTargets` caused a runtime `ReferenceError: useTargets is not defined` (sidebar rendered empty). Reattempt once the helper is fully exported/bundled.

## P0 — Confidence & Maintenance
- Add Vitest coverage around `buildTargetsSummary`, `computePaceInfo`, sidebar/balance tabs, and chart helpers. — ✅ covered (2025-03); expand to chart rendering + keyboard shortcuts in upcoming work.
- Document curl flows for `/config_dashboard/persist` and `/config_dashboard/notes` (with CSRF header examples). — ✅ exemples added (2025-03).
- Remove the legacy `/config_dashboard/save` endpoint once consumers confirm the `/persist` JSON shape. — ✅ removed in favour of `/persist` (2025-03).
- Establish shared client/server validation helpers and inline feedback per `docs/INPUT_VALIDATION_PLAN.md`. — ✅ numeric inputs funnel through shared helpers on client/server (2025-03); structured 400 responses + localisation delivered (2025-11); keep translation files updated alongside feature work.
- Implement unified testing strategy (`docs/TESTING_STRATEGY.md`): add PHPUnit service/controller tests and Vitest component/composable coverage. — ✅ baseline suites for validators, controller sanitisation, dashboard tabs/pacing/charts now in place; plan coverage for keyboard shortcuts & charts in render mode.

## P1 — Frontend Structure
- Extract remaining logic from `App.vue` into composables (queueSave/persist and chart bootstrapping still live in `App.vue`).
- Consolidate chart drawing helpers under `src/services/charts.ts` with explicit typing.
- Add component tests for chart color mapping, status chips, and tab focus/keyboard behaviour. — ✅ initial chart + pane coverage added (2025-10); extend to keyboard shortcuts.
- Implement onboarding wizard per `docs/ONBOARDING_WORKFLOW.md`, including strategy
  selection (`docs/TARGET_STRATEGIES.md`) and calendar/category seeding.
- Execute architecture refactor plan (`docs/ARCHITECTURE_REFACTOR_PLAN.md`): continue carving `App.vue`, detach targets services, then move theme boot logic into a dedicated module.

## P2 — Server & Performance
- Optionally buffer `load` responses with `OCP\ICacheFactory` (keyed by user + range + selection, TTL ≈ 60 s).
- Normalize heatmap bucketing to the user’s timezone (see `docs/KNOWN_ISSUES.md`).
- Profile aggregation paths and break out larger routines into services for targeted optimization.
- Rework seeding scripts to create realistic mixed-day schedules (08:00–19:00 focus with occasional evening events, category-aware tagging, varied weekday/weekend density).

## P3 — UX & Platform
- Maintain Nextcloud l10n coverage for new UI strings; keep translation files in sync with feature work.
- Run an accessibility sweep: keyboard navigation in the sidebar, contrast on status chips, aria annotations for charts.
- Improve error UX for CalDAV color discovery (non-blocking toast/banner when DAV fails).
- Roll out light/dark theming in phases as outlined in `docs/LIGHT_DARK_THEMING.md`,
  starting with the main dashboard once onboarding ships.
- Design and implement sidebar-collapsed range controls so users can move between
  weeks/months even when the navigation panel is hidden.
- Add a “Keyboard shortcuts” cheat sheet popup accessible from the sidebar once
  new shortcuts land; include range navigation keys, notes editor commands, etc.

## Validation Checklist
- `npm run build` produces fresh hashed bundles; the HTML references `/apps-extra/opsdash/js/assets/...`.
- `GET /apps/opsdash/config_dashboard/load` returns expected stats/targets for seeded data.
- Sidebar tab selection persists across reloads; Targets card displays current totals/percentages.
- Docs (CHANGELOG, DEV_WORKFLOW, TROUBLESHOOTING, PACKAGING) align with the release artefacts.

## Watchlist / Questions
- Nextcloud 33 support: verify APIs and bump `<nextcloud max-version>` once tested.
- Should CalDAV color refresh be debounced to reduce traffic for large tenant calendars?
