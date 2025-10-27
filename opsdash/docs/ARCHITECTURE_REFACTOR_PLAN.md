# Architecture Refactor Plan

## Goal
Reduce complexity by splitting oversized components/services and introducing
shared utilities so the codebase becomes easier to maintain, test, and extend.

## Current Pain Points
- `src/App.vue` (~1.1k lines) mixes data fetching, state management, analytics,
  chart orchestration, and layout. Hard to test/understand.
- `src/components/Sidebar.vue` (~900 lines) bundles calendar selection, targets
  configuration, balance/activity settings, validation, and persistence hooks.
- `src/services/targets.ts` (~650 lines) covers defaults, normalization, progress
  math, forecast logic, and helper utilities in one file.
- `lib/Controller/OverviewController.php` (~1.6k lines) handles routing,
  persistence, sanitisation, DAV color fallback, and config normalization.
- Theme/branding hooks (e.g. favicon + theme detection) live inside `src/main.ts`.
- Inputs clamp values ad-hoc; no shared validation or user feedback pattern.
- Limited tests around target calculations and sidebar logic.

## Proposed Steps
1. **Introduce Composables**
   - Extract data loading, persistence, and derived metrics into dedicated
     composables (`useLoad`, `useTargets`, `useCharts`, `useNotes`).
   - Status (2025-11): `useDashboard`, `useCategories`, `useCharts`, `useSummaries`, and `useBalance` now concentrate the dashboard data flow and derived metrics. `useDashboardPersistence` handles the save queue, `useDashboardSelection` wraps calendar/target mutation helpers, `useDashboardPresets` owns profile CRUD, and `useChartScheduler` centralises resize scheduling — leaving `App.vue` as an orchestration shell.
   - Next slice: migrate the remaining shell helpers (`route`/HTTP utilities, icon/meta boot) into dedicated modules so the root stays declarative.
   - Keep `App.vue` as a thin presentation shell.

2. **Sidebar Decomposition**
   - Status (2025-10): Completed. Sidebar delegates to pane components (`SidebarCalendarsPane`, `SidebarTargetsPane`, `SidebarSummaryPane`, `SidebarActivityPane`, `SidebarBalancePane`, `SidebarNotesPane`) with shared validation helpers.

3. **Targets Service Modules**
   - Break `targets.ts` into `targets/config`, `targets/progress`, `targets/forecast`.
   - Ensure each module has unit tests.

4. **Server Layer Reorganisation**
   - Create services (e.g. `CalendarService`, `TargetsService`, `NotesService`)
     and move logic out of `OverviewController`. Keep controller focused
     on routing + responses per Nextcloud best practices.

5. **Validation & Feedback**
   - Implement `docs/INPUT_VALIDATION_PLAN.md`: shared validators, inline
     messages, structured server errors.
   - Status (2025-10): Shared numeric validation helper (`sidebar/validation.ts`) removes ad-hoc clamps across panes; UI messages bubble through a common flow.

6. **Theme Bootloader**
   - Move theme + favicon observers from `src/main.ts` into a dedicated module
     (`services/theme.ts`), invoked during boot.

7. **Testing**
   - Add Vitest coverage for composables/services.
   - Add integration tests for new services and controller entry points.
   - Status (2025-10): Added unit tests for sidebar panes and chart overrides; expand to server services next.

8. **Documentation**
   - Update `docs/ARCHITECTURE.md` once refactors land.
   - Keep `docs/NEXT_STEPS.md` aligned with progress.

## Dependencies & Sequencing
- Perform refactor in stages to avoid massive PRs.
- Coordinate with onboarding/theming work so shared modules are ready.
- Ensure no regression in Nextcloud app lifecycle (enable/disable) during splits.

## Risks
- Large refactor touches many files; plan incremental PRs.
- Need robust regression testing before deploy.

## Success Criteria
- Thinner components (<300 lines) with focused responsibilities.
- Reusable composables/helpers for data and validation.
- Controller slimmed down with service classes.
- Improved test coverage metrics.
