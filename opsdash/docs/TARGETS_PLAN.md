# Targets Enhancements Plan

This document outlines iterative improvements to the Targets feature to make progress clearer and more actionable.

Goals
- Communicate target status at a glance (percent, remaining, pace).
- Help users reason about feasibility (projection, days left).
- Support both weekly and monthly targets with transparent conversions.
- Keep UI compact and readable on small screens.

UI Additions (A/B toggleable via flags)
- Percent + Status: show “X% of target” and a short label (On track / Behind / Exceeded) based on thresholds.
- Remaining/Over: “Remaining: NNh” or “Over by: NNh” (signaled by color).
- Pace Needed: “Needed pace: Hh/day to hit target” calculated from remaining days in period.
- Projection: “Projected: Hh by period end” extrapolated from current avg/day.
- Days Left: “Days left: N” contextualizes pace.
- Progress Bar: thin bar with overflow marker; colored by status thresholds.
- Source Hint: “Target basis: weekly (×4)” or “monthly (÷4)” next to the label.

Per‑Calendar/Group (Phase 2)
- Per‑calendar delta vs target (if defined) and per-group aggregate status.
- Top contributor/deficit summary (e.g., “Top deficit: Team Ops −4.5h”).

Configuration
- Thresholds (On track ≥ X%, Behind < X%, Exceeded > 100%).
- Weekly↔Monthly conversion factor (default 4) for custom cadence.
- Show/hide advanced lines (projection, pace) via settings.

Backend Changes (minimal)
- Include period metadata in `load` (days elapsed/remaining) to avoid client date math drift.
- Optional: persist user settings for thresholds/visibility.

Testing
- Empty targets (0): ensure UX shows “No target set” with CTA to set target.
- Very small/large targets: formatting clamps and bar overflow.
- Week/month boundaries, DST changes, leap years.

Rollout
- Phase 1 (UI only): percent, remaining/over, days left, progress bar.
- Phase 2: pace + projection; per‑group/ per‑calendar deltas.
- Phase 3: settings UI + server persistence for preferences.

