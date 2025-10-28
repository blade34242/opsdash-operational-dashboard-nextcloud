# Testing Improvement Plan

Phased roadmap for strengthening test coverage and automation in the Opsdash
Nextcloud app. Each phase can be tackled incrementally; revisit this document
after each milestone to reprioritise.

## Phase 1 — Coverage Audit & Fixtures

- Inventory existing Vitest suites (composables, sidebar panes, chart helpers,
  presets) and identify gaps (App.vue orchestration, onboarding, DAV fallbacks,
  server responses).
- Capture real `/apps/opsdash/overview/load` and `/overview/persist` payloads
  from the dev Nextcloud instance; store anonymised JSON fixtures under
  `test/fixtures/` for reuse.
- Document assumptions about OC globals (`window.OC.generateUrl`,
  `oc_requesttoken`) to standardise mocking in tests.

## Phase 2 — Integration Harness

- Vitest integration folder exercising composed flows:
  - Boot `useDashboard` + persistence + presets with MSW/fetch mocks.
  - Simulate preset apply → queueSave → chart updates using captured fixtures.
- Extend unit tests:
  - `useCalendarLinks` (done).
  - `useOcHttp`, `useAppMeta`, onboarding helpers once introduced.
- PHPUnit additions for `OverviewController` (`load`, `persist`, `presets*`)
  using fixture payloads to verify sanitisation and response shapes.

## Phase 3 — Regression Workflow

- Add npm scripts:
  - `npm run test:unit` (current Vitest suites).
  - `npm run test:integration` (new integration harness).
  - `npm run test:verify` → unit + integration + `npm run build`.
- Composer script `composer test` for PHPUnit controller coverage.
- CI pipeline running: Vitest (unit + integration), PHPUnit, `npm run build`.
- Optional nightly job: launch Nextcloud docker stack, install Opsdash, run
  Playwright/Cypress smoke tests (load dashboard, toggle range, save/apply
  preset).

## Phase 4 — Continuous Enhancement

- For each new feature: add unit + integration coverage before merge.
- Update fixtures when server payloads change; include migration tests for
  renamed fields or deprecated keys.
- Track coverage metrics quarterly; prioritise low-tested modules (charts,
  onboarding wizard, DAV error handling).
- Revisit this plan after onboarding/theming work lands to align test scope.

---

**Next Action (Highest Priority):** Complete Phase 1 — run the coverage audit
and capture real API fixtures so Phase 2 integration work has accurate data.
