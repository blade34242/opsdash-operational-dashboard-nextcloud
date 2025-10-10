# Configuration

## Metrics
No usage metrics are collected or configurable.

## Environment
- Nextcloud log level controls diagnostic verbosity; debug enables query diagnostics.

## Frontend Build
- `npm ci && npm run build` updates `js/.vite/manifest.json` and hashed bundles under `js/assets/`.

## Colors
- Calendar colors are pulled from server properties when possible; otherwise discovered via DAV per calendar; finally a deterministic fallback is used.

## Performance Caps
- Server caps events per calendar and per request; see PERFORMANCE.md.

## Targets & Sidebar
- The docked sidebar stores user preferences (calendar selection, notes, targets) in the Nextcloud config backend via `POST /persist`.
- Targets configuration includes:
  - Total goal (week/month specific via sidebar range)
  - Per-category targets with weekend inclusion, category labels, and automatic grouping
  - Pacing thresholds, forecast padding, and display toggles
- Sidebar open/closed state is persisted in `localStorage` so the dock reopens in the last used position.
