# Known Issues

## Brief color flip in charts on first load
- Symptom: Pie and stacked bar colors briefly show default/fallback hues, then update to the final calendar colors a moment later.
- Cause: Colors resolve in two phases.
  - Backend sends initial colors with the first `load` response (from available calendar metadata or a deterministic fallback).
  - Client then performs a CalDAV PROPFIND to retrieve each calendar’s `calendar-color` for users/calendars where the server did not provide a color. When these arrive, the client recomputes chart colors and redraws, producing a short visual color change.
- Code references:
  - Initial colors and chart data: `lib/Controller/OverviewController.php` (keys: `colors.byId`, `charts.pie.colors`, `perDaySeries.series[].color`).
  - Client-side DAV fetch + recomputation: `src/App.vue` inside `load()` (look for `fetchDavColors` then recompute `pie.colors` and `perDaySeries` colors).
  - Chart components applying colors: `src/components/PieChart.vue`, `src/components/StackedBars.vue`.
- Mitigations (operational):
  - Ensure calendars have explicit colors set in Nextcloud Calendar so the server response contains final colors immediately.
  - Accept the brief update during development; it disappears once colors are stored and consistent server-side.

## Heatmap timezone uses server time (pending)
- Symptom: The 24×7 heatmap buckets may appear shifted relative to the user’s local time.
- Cause: Aggregation buckets currently use server time during bucketing.
- Fix approach: Convert event start/end to the user’s timezone (from Nextcloud user profile) before day/hour bucketing; keep bucketing arithmetic in that timezone to remain DST-safe.

## Activity & Schedule card shows future “last day off”
- Symptom: In the Activity & Schedule card (especially Week range), the “Last day off” and “Last half day” lines sometimes display dates that lie in the future (e.g., “Sun, Oct 19” even when today is earlier). The upstream stats payload reports the next scheduled time off rather than the most recently completed period.
- Impact: Users misread the KPI, believing the dashboard has logged a future day off as already taken, which reduces trust in the summary.
- Expected behaviour: These fields should show the most recent fully elapsed day/half-day off — i.e., the last date strictly before “today” with zero (or below threshold) logged hours. Future days should appear in planning widgets, not in the “last” metrics.
- Follow-up: Needs adjustment in the stats computation before display; document kept here until the bug is scheduled for a fix.

## Targets card progress bar overflow
- Symptom: In the Targets card category blocks, the progress bar fill can extend beyond the intended track (e.g., >10% past the rounded corners) when percent exceeds 100% or when layout recalculates after data refresh.
- Impact: Visual glitch makes the card look misaligned (“bleeding” into neighbouring elements), especially noticeable when the total range is exceeded.
- Expected behaviour: The bar should clamp to the track width (100%) while still indicating completion status via badge/status text.
- Notes: Likely caused by missing clamp or CSS overflow handling in `TimeTargetsCard.vue`. Needs front-end fix; tracked here until implemented.

## Weekly/monthly target sync mismatch
- Symptom: Switching between Week and Month ranges sometimes shows stale targets — values don’t reflect the conversions or latest per-calendar edits (e.g., week edits not propagating to month view immediately).
- Impact: Users see conflicting numbers, making target management unreliable.
- Expected behaviour: After toggling the range, the sidebar inputs and cards should show the corresponding target set (`targetsWeek` vs `targetsMonth`) including any auto conversions made during edits.
- Notes: Investigate reactive updates in `targetsWeek`, `targetsMonth`, and the computed `currentTargets`. Possibly requires forcing a recompute or ensuring persisted values load correctly after `queueSave`.

## Balance overview wording unclear
- Symptom: The Balance Overview card’s metrics (e.g., index value, “suggested action” warnings) are hard to interpret. Labels do not explain how the score is derived or what the warnings mean.
- Impact: Users cannot confidently act on balanced/unbalanced suggestions; the widget feels opaque.
- Expected behaviour: Provide concise copy that explains the balance index scale, what “notice” vs “warning” entail, and concrete suggestions tied to categories.
- Next steps: Revisit copy/UX when refining onboarding + theming. Consider inline tooltips, color-coded legend, and documentation pointers to clarify the balance model.

## Redundant “Week” label in top cards
- Symptom: Several top cards (e.g., Activity & Schedule, Targets) include the range label “(Week)” even though the active range is already visible elsewhere (range toggle, date span). This repetition clutters the header.
- Impact: UI looks noisy and inconsistent; when switching to month view, the label doesn’t always update, adding to confusion.
- Expected behaviour: Card titles should focus on the metric (“Activity & Schedule”), relying on the global range indicator to communicate Week/Month state.
- Next steps: Remove the range suffix from card titles during the planned top-card polish pass; ensure the global range indicator remains prominent.

## Endpoint naming inconsistency (`overview`)
- Symptom: Routes live under `/apps/opsdash/overview/...`, exposing the old “overview” label, which no longer reflects the product naming.
- Impact: API consumers and docs see an outdated endpoint; hard to remember and not user-friendly.
- Expected behaviour: Consolidate endpoints under a cleaner URI (e.g., `/apps/opsdash/overview/...` or `/apps/opsdash/api/...`), replacing the old path entirely (no redirects) so we avoid naming collisions with the Nextcloud Dashboard feature.
- Notes: Documented so we plan a rename (server routes + JS references). Should be paired with API doc updates and changelog entry.
