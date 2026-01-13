# Troubleshooting

## Frontend does not load
- Verify bundle exists and is served by Nextcloud.
  - `curl -I http://<host>/apps-extra/opsdash/js/assets/<bundle-from-manifest>.js` -> 200
  - If not, `npm run build` and ensure the controller resolves script/style names from `js/.vite/manifest.json`.
- Check browser console for CSP violations.

## No colors for calendars
- Check server logs for color discovery diagnostics.

## Charts not visible
- Confirm data exists for the selected range.
- Try changing the range to week.
- Check for `meta.truncated` banner; results may be partial.

## Main content shows only the footer on hard reload
- Confirm `#app` includes `data-opsdash-default-widgets` (template bootstrap).
- Check that `js/.vite/manifest.json` points to the built asset hash and the browser loads it.
- Look for JavaScript errors before Vue mount (console).

## Notes not saved
- Ensure CSRF token is present (Nextcloud page context) and POST requests are not blocked.

## Performance issues
- Reduce range to week or select fewer calendars.
- Monitor server caps via the banner; caps are 2k per calendar, 5k total.

## Cache toggle (server)
- Disable response cache: `occ config:app:set opsdash cache_enabled --value=0` or `OPSDASH_CACHE_ENABLED=0`.
- Adjust TTL: `occ config:app:set opsdash cache_ttl --value=60` or `OPSDASH_CACHE_TTL=60`.

## UI changes not visible (stale cache)
- Rebuild: `npm run build` (produces new hashed assets in `js/assets/`).
- Restart container; re-enable app: `occ app:disable/enable opsdash`.
- In browser DevTools, enable "Disable cache" and hard-reload.
- Confirm `js/.vite/manifest.json` references the new hash and the HTML includes the matching `<script src="/apps-extra/opsdash/js/assets/...">`.
- Confirm the template still renders the `#app` mount with data attributes.
