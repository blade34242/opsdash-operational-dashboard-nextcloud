# Changelog - Opsdash (internal)

This file is a short internal log. Full release notes live in the repo root `CHANGELOG.md`.

## Unreleased
- Onboarding: edit-current vs new-profile entry, quick category presets, mandatory assignments.
- Profiles: saved layouts include widget tabs, theme, Deck settings, and reporting config.
- Profiles UI moved into an onboarding-style overlay triggered from the sidebar icon.
- Widgets: hours-of-day legend labels clarified and range shown.
- Widgets: category mix trend tiles now use tone-aware gradients with light/dark contrast.
- Sidebar: guided steps include compact per-step hints (strategy/calendars/targets).
- Sidebar: keyboard shortcuts icon opens the same overlay as `?`, and the icon row is pinned to the bottom (no scroll).
- UI: onboarding panel adopts the rangebar-style frame.

## 0.5.x (current line)
- Widget-driven dashboard with tabbed layouts.
- Profile save/load backed by `/overview/presets` endpoint.
- Targets + balance config sanitisation tightened server-side.

Older detail stays in git history to keep this doc compact.
