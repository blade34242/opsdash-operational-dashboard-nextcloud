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
- Route: `GET /index.php/apps/opsdash/config_dashboard` (after login)
- Ping: `GET /index.php/apps/opsdash/config_dashboard/ping` (shows version)
