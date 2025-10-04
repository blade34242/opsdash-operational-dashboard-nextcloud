# Troubleshooting

## Frontend does not load
- Verify bundle exists and is served by Nextcloud.
  - `curl -I http://<host>/apps-extra/aaacalstatsdashxyz/js/mainXX.js` → 200
  - If not, `npm run build` and ensure controller loads the same `mainXX`.
- Check browser console for CSP violations.

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
- Bump the bundle name in `vite.config.ts` (e.g., `main47.js`) and update controller `Util::addScript`.
- Rebuild: `npm run build`.
- Restart container; re-enable app: `occ app:disable/enable aaacalstatsdashxyz`.
- In browser DevTools, enable “Disable cache” and hard-reload.
- Confirm the page HTML references the new bundle and template has `#app` with data attributes.
