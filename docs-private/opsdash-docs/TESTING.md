# Testing Guide

Holistic reference for Opsdash validation. It unifies the strategy, how-to runbooks, CI contract, integration harness, and improvement roadmap so contributors only need this document.

---

## Goals & Scope
- Guarantee every change hits fast unit suites (Vitest + PHPUnit) plus at least one end-to-end Playwright smoke test that runs inside a real Nextcloud server.
- Mirror the workflows used by official Nextcloud apps (Deck, Notes, Calendar) so compatibility issues surface before release branches ship.
- Keep deterministic fixtures for `/apps/opsdash/overview/*` + CalDAV metadata so composables and controllers can be regression-tested without hitting a live server.

---

## Test Layers (current state)
| Layer | Location | Command | Notes |
| --- | --- | --- | --- |
| SPA unit/integration | `opsdash/test/*.test.ts` | `npm run test -- --run` | Covers composables (`useDashboard*`, `useTheme*`), panes, chart helpers, onboarding logic, and fixture-driven integration suites. |
| PHP unit | `lib/` via PHPUnit | `composer run test:unit` | Controllers/services/validators; run after `composer install`. |
| Playwright smoke | `tests/e2e/dashboard.spec.ts` | `PLAYWRIGHT_BASE_URL=... npm run test:e2e` | Logs into NC, mounts Opsdash, fails on `[opsdash] Vue error`, verifies sidebar + preset actions. |

Always run `npm run build` once after Vitest to ensure hashed assets match any manual QA or packaging work.

---

## Feature Test Plans (new additions)

### Dashboard layout tabs (top-of-page)
- **Unit (Vitest)**:
  - `useWidgetLayoutManager` should normalize legacy widget arrays into a single “Overview” tab.
  - Add/remove/rename tab updates `defaultTabId` safely (never empty when tabs exist).
  - Switching tabs swaps widget lists without mutating other tabs.
  - `setDefaultTab` sets both `defaultTabId` and `activeTabId` and persists.
- **Integration (Vitest)**:
  - `/overview/load` response with `widgets.tabs` initializes the active tab and renders the correct layout.
  - `/overview/persist` echoes `widgets` payload and the client normalizes any invalid/missing fields.
  - Export/import round-trip keeps tabs + default tab intact.
- **Playwright**:
  - Add new tab, rename it, set default, and refresh → same tab loads.
  - Add widget to a secondary tab; verify it does **not** render on the primary tab.
  - Remove a tab and ensure the layout falls back to the remaining tab without errors.

### Widget layout persistence
- **Unit (Vitest)**: exercise `normalizeWidgetTabs` with mixed inputs (legacy array, tabbed payload, invalid shapes).
- **PHPUnit**: `PersistController` sanitizes `widgets` payload and preserves allowed layout fields (width/height/order/options).
- **PHPUnit**: `NotesController` guards auth and clamps range/offset in `notes()` (see `tests/php/Controller/NotesControllerTest.php`).
- **PHPUnit**: `NotesService` history/escaping/truncation (`tests/php/Service/NotesServiceTest.php`).

### UI regression checks
- **Playwright**:
  - “Edit layout” toolbar remains visible, tabs render next to it, and “Add widget” still functions.
  - No console errors when switching tabs or saving layout.
- **Vitest**:
  - Sidebar rangebar emits range/offset/refresh events (`test/SidebarRangebar.test.ts`).

---

## Seeding & Fixtures (Nextcloud style)
- One-shot seed (calendars + Deck) against a running NC (e.g., `docker-compose up -d`):
  ```bash
  docker exec -it nc31-dev bash -lc '
    cd /var/www/html &&
    BASE=http://localhost:8088 \
    ADMIN_USER=admin ADMIN_PASS=admin \
    QA_USER=qa QA_PASS=qa \
    QA2_USER=qa2 QA2_PASS=qa2 \
    WEEKS=4 \
    APP_PATH=/var/www/html/apps-extra/opsdash \
    bash /var/www/html/apps-extra/opsdash/tools/seed_opsdash.sh
  '
  ```
  Adjust container name, BASE, and APP_PATH to your mount. The script creates/ensures users, seeds 3–5 calendars per user, and 5 Deck boards with open/done/archived cards. Safe to re-run.
- Script defaults: seeds past-only events for the last 4 weeks (`WEEKS=4`), no future events, realistic work + weekend mix.
- To change span: set `WEEKS=N` (e.g., `WEEKS=8`) before the script.
- Capture fixtures (optional, after seeding):
  ```bash
  BASE=http://localhost:8088 ADMIN_USER=admin ADMIN_PASS=admin \
    bash tools/capture_opsdash_fixtures.sh
  ```
  Outputs `tools/fixtures/load-week.json`, `load-month.json`, `deck-boards.json`.
- CI hook: `.github/workflows/server-tests.yml` now runs `tools/seed_opsdash.sh` inside the server container (after starting php -S) so Playwright hits seeded calendars + Deck data without bundling runtime seeding.

---

## Local Workflow
```bash
cd opsdash
npm ci
composer install
npm run test -- --run
npm run build
composer run test:unit
PLAYWRIGHT_BASE_URL=http://localhost:8088 npm run test:e2e
```
- Install Playwright browsers once: `npx playwright install --with-deps chromium`.
- When targeting other users, export `PLAYWRIGHT_USER/PASS`.
- Need a reproducible NC stack? Reuse the CI recipe: clone `nextcloud/server`, checkout `stable31`, copy the app into `server/apps/opsdash`, run `php occ maintenance:install ...`, enable `calendar` + `opsdash`.

---

## CI Contract (GitHub Actions)
- Workflow: `.github/workflows/server-tests.yml`.
- Matrix source: `.github/ci-matrix.json`. Currently enabled combos: `nextcloud_branch ∈ {stable30, stable31}` × `php_version ∈ {8.2, 8.3}`. Entries for `stable32` exist but are disabled until `info.xml` allows it.
- Each job performs:
  1. `actions/checkout` of `nextcloud/server` (selected branch) and app source.
  2. `npm ci → npm run test -- --run → npm run build`.
  3. `shivammathur/setup-php` with requested PHP version + extensions.
  4. `composer install` + `composer run test:unit` inside `server/apps/opsdash`.
  5. `php occ maintenance:install`, enable Calendar + Opsdash.
  6. Install Playwright Chromium, serve NC via `php -S 127.0.0.1:8080`, run `npm run test:e2e` with `PLAYWRIGHT_*` env.
  7. Upload Playwright report artifacts per matrix entry.
- This mirrors official Nextcloud app workflows; once we widen support, we just flip `enabled` flags in `ci-matrix.json`.

---

## Calendar Fixtures & Integration Testing
Opsdash depends on `/apps/opsdash/overview/*` and CalDAV metadata. Keep the following playbook handy when capturing fixtures or debugging integration failures.

### 1. Clone the server tree (matches CI)
```bash
git clone --depth=1 --branch stable31 https://github.com/nextcloud/server.git nc-server
rsync -a ../opsdash nc-server/apps/opsdash
cd nc-server
php occ maintenance:install --database=sqlite \
  --database-name=nextcloud --admin-user admin --admin-pass admin
php occ app:enable calendar
php occ app:enable opsdash
```
This is identical to CI, so anything that breaks locally will reproduce remotely.

### 2. Seed deterministic calendar data
Option A – OCC helpers:
```bash
php occ user:add --password-from-env qa
export OC_PASS=qa-secret
php occ dav:create-calendar qa opsdash-week "Opsdash Week" --color="#7DAFFF"
php occ dav:create-calendar qa opsdash-month "Opsdash Month" --color="#FFB347"
php occ dav:import qa opsdash-week apps/opsdash/tools/seed/fixtures/week.ics
php occ dav:import qa opsdash-month apps/opsdash/tools/seed/fixtures/month.ics
```
Option B – curl CalDAV uploads (`tools/seed_*.sh` wrap this logic) with env overrides:
```bash
BASE=http://localhost:8088 USER=admin PASS=admin ./tools/create_calendars.sh
BASE=http://localhost:8088 USER=admin PASS=admin ./tools/seed_week_multi.sh TOTAL=40
```
Scripts available: `create_calendars.sh`, `seed_week.sh`, `seed_month.sh`, `seed_week_multi.sh`, `seed_month_multi.sh`, `seed_opsdash_demo.sh`, `seed_month_work.sh`. Each accepts `BASE`, `USER`, `PASS`, plus fine-grained controls (`TOTAL`, `EVENTS`, `MONTH_OFFSET`, etc.).

### Deck QA board/cards
```bash
QA_USER=qa php apps/opsdash/tools/seed_deck_boards.php
# customize the board title/color if needed
QA_USER=qa QA_DECK_BOARD_TITLE="Opsdash Deck QA" QA_DECK_BOARD_COLOR="#2563EB" php apps/opsdash/tools/seed_deck_boards.php
```
The script resets (or creates) the QA Deck board, stacks, labels, and cards the SPA + Playwright depend on. Set `QA_DECK_KEEP_STACKS=1` to reuse an existing layout. The helper `./tools/seed_deck_occ.sh` runs the same PHP entry point inside Docker during CI.

### 3. Scripted API checks
```bash
OPSDASH_BASE=http://localhost:8088/index.php/apps/opsdash
curl -sS -u admin:admin -H 'OCS-APIREQUEST: true' \
  "$OPSDASH_BASE/overview/load?range=week&offset=0" | jq '.charts'

TOKEN=$(php occ config:system:get secret --output=json)
curl -sS -u admin:admin \
  -H "requesttoken: $TOKEN" -H 'OCS-APIREQUEST: true' \
  -d '{"selected": ["opsdash-week"]}' \
  "$OPSDASH_BASE/overview/persist"

curl -sS -u qa:${OC_PASS} -X PROPFIND \
  -H 'Depth: 0' -H 'Content-Type: application/xml' \
  -d '<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:ical="http://apple.com/ns/ical/">\n        <d:prop><ical:calendar-color/></d:prop>\n      </d:propfind>' \
  "$BASE/remote.php/dav/calendars/qa/opsdash-week/"
```
Save successful payloads under `opsdash/test/fixtures/` (see `test/fixtures/README.md`). Use anonymised calendar IDs (`cal-1`, `opsdash-week`).
- Preset envelopes live alongside those payloads (`preset-export.json`); `test/useDashboardPresets.test.ts` replays that export end-to-end to ensure imported configs apply cleanly and still trigger `queueSave`.
- PHP unit tests (`tests/php/Controller/PresetsControllerTest.php`) reuse the same preset fixture to assert `sanitizePresetPayload()` accepts exported data without warnings.
- Offset fixtures (`load-week-offset-1.json`, `load-week-offset2.json`, `load-month-offset1.json`) keep Vitest and PHPUnit in sync on date-boundaries; `dashboardIntegration.test.ts` ensures the SPA honours `meta.offset`, and the PHP suite parses them to watch for schema changes.
- Additional fixture coverage:
  - `load-month-multiuser.json` exercises month view with multiple calendars.
  - `persist-response.json` mirrors `/overview/persist` output; `useDashboardPersistence.test.ts` replays it to ensure client/server merge logic stays aligned.
  - `persist-reporting-deck.json` ensures reporting config + Deck settings stay in sync when `/overview/persist` responses change.
  - `load-month-qa.json` provides the seeded QA month payload used in Playwright and integration tests.

### 4. Wiring into automated tests
1. **Vitest integration harness**: load fixture JSON, stub `fetch`, spin up `useDashboard`, assert charts/cards match expectations.
2. **Playwright flows**: log in, switch to seeded calendars, re-run onboarding, save presets, and verify console logs stay clean.
3. **Optional CalDAV contract tests**: borrow Nextcloud Calendar’s test strategies to ensure `calendar-color` parsing survives server changes.

---

## Improvement Roadmap
Phased plan (adapted from the former `TESTING_IMPROVEMENT_PLAN.md`). Update this section whenever a milestone completes.

### Phase 1 – Coverage Audit & Fixtures ✅ (snapshot 2025‑11‑10)
- Inventory Vitest suites (`useDashboard*`, sidebar panes, charts, onboarding, presets).
- Capture `/overview/load` & `/overview/persist` payloads for week/month ± offsets.
- Document OC globals/mocks (now covered here + `test/fixtures/README.md`).
- **Status:** Most composables covered; pending: `useOcHttp`, `useAppMeta`, PHP load/persist fixture coverage.

### Phase 2 – Integration Harness (in progress)
- Expand Vitest integration suites using captured fixtures.
- Add PHPUnit coverage for `OverviewController` (`/overview/load`) plus the write controllers (`PersistController`, `PresetsController`, `NotesController`) sanitisation and schema stability.
- Extend Playwright to exercise onboarding reruns + preset save/load (parts already landed; continue iterating).

### Phase 3 – Regression Workflow
- npm scripts for targeted suites (`test:unit`, `test:integration`, `test:verify`).
- Composer `test` alias.
- CI ensures Vitest + PHPUnit + build for every matrix entry (already true; integrate new scripts once they exist).
- Optional nightly job that seeds calendars via OCC then runs extended Playwright checks.

### Phase 4 – Continuous Enhancement
- Require tests for every new feature before merge.
- Refresh fixtures whenever backend schema changes.
- Track coverage quarterly, prioritising low-test modules (charts, DAV fallbacks, App.vue orchestration).

**Next Action:** Finish Phase 2 by landing fixture-driven Vitest integration suites for preset import/export and onboarding flows, then add the matching PHPUnit controller tests.

---

## Ownership & Documentation
- Keep this guide and `DEV_WORKFLOW.md` in sync whenever tooling or CI steps change.
- When new scripts land (e.g., preset curl helpers, pentest probes), reference them here so contributors know how they affect testing.
- Update `docs-private/README.md` after each consolidation so new hires know where to look.
