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
- The CI job fans out across explicit matrix entries (`stable30/31` × PHP `8.2/8.3`). The list lives in `.github/ci-matrix.json`; `matrix-config` reads that file and passes only the objects with `"enabled": true` into the workflow.
- To disable or enable a target, flip the `enabled` boolean inside `ci-matrix.json`. We keep speculative entries (e.g., `stable32`) in the file with `enabled: false` so it’s a one-line change when support lands.
- When we need wider coverage (stable33 previews, PHP 8.4), append new objects to `ci-matrix.json` with `enabled: false` until the manifest and manual testing are ready, mirroring the workflow used by Nextcloud’s official app template.
