# Configuration

## Admin Settings
No usage metrics are collected.

## Environment
- Nextcloud log level controls diagnostic verbosity; debug enables query diagnostics.

## Frontend Build
- `npm ci && npm run build` outputs `js/main46.js`.

## Colors
- Calendar colors are pulled from server properties when possible; otherwise discovered via DAV per calendar; finally a deterministic fallback is used.

## Performance Caps
- Server caps events per calendar and per request; see PERFORMANCE.md.
