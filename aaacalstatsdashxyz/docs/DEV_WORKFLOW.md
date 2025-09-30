# Dev Workflow (UI + Server)

This checklist ensures changes show up reliably in a Nextcloud dev container.

## UI changes (Vue)
- Bump bundle name (cache-bust): in `vite.config.ts` change `entryFileNames` (e.g., `main48.js`).
- Update controller loader: `Util::addScript($app, 'main48')`.
- Build: `npm ci && npm run build`.
- Restart + re-enable app to flush opcache: `docker restart <container>` then `occ app:disable/enable aaacalstatsdashxyz`.
- Verify asset 200 OK with curl; hard-reload browser with cache disabled.

## Footer version + Changelog
- Version sources (fallback chain): template → ping → package.json.
- Configure changelog URL for dev: `occ config:app:set aaacalstatsdashxyz changelog_url --value="http://<host>/apps-extra/aaacalstatsdashxyz/docs/CHANGELOG.md"`.

## Seeding data
- Create 10 calendars: `./tools/create_calendars.sh`.
- Week (TOTAL=40): `./tools/seed_week_multi.sh`.
- Month (TOTAL=250; target by YEAR/MONTH): `./tools/seed_month_multi.sh`.

## Debug-friendly settings (dev only)
- `occ config:system:set debug --type=boolean --value=true`
- `occ config:system:set loglevel --value=0`

## Quick verification
- Icon: `GET /apps-extra/aaacalstatsdashxyz/img/app.svg` → 200
- JS: `GET /apps-extra/aaacalstatsdashxyz/js/mainXX.js` → 200
- Route: `GET /index.php/apps/aaacalstatsdashxyz/config_dashboard` (after login)
- Ping: `GET /index.php/apps/aaacalstatsdashxyz/config_dashboard/ping` (shows version)

