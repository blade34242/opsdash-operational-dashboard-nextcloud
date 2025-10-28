# Known Issues

Last updated: 2025-10-28

- Stacked bars projection overlays can look “double sized” on current day
  - Symptom: The forecast overlay is drawn on top of actual bars for future‑day projections, which can make today’s bar appear visually doubled or crowded.
  - Cause: The renderer stacks forecast segments per calendar using the same x‑slot as actual data and adds a per‑day total label. On “today”, mixed actual/forecast can feel heavy.
  - Status: Visual refinement pending. Options under evaluation: reduce overlay opacity/width, draw outlines only for forecast, or split lanes for forecast vs actual.
  - Workaround: Switch Activity → Forecast mode to “off” to disable projections.

- Calendar selection state not reflecting immediately in the sidebar
  - Symptom: Toggling a calendar may not update the “Selected/Hidden” badge right away.
  - Cause: Mixed types (numeric vs string) in selection IDs could block reactive comparisons in the UI, or persistence reload races could briefly reset the list.
  - Fix: Normalized selection IDs to strings on load; improved sidebar prop reactivity. Persist still triggers a quick reload; a brief flicker may occur.

- All‑day events distribution
  - Symptom: Some all‑day events span multiple days or render split due to timezone boundaries.
  - Status: Server marks `allday=true` and distributes using configurable `allDayHours`; more edge‑case validation is ongoing.

- Light/dark theming support
  - Symptom: Dashboard UI does not switch styles with the user’s Nextcloud theme; only the default light palette is maintained.
  - Cause: Dedicated theming tokens/CSS variables are not yet wired for the SPA bundle.
  - Status: Planned work (see `docs/LIGHT_DARK_THEMING.md` roadmap). Requires design token mapping + rebuild of chart palettes.

- Calendar color mapping regression
  - Symptom: Imported/calculated calendar colors no longer show consistently in charts or the By Calendar tables; fallback palette dominates instead of the configured per-calendar colors.
  - Cause: The DAV color normalisation step currently overwrites `colorsById` when no DAV color is returned, effectively discarding the backend-provided palette.
  - Status: Needs a regression fix. Revisit the merge logic so fallback colors apply only when a calendar lacks any color metadata, and add tests around `useDashboard` + `useCharts` color propagation.
