# Changelog - Opsdash (internal)

This file is a short internal log. Full release notes live in the repo root `CHANGELOG.md`.

## Unreleased
- Widgets: dense mode now keeps chart padding stable so compact mode doesn't inflate charts.
- Widgets: new tabs start empty (no preset widgets) for a clean slate.
- Notes widget: add “Use previous” quick-fill and show saving state in the button.
- Persistence: ignore stale save responses to prevent rapid edits from reverting.
- Widgets: chart filters now use a single category/calendar selector with one multiselect (defaults to all categories).
- UI: cards toolbar has extra top spacing so the border reads above the tabs.
- Onboarding: calendar assignments are optional and keep selection order stable.
- Onboarding: edit-current vs new-profile entry, quick category presets, mandatory assignments.
- Profiles: saved layouts include widget tabs, theme, Deck settings, and reporting config.
- Profiles UI moved into an onboarding-style overlay triggered from the sidebar icon.
- UI: widget cards now use a deeper 3D border/shadow treatment in light/dark themes.
- Balance Index: current value color matches the current status indicator.
- Calendar table: hover state matches category/calendar rows and remains readable in dark mode.
- Widgets: hours-of-day legend labels clarified and range shown.
- Widgets: category mix trend tiles now use tone-aware gradients with light/dark contrast.
- Sidebar: guided steps include compact per-step hints (strategy/calendars/targets).
- Sidebar: keyboard shortcuts icon opens the same overlay as `?`, and the icon row is pinned to the bottom (no scroll).
- UI: onboarding panel adopts the rangebar-style frame.
- Load flow: core-first/data-second requests to render layout before stats/charts.
- Boot: server passes default widget presets into the template to avoid a blank main area on hard reloads.
- Frontend: component tree grouped into feature folders (widgets/charts/tables/panels) and unused sidebar panes removed.

## 0.5.x (current line)
- Widget-driven dashboard with tabbed layouts.
- Profile save/load backed by `/overview/presets` endpoint.
- Targets + balance config sanitisation tightened server-side.

Older detail stays in git history to keep this doc compact.
