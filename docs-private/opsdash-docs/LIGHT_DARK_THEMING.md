# Light/Dark Theming

## Current Behavior
- Theme preference is persisted server-side via `/overview/persist`.
- The SPA bootstraps the preference before `/overview/load` completes.
- CSS tokens are used for base colors; calendar colors remain data-driven.

## Developer Notes
- Prefer CSS variables over hard-coded colors.
- Keep UI chrome theme-aware; chart data colors should not change.
