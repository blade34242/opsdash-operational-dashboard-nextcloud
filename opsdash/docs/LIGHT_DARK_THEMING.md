# Light & Dark Theming Specification

This document outlines UX, design, and technical requirements for supporting a 
first-class light/dark experience across Opsdash.

## Goals
- Deliver visually consistent, accessible light and dark themes.
- Respect user/system preferences by default, with an app-level override.
- Ensure onboarding, targets, and dashboard screens read clearly in both modes.
- Avoid duplicated style definitions by relying on CSS variables (design tokens).

## Scope
- Vue SPA (Sidebar, cards, tables, charts, onboarding wizard).
- Static assets (icons, illustrations) used within the app.
- Email notifications and external documentation are out of scope for v1.

## Design Principles
- Use the same spacing and layout; only color, shadows, and subtle borders shift.
- Maintain AA contrast minimum (WCAG 2.1) for text and critical UI controls.
- Avoid pure black (#000); prefer near-black (#0b1120) to reduce eye strain.
- Employ elevation cues (shadows, border alphas) consistently between themes.

## Implementation Overview
1. **Design Tokens**
   - Define base tokens in `css/variables.css`:
     - `--bg`, `--bg-muted`, `--fg`, `--muted`, `--line`, `--brand`, `--pos`, 
       `--neg`, `--warning`, `--surface`, `--shadow`.
   - Proposed palette (can iterate with design):
     - Light: `--bg: #FFFFFF`, `--fg: #111827`, `--brand: #1F74F2`, `--line: #E5E7EB`.
     - Dark: `--bg: #0B1120`, `--fg: #E5E7EB`, `--brand: #4C8DFF`, `--line: #1F2937`.
     - Success/Warning: `--pos: #10B981`, `--warning: #F97316`, `--neg: #EF4444`.
   - Introduce semantic tokens for charts (e.g., `--chart-palette-1..6`).
   - Provide both light and dark values using `[data-theme="dark"]`.
2. **Theme Detection**
   - Respect Nextcloud theme attributes first (`document.documentElement` /
     `document.body` `data-theme`, `theme--dark` class) and the global event
     `oc:theme:changed`.
   - When present, honour user preference exposed via `window.OC.Theme` /
     `window.OC.config['theme-default']` (mirrors the “Appearance” setting in 
     the Nextcloud profile).
   - Fallback to `prefers-color-scheme` when Nextcloud provides no explicit
     theme.
   - Store optional app-level override in `localStorage` (`opsdashTheme`) and 
     persist via `/persist` only after onboarding completes.
   - Expose toggle in Sidebar → Summary (`Auto / Light / Dark`). “Auto” mirrors 
     Nextcloud/user preference; manual picks override locally and update the 
     left sidebar state immediately.
3. **Incremental Roll-out**
   - Phase 1 (post-onboarding milestone): apply tokens to main dashboard shell 
     (`App.vue` pane, cards, sidebar header). Use this to validate palette and
     override logic.
   - Phase 2: extend to all sidebar tabs, tables, notes editor, charts.
   - Phase 3: adopt within onboarding wizard and any future standalone views.
4. **Component Updates**
   - Replace hard-coded colors with tokens (audit `css/` and SFC `<style>` 
     blocks).
   - Charts must preserve calendar-derived palette values (e.g., per-calendar
     colors in pie/bar visualizations) across themes; only supporting UI chrome
     (axes labels, backgrounds, legends) should react to light/dark tokens.
   - Ensure chart libraries (Chart.js / Apex) consume token values for text and 
     backgrounds via CSS custom properties or re-render on theme change, without 
     mutating data colors.
   - Update shadows/borders to rely on tokens instead of static RGBA values.
5. **Onboarding Wizard**
   - Wizard ships after the onboarding flow is finalized; until then it may use
     light defaults.
   - When theming work starts, background overlays adapt to theme, and we reuse
     global tokens to avoid special casing.
   - Illustrations supplied in dual versions or use theme-aware SVG fills.
   - Transition animations should not flash white between modes.
6. **Persistence & Sync**
   - `/persist` payload gains optional `themePreference` storing `auto | light | 
     dark`. Default to `auto` until onboarding writes the record.
   - Switching theme updates document attribute (`document.documentElement.dataset.theme`)
     and fires a custom `opsdash:theme:changed` event so charts/modules can react.
   - **Status 2025-11:** Initial rollout stores the override in `localStorage` and exposes the toggle in Config & Setup; persistence via `/persist` remains a follow-up task.

## Accessibility & QA
- Contrast testing for primary text, secondary text, link states, badges, 
  status chips, progress bars.
- Screen readers should announce theme toggle state (“Theme: Auto, button”).
- Focus rings must remain visible in both themes (e.g., `outline: 2px solid 
  var(--brand)` with appropriate contrast).
- Test charts for legibility (line colors vs background, gridlines).
- Validate across browsers (Chromium, Firefox, Safari), including high-contrast 
  mode on Windows.

## Asset Requirements
- App icon variants (SVG/PNG) for dark backgrounds.
- Optional background textures or gradients should have light/dark versions or 
  be theme-neutral.
- Illustrations used in onboarding/empty states need adaptive color palettes.

## Performance Considerations
- Theme switch should not require full reload; reflow via CSS variables only.
- Avoid inlining duplicate style blocks; use `@media (prefers-color-scheme)` 
  fallback for browsers lacking custom properties support (progressive enhancement).

## Integration with Other Specs
- Onboarding wizard must highlight the active theme, especially when previewing 
  strategy cards (see `ONBOARDING_WORKFLOW.md`).
- Targets cards should inherit palette tokens; strategy defaults should ensure 
  category colors remain distinguishable in dark mode (see `TARGET_STRATEGIES.md`).

## Decisions (2025-03)
- Keep the mobile wrapper theme API as a backlog item; revisit once the web experience lands.
- Defer per-user chart palettes until after the shared validator and onboarding work, capturing the request in the product backlog.
- Ship without theme transition animations for now to avoid bundle and QA overhead; leave room for a future enhancement if feedback demands it.

## Next Steps
- Finalize token palette with design.
- Update global CSS vars and audit components.
- Implement theme preference toggle + persistence.
- Run accessibility pass and gather beta feedback.
- Start Phase 1 only after the onboarding wizard (see `ONBOARDING_WORKFLOW.md`)
  is merged and stable to avoid conflicting UX changes.
