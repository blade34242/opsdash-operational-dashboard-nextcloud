# Changelog — Operational Dashboard (opsdash)

All notable changes to this project are documented here. This file is served locally for development.

## [0.4.3] - 2025-10-30 (NC 30–31 line)
- Refactor: split the sidebar into dedicated pane components (calendars, targets, summary, activity, balance, notes) to keep the parent shell lean.
- Refactor: extracted shared composables (`useCategories`, `useCharts`, `useSummaries`, `useBalance`) and a reusable validation helper so panes share mutations.
- Refactor: wrapped notes handling in `SidebarNotesPane` for parity with other panes.
- Tests: added Vitest coverage for charts and the new sidebar panes to lock down emitted events/validation.
- Docs: refreshed architecture and refactor plans to reflect the composable-driven structure; bumped default prompts and testing docs.
- Localisation: routed server/SPA strings through Nextcloud l10n helpers; translation files cover all current UI copy (en,de).
- Fix: restored all-day event detection when using the structured calendar query, matching ICS behaviour, and introduced a configurable “all-day hours per day” target setting that feeds both aggregation and the dashboard UI.
- UI: Added a “Presets” tab to the sidebar to save/load entire configurations (calendars, groups, targets) by name; includes server-side validation with warnings for missing calendars.
- Fix: Week/Month toggle now swaps the entire targets stack (summary card, categories, charts) to month metrics, converting weekly definitions on the fly when no explicit monthly targets are stored.
- UI: Stacked bar charts now layer forecasted hours for future days with a slim, dashed overlay instead of a full-width tint; projection behaviour is configurable (“Bar chart projection” in the Activity & Schedule tab).
- Targets: Introduced `activityCard.forecastMode` (`off` | `total` | `calendar` | `category`) so chart forecasts can respect remaining total hours, per-calendar goals, or per-category targets.
- Tests: Added Vitest coverage for the chart projection logic to ensure each mode distributes hours as expected.
- Docs: Configuration and API references updated with the new projection control and payload field.
- Refactor: Lifted dashboard shell helpers into composables (`useDashboardSelection`, `useDashboardPersistence`, `useDashboardPresets`, `useOcHttp`, `useAppMeta`, `useChartScheduler`, `useCalendarLinks`) so `App.vue` now only orchestrates state and rendering; added dedicated Vitest coverage for the new modules.
- Feat: Added an onboarding wizard with strategy presets, calendar selection, and persisted onboarding state (re-run from Targets tab) so new users can bootstrap the dashboard confidently.
- Fix: Align calendar colour palette with the Nextcloud Calendar app by preferring display colours when available, preserving server-provided values, and matching the fallback generator (plus Vitest/PHPUnit coverage to catch regressions).

## [0.4.2] - 2025-10-12 (NC 30–31 line)
- UI: Sidebar dock with persistent open/close state; main content spans full width when collapsed.
- UI: Sidebar calendars/targets split into tabs; each pane scrolls independently.
- Targets: configurable categories (add/remove/rename), per-category pacing/forecast options, and category assignment for calendars.
- Sidebar: new Cards tab to toggle Activity & Schedule metrics and Balance thresholds/insights.
- Targets: client summary now computes totals from aggregated `byCal` data to keep the cards in sync with tables.
- Targets: fixed `computePaceInfo` to read `opts.dailyHours`, preventing “[opsdash] targets summary failed” and zero-value cards.
- Docs: refreshed README, Architecture, Configuration, Dev Workflow notes; clarified manifest-based bundle handling.

## [0.4.1] - 2025-10-04 (NC 30–31 line)
- Rename finalized: app id `opsdash`, display name “Operational Dashboard”
- Routing: unified canonical endpoints under `/apps/opsdash/overview/*`; navigation points to index
- Bootstrap: removed legacy `appinfo/app.php` (IBootstrap warning fixed); nav added in `Application::boot()`
- Icons: ensured `img/app.svg` and `img/app-dark.svg` are used consistently; removed duplicate root `app.svg`; favicon resolution fixed
- Layout: full-width cards/tabs/tables; empty state remains full-height and scrollable; defensive NC shell width overrides
- Build: added local `tsconfig.json`; verified Vite manifest and bundle naming; updated scripts
- Docs: updated README and operations/dev workflow; seeding docs updated to opsdash routes
- Tools: multi-calendar seeding verified for monthly spread across 10 calendars (TOTAL=250)

## [0.4.0] - 2025-09-30 (NC 31 line)
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
- Rename: app id to `opsdash`, display name `OpsDash`, primary route `/dashboard` (NC 31 line).

## [0.5.0] - Planned (NC 32 line)
- Compatibility window: NC 32 (later extend to 33 after test).

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
