# Known Issues

Last updated: 2025-12-14

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

- Light/dark theming support — **fixed (server-persisted + bootstrapped)**
  - Status: Theme preference is stored per user via `/overview/persist` and bootstrapped into the initial HTML so the SPA paints in the correct mode immediately. Calendar/chart colors remain calendar-driven.

- Info button icon sizing
  - Symptom: The small question mark hint button can appear offset from the section heading at certain sidebar widths, making the row look misaligned.
  - Cause: Icon font rendering and varying heading line-height compete inside the flex row.
  - Status: CSS tweak shipped in 0.4.3 keeps the icon within the row; we still plan to migrate to an SVG badge for consistent sizing during the next sidebar polish pass.

- Targets card bar spacing
  - Symptom: The horizontal progress bars in the Targets card can appear to “dip” into the next dashboard card when the viewport is narrow, making the first row look collapsed.
  - Cause: Fixed card gutters compress before the progress block gains breathing room; the bar container still uses static margins.
  - Status: Queued for the upcoming layout/theming overhaul—will add responsive spacing and max-height guards so bars never overlap adjacent cards.

- Calendar color mapping regression — **fixed in 0.4.3 (2025-11-03)**
  - Symptom (historical): Imported or server-calculated calendar colours were replaced by deterministic fallbacks whenever DAV lookups failed, causing charts to ignore user palettes.
  - Resolution: The dashboard loader now preserves prior palette entries and only applies fallbacks when no authoritative colour is available; DAV refreshes merge without clobbering existing entries.
  - Notes: Vitest coverage in `test/useDashboard.test.ts` guards against regressions.
