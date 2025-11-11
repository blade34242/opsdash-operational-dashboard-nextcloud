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
  `oc_requesttoken`) to standardise mocking in tests. Capture all of this in
  `docs/INTEGRATION_TESTING.md` so the end-to-end instructions live in one
  place.

### Coverage snapshot (2025-11-10)
- **Covered (unit)**: `useDashboard`, `useDashboardSelection`, `useDashboardPersistence`
  (now guarding schema gaps such as `balance.ui.showNotes`), `useDashboardPresets`,
  `useCalendarLinks`, `useCharts`, sidebar pane components,
  preset/targets/pace helpers, validators, onboarding wizard state helper.
- **Not yet covered**: `useOcHttp`, `useAppMeta`, App.vue orchestration (remaining range toolbar/export helpers),
  onboarding workflow (planned), DAV fallback error states, PHP
  `OverviewController` load/persist logic.
- **Next action**: Add quick Vitest suites for `useOcHttp`/`useAppMeta` when
  authoring Phase 2 integration harness.

### Fixture capture checklist
1. Start local/staging Nextcloud with Opsdash enabled.
2. Request load payloads (week & month) and persist responses, e.g.:
   ```bash
   curl -sS -u admin:admin \
     -H "OCS-APIREQUEST: true" \
     -H "requesttoken: <token>" \
     "http://localhost:8088/index.php/apps/opsdash/overview/load?range=week&offset=0" \
     > test/fixtures/load-week.json
   ```
   Repeat for `range=month`, `offset=±1`, and for `persist` responses after
   modifying selections in the UI.
3. Anonymise calendar IDs/names if necessary (replace with `cal-1`, `Focus`…).
4. Drop files into `test/fixtures/` so integration tests can replay them.
   (See `test/fixtures/README.md` for the full checklist.)

## Phase 2 — Integration Harness

- Vitest integration folder exercising composed flows:
  - Boot `useDashboard` + persistence + presets with MSW/fetch mocks.
  - Simulate preset apply → queueSave → chart updates using captured fixtures.
- Extend unit tests:
  - `useCalendarLinks` (done).
  - `useOcHttp`, `useAppMeta` (pending); onboarding wizard state helper covered in 0.4.4 (`test/useOnboardingWizard.test.ts`).
- PHPUnit additions for `OverviewController` (`load`, `persist`, `presets*`)
  using fixture payloads to verify sanitisation and response shapes.
- Playwright smoke tests log into NC, open Opsdash, and ensure the SPA mounts
  without `[opsdash] Vue error` (baseline E2E coverage in CI). Expand them per
  the new integration guide once OCC seeding is automated.

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
