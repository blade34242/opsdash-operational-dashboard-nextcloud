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
  - Per-category targets with weekend inclusion, category labels, and automatic grouping (calendars take the group id of the selected category; users no longer edit group numbers)
  - Pacing thresholds, forecast padding, and display toggles
  - A global “All-day event hours” control (0–24 h) that defines how many hours a multi-day all-day event contributes per day; the value is shared across server aggregation and the dashboard UI.
- Switching the range (Week⇄Month) recalculates the entire Targets stack on the fly: monthly totals are derived from their weekly definitions (×4) when no explicit monthly values exist, and the summary/forecast cards automatically swap to the selected range’s data.
- Sidebar open/closed state is persisted in `localStorage` so the dock reopens in the last used position.

## Card Settings (Sidebar ➜ Cards tab)
- **Activity & Schedule card** — show/hide: weekend share, evening share, earliest/late times, overlaps, longest session, last day off, and the category-mapping hint.
- **Balance Overview card** — configure share/index thresholds, relation display mode (ratio/factor), trend lookback window, insight toggle, optional daily stacks, and rounding precision for percentages/ratios.
