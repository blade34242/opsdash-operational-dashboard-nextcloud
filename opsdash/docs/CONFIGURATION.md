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
  - Per-category targets with weekend inclusion, category labels, colour overrides aligned with the Nextcloud palette, and automatic grouping (calendars take the group id of the selected category; users no longer edit group numbers)
  - Pacing thresholds, forecast padding, and display toggles
  - A global “All-day event hours” control (0–24 h) that defines how many hours a multi-day all-day event contributes per day; the value is shared across server aggregation and the dashboard UI.
  - Switching the range (Week⇄Month) recalculates the entire Targets stack on the fly: monthly totals are derived from their weekly definitions (×4) when no explicit monthly values exist, and the summary/forecast cards automatically swap to the selected range’s data.
- Sidebar open/closed state is persisted in `localStorage` so the dock reopens in the last used position.

## Theme Overrides
- Config & Setup → “Theme & appearance” lets users choose how Opsdash responds to Nextcloud’s theme.
  - `Follow Nextcloud` mirrors the host instance setting and updates automatically when the account theme changes.
  - `Force light` / `Force dark` apply an app-local override stored in `localStorage`; charts keep their calendar-derived colours, while cards/sidebar swap palettes immediately.
- Overrides are client-side today; capturing the preference in `/persist` remains on the roadmap (see `docs/LIGHT_DARK_THEMING.md`).

## Presets
- The “Presets” tab lets users capture the full sidebar configuration (selected calendars, group assignments, weekly/monthly targets, and advanced target settings) under a chosen name.
- Presets are stored per user in Nextcloud config and can be reloaded with a single click; applying a preset persists the new state via `/persist` and refreshes the dashboard.
- When older presets reference calendars or fields that no longer exist, the server sanitises the payload, reports the skipped entries as warnings, and applies the remaining configuration once the user confirms.
- API endpoints:
  - `GET /overview/presets` → list summaries.
  - `POST /overview/presets` → save/overwrite a preset.
  - `GET /overview/presets/{name}` → load (returns warnings + sanitised payload).
  - `DELETE /overview/presets/{name}` → remove.

## Card Settings (Sidebar ➜ Cards tab)
- **Activity & Schedule card** — show/hide: weekend share, evening share, earliest/late times, overlaps, longest session, last day off, and the category-mapping hint. A “Bar chart projection” selector controls how empty future days are visualised in the stacked charts (`Off`, distribute the remaining total target, respect per-calendar targets, or respect category targets).
  - The selected projection mode is stored in `targets_config.activityCard.forecastMode` and travels through `/persist`, presets, and the SPA state. When you add new toggles under `activityCard`, remember to update both the client normaliser and the backend cleaners so load/save stays symmetrical.
- **Balance Overview card** — configure share/index thresholds, relation display mode (ratio/factor), the trend lookback window (default 4 weeks, used by the “last day off” helper), optional insights/daily stacks/dayparts, whether to pin the current note to the Balance card, and precision for percentages/ratios.
