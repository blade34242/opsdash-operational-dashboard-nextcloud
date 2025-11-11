# Dev Workflow (UI + Server)

This checklist ensures changes show up reliably in a Nextcloud dev container.

## UI changes (Vue)
- Build: `npm ci && npm run build` (outputs hashed JS under `js/assets/` and updates `js/.vite/manifest.json`).
- Restart + re-enable app to flush opcache: `docker restart <container>` then `occ app:disable/enable opsdash`.
- Verify bundle via the manifest (`cat js/.vite/manifest.json`) and hard-reload the browser with cache disabled.
- Run `npm test -- --run` after config/chart changes. Forecast logic, sidebar toggles, and server sanitizers have Vitest coverage (`test/useCharts.test.ts`, `test/SidebarActivityPane.test.ts`, …); keeping those tests green ensures load/save/preset symmetry.

## Footer version + Changelog
- Version sources (fallback chain): template → ping → package.json.
- Configure changelog URL for dev: `occ config:app:set opsdash changelog_url --value="http://<host>/apps-extra/opsdash/docs/CHANGELOG.md"`.

## Seeding data
- Create 10 calendars: `./tools/create_calendars.sh`.
- Week (TOTAL=40): `./tools/seed_week_multi.sh`.
- Month (TOTAL=250; target by YEAR/MONTH): `./tools/seed_month_multi.sh`.

## Debug-friendly settings (dev only)
- `occ config:system:set debug --type=boolean --value=true`
- `occ config:system:set loglevel --value=0`

## Quick verification
- Icon: `GET /apps-extra/opsdash/img/app.svg` → 200
- JS: `GET /apps-extra/opsdash/js/assets/<manifest file>` → 200 (match the filename from `js/.vite/manifest.json`)
- Route: `GET /index.php/apps/opsdash/overview` (after login)
- Ping: `GET /index.php/apps/opsdash/overview/ping` (shows version)

## Playwright smoke test
- Install browsers once: `npx playwright install --with-deps chromium`.
- Export the base URL (defaults to `http://localhost:8088`): `PLAYWRIGHT_BASE_URL=http://localhost:8088 npm run test:e2e`.
- The test (`tests/e2e/dashboard.spec.ts`) asserts that the dashboard mounts without `[opsdash] Vue error` in the console. The GitHub Action provisions `nextcloud/server@stable31`, enables the app, and runs the same command via `npm run test:e2e`.

## GitHub Actions (Nextcloud Server Tests)
- **Checkout** `nextcloud/server@stable31` under `server/` and this repo under `app-src/`, then `rsync` `opsdash/` into `server/apps/opsdash/` to mirror a real Nextcloud install.
- **Node stage:** `npm ci`, `npm run test -- --run`, and `npm run build` to guarantee hashed assets are up to date.
- **PHP stage:** `shivammathur/setup-php@v2` installs PHP 8.2 with `mbstring`, `intl`, `gd`, then `composer install` inside the app.
- **Nextcloud bootstrap:** `php occ maintenance:install --database=sqlite …` followed by `php occ app:enable opsdash` so PHPUnit and Playwright run against a working instance.
- **Tests:** `composer run test:unit` exercises PHP services/controllers, `npx playwright install --with-deps chromium` ensures the browser binary exists, a PHP built-in server serves Nextcloud, and `npm run test:e2e` runs the Playwright smoke test before artifacts are uploaded and the server is stopped.

## Going further (PHP & Nextcloud versions)
- The CI job already fans out across `nextcloud_branch ∈ {stable31, stable32}` and `php_version ∈ {8.2, 8.3}`, mirroring the official app-template approach. Each combination checks out the matching `nextcloud/server` branch, installs the requested PHP version, and runs the full suite.
- When we need even wider coverage (e.g., stable33 previews or PHP 8.4), extend the `strategy.matrix` to add the new entries. Remember to keep `fail-fast: false` so one failing combo does not hide results from the others.
