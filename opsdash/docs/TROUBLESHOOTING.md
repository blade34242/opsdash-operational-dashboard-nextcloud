# Troubleshooting

## Frontend does not load
- Verify bundle exists and is served by Nextcloud.
  - `curl -I http://<host>/apps-extra/opsdash/js/assets/<bundle-from-manifest>.js` → 200
  - If not, `npm run build` and ensure the controller resolves script/style names from `js/.vite/manifest.json`.
- Check browser console for CSP violations.

## Targets card shows 0 % / 0 h
- Open DevTools console and look for `[opsdash] targets summary failed`.
- Cause: older builds referenced `dailyHours` directly inside `computePaceInfo`; the helper now reads `opts.dailyHours`.
- Fix: rebuild with the current sources (`npm run build`) so `/apps-extra/opsdash/js/assets/main-*.js` contains the patched code; confirm the manifest points to the new hash and reload the page.

## No colors for calendars
- Ensure DAV endpoints are reachable.
- Check server logs for color discovery diagnostics.

## Charts not visible
- Confirm data exists for the selected range.
- Try changing the range to week.
- Check for `meta.truncated` banner; results may be partial.

## Notes not saved
- Ensure CSRF token is present (Nextcloud page context) and POST requests are not blocked.

## Performance issues
- Reduce range to week or select fewer calendars.
- Monitor server caps via the banner; caps are 2k per calendar, 5k total.

## UI changes not visible (stale cache)
- Rebuild: `npm run build` (produces new hashed assets in `js/assets/`).
- Restart container; re-enable app: `occ app:disable/enable opsdash`.
- In browser DevTools, enable “Disable cache” and hard-reload.
- Confirm `js/.vite/manifest.json` references the new hash and the HTML includes the matching `<script src="/apps-extra/opsdash/js/assets/...">`.
- Confirm the template still renders the `#app` mount with data attributes.
