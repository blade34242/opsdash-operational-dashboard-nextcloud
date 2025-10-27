# Target Strategies Specification

This document describes the configurable target “profiles” that the onboarding 
workflow and Sidebar expose. Each strategy controls which target layers are 
active (total, category, calendar) and pre-populates sensible defaults.

## Goals
- Offer clear, opinionated starting points for different user needs.
- Reduce friction by hiding complexity that is not relevant to a chosen 
  strategy.
- Maintain compatibility with existing persistence (`targets_config`, 
  `targets_week`, `targets_month`, `groups`).

## Strategy Overview

| ID | Name | Target Layers | Ideal For |
| --- | --- | --- | --- |
| `total_only` | Focused | Total | Users who just need an overall time budget |
| `total_plus_categories` | Balanced | Total + Categories | Users juggling multiple life areas (work/life/study) |
| `full_granular` | Power | Total + Categories + Per-Calendar | Users who want granular control per calendar |

### Cross-cutting Behaviour
- All strategies respect week ↔ month conversion logic.
- All strategies share the global all-day event hour budget (default 8 h/day) so calendar aggregation and progress bars stay aligned; onboarding should surface the control when strategy editing touches the Targets pane.
- Users can change strategy later; switching should prompt confirmation and 
  optionally re-run onboarding to avoid unintended data loss.
- When downgrading (e.g., from `full_granular` to `total_only`), retain existing 
  per-calendar values but mark them inactive; a toggle in the Sidebar can show 
  “legacy” targets for reference.

## `total_only` (Focused)
- **Layers enabled:** 
  - Total target visible and editable.
  - Category section hidden; related charts disabled.
  - Per-calendar target inputs hidden; `ByCalendarTable` shows hours only.
- **Default values:**
  - Total weekly target: 40 h (localisable string).
  - Monthly target auto-calculated at ×4 (160 h).
  - Pace mode: `days_only`, weekend included.
- **UI Adjustments:**
  - Sidebar Targets tab simplifies to a single number input + presets.
  - Targets card shows only total progress (categories grid hidden).
  - Activity/balance hints removed unless user later upgrades.
- **Upgrade path:** Provide inline CTA: “Need separate goals? Enable categories.”

## `total_plus_categories` (Balanced)
- **Layers enabled:** Total + categories. Per-calendar targets remain off by 
  default but can be optionally enabled later.
- **Default categories:** 
  - Work — 32 h, weekdays only.
  - Personal — 8 h, weekend included.
  - Recovery — 4 h, weekend included.
  - These map to group IDs 1, 2, 3 to seed category assignments.
- **Interactions:**
  - Onboarding invites users to rename categories and adjust hours.
  - Calendar tab shows category dropdown but hides per-calendar target input 
    unless advanced toggle is selected.
  - Balance card remains available (using categories).
- **Upgrading to full:** Unlocks per-calendar target inputs and exposes advanced 
  pace controls.

## `full_granular` (Power)
- **Layers enabled:** All three (total, category, calendar).
- **Default setup:**
  - Mirrors current app defaults (Work/Hobby/Sport categories).
  - Per-calendar inputs shown and prefilled with derived targets (category 
    target ÷ number of assigned calendars).
- **Advanced options:**
  - Enables per-category pace overrides, weekend toggles, badges, and forecast 
    adjustments.
  - Shows By-Calendar target deltas and badges.
- **Safeguards:**
  - Warn if the sum of per-calendar targets deviates >10% from total target; 
    offer a button to reconcile automatically.

## Strategy Switching
- Implemented as part of `targetsConfig`:
  ```json
  {
    "ui": { "strategy": "total_only" },
    "enabledLayers": { "total": true, "categories": false, "calendars": false }
  }
  ```
- Switching strategy should:
  1. Show a confirmation dialog summarizing changes.
  2. Allow snapshotting current config (for possible undo).
  3. Recalculate derived fields (e.g., hide category charts when disabled).
  4. Emit analytics event (`strategy_changed`).
  5. Offer a checkbox “Save previous configuration” so users can keep a snapshot.

## Interaction with Onboarding
- Onboarding step uses this spec to render cards and defaults.
- `ONBOARDING_WORKFLOW.md` references these IDs for persistence.
- Provide helper utilities in code (`applyStrategyDefaults(strategyId)`).

## Validation Matrix
- Ensure toggling between strategies keeps persisted data consistent.
- Test with 0, 1, many calendars.
- Validate conversions for locales with 24h vs AM/PM formatting.
- Confirm accessibility (strategy cards focus order, screen reader labels).

## Follow-ups & Backlog
- **Custom strategies / templates:** Not planned for the first release. Keep in 
  the product backlog as a potential enhancement for power users who manage 
  multiple profiles.
- **Team targets integration:** Defer until team-facing features are defined; 
  add a note in `NEXT_STEPS.md` so product can revisit alignment.
- **In-app guidance:** Instead of separate per-strategy documentation pages, 
  the Sidebar should surface short tooltips/links to `docs/TARGETS_PLAN.md` for 
  deeper reading. Confirm copy once onboarding content is finalized.
