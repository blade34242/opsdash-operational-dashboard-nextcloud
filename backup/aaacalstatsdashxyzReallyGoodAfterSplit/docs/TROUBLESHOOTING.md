# Troubleshooting

## Frontend does not load
- Verify `js/main46.js` exists and is served by Nextcloud.
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
