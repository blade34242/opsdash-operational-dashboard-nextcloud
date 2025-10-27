# Targets Enhancements Plan

This document outlines iterative improvements to the Targets feature to make progress clearer and more actionable.

Goals
- Communicate target status at a glance (percent, remaining, pace).
- Help users reason about feasibility (projection, days left).
- Support both weekly and monthly targets with transparent conversions.
- Keep UI compact and readable on small screens.

## Implemented (2025‑10)
- Targets card shows percent, status chip, remaining/over delta, pace gap, and forecast range.
- Days-left and need-per-day metrics surface per target and per category.
- Weekly↔monthly conversions handled automatically in the sidebar with clear labels.
- Targets card consumes the same aggregated data as the tables, avoiding drift.
- All-day events respect a configurable “hours per day” slider in the Targets sidebar; server aggregation uses the same value to apportion multi-day all-day events without double-counting.
- Range switching keeps the Targets card, category blocks, and stack charts in sync: month view loads stored monthly targets (or converts weekly → monthly on the fly) so KPIs immediately reflect the selected period.

## Next Iterations

### Phase 2 — Deeper insights
- Per-calendar and per-group deltas (if a target is defined).
- Highlight top deficit/excess contributors (e.g., “Largest deficit: Ops −4.5 h”).
- Optional chart overlays for progress vs. target.

### Phase 3 — Configuration UX
- Allow custom status thresholds (On-track ≥ X %, At-risk ≥ Y %).
- Adjustable week↔month conversion factor (default 4.0, allow decimal).
- Toggle advanced lines (projection, pace) from the sidebar Targets tab.
- Persist user preferences for thresholds/toggles via `/persist`.

### Phase 4 — Backend Enhancements
- Return period metadata (`daysElapsed`, `daysRemaining`, `eligibleDays`) with `load()` to reduce duplicated date math.
- Cache derived target summaries server-side for large tenant ranges.

## Testing Matrix
- Empty targets: display “No target set” CTA, no divide-by-zero.
- Extreme values: very small (≤ 0.25 h) and large (≥ 1000 h) targets, ensure formatting.
- Range switches: week ↔ month conversions preserve entered values (×4 ÷4).
- DST transitions, leap years, and negative offsets.

## Rollout Checklist
1. Feature toggle & migration (if new fields).
2. Update API docs (`docs/API.md` targets section).
3. Extend unit tests/Vitest coverage for new calculations.
4. Update CHANGELOG and Troubleshooting for user-facing changes.
