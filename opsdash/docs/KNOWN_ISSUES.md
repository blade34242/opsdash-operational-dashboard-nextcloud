# Known Issues

Last updated: 2025-10-28

- Stacked bars projection overlay crowding — **fixed in 0.4.3 (2025-11-03)**
  - Symptom (historical): Forecast overlays rendered directly atop the current-day actual bar, creating a “double width” impression.
  - Resolution: Overlay lanes now render as slimmer, dashed capsules with lower opacity (and offset alignment when actual data exists), keeping the underlying bar legible without disabling projections.
  - Notes: No workaround required; remain on firmware ≥0.4.3.

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

- Calendar color mapping regression — **fixed in 0.4.3 (2025-11-03)**
  - Symptom (historical): Imported or server-calculated calendar colours were replaced by deterministic fallbacks whenever DAV lookups failed, causing charts to ignore user palettes.
  - Resolution: The dashboard loader now preserves prior palette entries and only applies fallbacks when no authoritative colour is available; DAV refreshes merge without clobbering existing entries.
  - Notes: Vitest coverage in `test/useDashboard.test.ts` guards against regressions.
