# Changelog - Opsdash (internal)

This file is a short internal log. Full release notes live in the repo root `CHANGELOG.md`.

## Unreleased

## 0.5.5 - 2026-02-11
- Performance: `OverviewEventsCollector` now caches identical collect calls within one `/overview/load` request to reduce repeated calendar scans.
- Loading UX: widget overlays now apply only on initial paint; refresh keeps existing cards visible and shows `Updating...` in the toolbar.
- Notes load path: notes fetch is non-blocking after data hydrate, and stale responses are ignored on rapid range/offset changes.
- Cache consistency: core cache version is bumped after `/overview/persist` writes so saved config is reflected immediately on subsequent core loads.
- Widgets: dense mode now keeps chart padding stable so compact mode doesn't inflate charts.
- Widgets: new tabs start empty (no preset widgets) for a clean slate.
- Widgets: trend/history widgets now default to oldest -> newest sequence with a shared `reverseOrder` toggle for newest-first.
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
- E2E: dashboard spec is now focused on startup/config smoke coverage (deck-specific tab assertions removed to avoid env-specific skips/flakes).

## 0.5.5 (current line)
- Widget-driven dashboard with tabbed layouts.
- Profile save/load backed by `/overview/presets` endpoint.
- Targets + balance config sanitisation tightened server-side.

Older detail stays in git history to keep this doc compact.
