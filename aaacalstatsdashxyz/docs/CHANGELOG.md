# Changelog — Calendar Dashboard (aaacalstatsdashxyz)

All notable changes to this project are documented here. This file is served locally for development.

## [0.4.0] - 2025-09-30
- Targets: per‑calendar targets (hours) for week and month; edit in sidebar; auto‑convert week⇄month (×4/÷4); persisted per user
- By Calendar: added Target, Δ, and % columns (per current range)
- Sidebar: redesigned calendar entries as cards with labeled Group and Target inputs
- Charts: bar segment labels and column totals; pie labels include percentages
- Timezone: heatmap, per-day stacks, and DOW now bucket in the user’s timezone (DST-safe). Event count remains on the start day.
- UI: Events card reformatted (Active Days, Typical, Weekend, Evening)
- CSP: removed inline styles from template fallback; uses CSS classes
- Footer: version + changelog link (package.json aligned)
- Assets: controller uses Vite manifest to resolve JS entry (no hard-coded filename)
- Docs: Dev workflow, Known issues, Operations updated; local changelog

## [0.3.1] - 2025-09-30
- UI: App icon next to header title
- UI: Load button restored above Week/Month radios
- UI: Stats card shows workday/weekend avg & median; weekend share (%)
- Footer: Version and Changelog link
- Tools: Seeding scripts for week/month across 10 calendars (CalDAV)
- Docs: Added SEEDING.md with usage examples

## [0.2.0] - 2025-08-28
- Initial public dev build with week/month stats, charts and notes

---

Unreleased work and internal experiments are tracked in docs/NEXT_STEPS.md.
