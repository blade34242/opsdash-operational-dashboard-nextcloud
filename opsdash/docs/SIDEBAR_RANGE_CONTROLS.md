# Sidebar Range Controls Specification

## Context
When the left sidebar is collapsed, users lose access to the range controls
(`Previous`, `Next`, Week/Month toggle). We need lightweight navigation so they
can continue browsing periods without reopening the sidebar.

## Goals
- Preserve quick access to offset and range selection in collapsed mode.
- Avoid duplicating full sidebar UI; keep controls compact and discoverable.
- Maintain keyboard accessibility and consistent status indication.

## Proposal
1. **Collapsed Toolbar**
   - Place a floating toolbar above the main content (top-right corner).
   - Include three buttons: `◀ Week`, `Week / Month toggle`, `Week ▶`.
   - Buttons adopt the same hotkeys as the sidebar controls.
   - Tooltip describes action (“Previous week”, “Switch to month view”).
   - Toolbar appears only when sidebar is collapsed or on smaller breakpoints.

2. **Range Indicator**
   - Show active range label next to the toggle (e.g., `Week 2025-01-06 – 2025-01-12`).
   - Update label reactively when offset/range changes.

3. **Animation & Persistence**
   - Use a subtle slide-in animation when the sidebar collapses.
   - Toolbar hides automatically when sidebar expands.
   - State persists (`localStorage`) so the toolbar visibility matches user preference.

## Accessibility
- Buttons have `aria-label`s.
- Keyboard shortcuts remain (`Alt+← / Alt+→ / Alt+Shift+R`).
- Focus order: toolbar → main content.

## Dependencies
- Requires `App.vue` to expose `range`, `offset`, and `load` handlers globally.
- Styling aligns with the light/dark theming tokens (`docs/LIGHT_DARK_THEMING.md`).

## Open Questions
- Should we support custom ranges (e.g., day) in the same toolbar?
- Do we offer quick jump to “Today”?
- Should toolbar be draggable or fixed?
