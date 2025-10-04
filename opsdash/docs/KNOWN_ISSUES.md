# Known Issues

## Brief color flip in charts on first load
- Symptom: Pie and stacked bar colors briefly show default/fallback hues, then update to the final calendar colors a moment later.
- Cause: Colors resolve in two phases.
  - Backend sends initial colors with the first `load` response (from available calendar metadata or a deterministic fallback).
  - Client then performs a CalDAV PROPFIND to retrieve each calendar’s `calendar-color` for users/calendars where the server did not provide a color. When these arrive, the client recomputes chart colors and redraws, producing a short visual color change.
- Code references:
  - Initial colors and chart data: `lib/Controller/ConfigDashboardController.php` (keys: `colors.byId`, `charts.pie.colors`, `perDaySeries.series[].color`).
  - Client-side DAV fetch + recomputation: `src/App.vue` inside `load()` (look for `fetchDavColors` then recompute `pie.colors` and `perDaySeries` colors).
  - Chart components applying colors: `src/components/PieChart.vue`, `src/components/StackedBars.vue`.
- Mitigations (operational):
  - Ensure calendars have explicit colors set in Nextcloud Calendar so the server response contains final colors immediately.
  - Accept the brief update during development; it disappears once colors are stored and consistent server-side.

## Heatmap timezone uses server time (pending)
- Symptom: The 24×7 heatmap buckets may appear shifted relative to the user’s local time.
- Cause: Aggregation buckets currently use server time during bucketing.
- Fix approach: Convert event start/end to the user’s timezone (from Nextcloud user profile) before day/hour bucketing; keep bucketing arithmetic in that timezone to remain DST-safe.

