# Testing Strategy Specification

## Purpose
Guarantee every change to Opsdash is covered by fast unit tests (Vitest + PHPUnit) plus an end-to-end smoke test (Playwright) that runs inside a real Nextcloud server, mirroring the official Nextcloud app-template workflows.

## Test layers (current state)
- **Client (Vue/TypeScript):** Vitest suites under `test/` covering composables (`useDashboard*`, `useTheme*`), sidebar panes, chart helpers, and onboarding logic. Command: `npm run test -- --run`.
- **Server (PHP):** PHPUnit suites wired through Composer (`composer run test:unit`) exercising controllers, services, and validators.
- **End-to-end:** A Playwright smoke test (`npm run test:e2e`) that logs into Nextcloud, loads `/index.php/apps/opsdash/overview`, and fails on console errors or missing UI shell.

## How to run everything locally
1. `npm ci` (installs SPA deps) and `composer install` (installs PHP deps) inside `opsdash/`.
2. **Vitest:** `npm run test -- --run`.
3. **Build sanity check:** `npm run build` to refresh hashed assets for manual QA.
4. **PHPUnit:** `composer run test:unit` (requires a Nextcloud dev instance or the checked-out `nextcloud/server` repo; match the GitHub Action for parity).
5. **Playwright:**
   - Install browsers once: `npx playwright install --with-deps chromium`.
   - Ensure a Nextcloud instance is reachable (dev container or `php -S` crude server in the CI workflow).
   - Run `PLAYWRIGHT_BASE_URL=http://localhost:8088 npm run test:e2e` with `PLAYWRIGHT_USER/PASS` if different from `admin/admin`.

## CI contract (GitHub Actions)
- The `Nextcloud Server Tests` job checks out `nextcloud/server@stable31`, copies our app into `server/apps/opsdash`, runs `npm ci → npm run test -- --run → npm run build`, installs PHP 8.2 via `shivammathur/setup-php`, runs `composer install` and `composer run test:unit`, provisions Nextcloud via `php occ maintenance:install`, installs Playwright Chromium, serves Nextcloud with `php -S`, and finally executes `npm run test:e2e`. Artifacts upload the Playwright report.
- This mirrors what other Nextcloud apps (Notes, Deck, Calendar, app-template) do; the only missing piece compared to them is a matrix of Nextcloud branches + PHP versions.

## Next step: broader PHP + Nextcloud coverage
- **Matrix plan:**
  - Add `strategy.matrix.nextcloud_branch` = [`stable31`, `stable32`] once we officially support NC 32.
  - Add `strategy.matrix.php` = [`8.2`, `8.3`] to match the app-template’s coverage. Parameterise the PHP setup and the `env.NEXTCLOUD_BRANCH` slot.
- **Data seeding:** provide a lightweight OCC command or script to seed calendars/tasks so Playwright can assert more than just “page loads”. Keep it optional to maintain runtime under 5 minutes.

## Documentation & ownership
- Keep this file and `docs/DEV_WORKFLOW.md` updated whenever a new test suite, script, or CI job is added.
- Record coverage/expectations per feature in `docs/TESTING_IMPROVEMENT_PLAN.md` (e.g., onboarding wizard snapshot checklist) so future contributors know where to plug tests.
