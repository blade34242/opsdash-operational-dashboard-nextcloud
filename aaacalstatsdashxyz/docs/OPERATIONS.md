# Operations Guide

## Requirements
- Nextcloud 32
- Node.js 18+ to build frontend (dev only)

## Deploy (UI changes)
1. Place app directory under `apps/aaacalstatsdashxyz/` (or `apps-extra/`).
2. Build frontend: `npm ci && npm run build` (outputs `js/mainXX.js` and `js/.vite/manifest.json`).
   - The controller resolves the built entry via the Vite manifest; no need to bump filenames.
3. Restart and re-enable app to clear opcache:
    - `docker restart <container>`
    - `occ app:disable aaacalstatsdashxyz && occ app:enable aaacalstatsdashxyz`
4. Verify assets and route:
   - `curl -I http://<host>/apps-extra/aaacalstatsdashxyz/js/mainXX.js` → 200 (or any new filename)
    - `curl -I http://<host>/index.php/apps/aaacalstatsdashxyz/config_dashboard` → 200 after login
5. In browser: disable cache in DevTools and hard-reload.

## Logs
- App logs use Nextcloud logging; set system log level to Debug to see query diagnostics (non-sensitive).
- No usage metrics are collected or exposed.

## CSP
- CSS is loaded via `Util::addStyle($app, 'style')`.
- No inline scripts; avoid adding any inline styles in templates.
- Template fallback message uses CSS classes only (no inline styles).

## Performance Caps
- Aggregation caps are reported in `meta.truncated` and `meta.limits`.
- If users often hit caps, consider narrowing calendar selection or reducing range.

## Troubleshooting
- If the frontend does not load, verify `js/main46.js` is present and readable.
- For missing colors, server falls back to DAV discover; ensure DAV endpoints are reachable.
- If charts do not render, check browser console and ensure CSP is not blocking assets.
## Version and Changelog in Footer
- Version sources (order):
  1. Installed app version via `OC_App::getAppVersion()` (template data attributes)
  2. Fallback ping: `GET /apps/aaacalstatsdashxyz/config_dashboard/ping` returns `{version, changelog}`
  3. Build fallback: `package.json` version is shown until (1)/(2) resolve
- Keep `appinfo/info.xml` and `package.json` versions aligned to avoid a temporary mismatch in the footer text (the build fallback may render first).
- Configure changelog URL (dev example):
  - `occ config:app:set aaacalstatsdashxyz changelog_url --value="http://<host>/apps-extra/aaacalstatsdashxyz/docs/CHANGELOG.md"`

## Developer Convenience (dev instance)
- Reduce caching during development:
  - `occ config:system:set debug --type=boolean --value=true`
  - `occ config:system:set loglevel --value=0`
