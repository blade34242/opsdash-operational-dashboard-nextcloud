# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Changed
- Bump app version to `0.5.6` for the next development cycle.

## [0.5.5] - 2026-02-11
### Added
- Balance overview now surfaces a compact Balance index badge in the card header.
- Sidebar navigation is explicitly registered so Opsdash appears in Nextcloud’s app menu (and NC max version extended to 32).
- Deck cards widget auto-detects label tags as filters, shows counts, and lets users hide tag filters per widget.
- Deck cards widget adds a compact list toggle for denser card rows without losing metadata.
- Pie chart highlights slices on legend hover and direct slice hover.
- Pie chart scale is slightly reduced for a tighter visual footprint.
- Stacked chart widgets scale is slightly reduced for a tighter visual footprint.
- Stacked chart widgets highlight series on legend hover and direct bar hover.
- Stacked chart widgets now label each stack segment and show per-column totals with leader labels for small segments.
- Day-of-week and hours-of-day charts now fold in the configured lookback window for history context.
- Lookback charts now color weeks consistently in Per-day/Day-of-week, and Hours-of-day adds stacked/overlay lookback modes with a legend.
- Profiles management is now available in an onboarding-style overlay triggered from the sidebar icon.
- Cards toolbar now shows an `Updating...` refresh indicator during background data reloads.
- Backend load path now reuses identical event collect calls within a single request (request-local collector cache).

### Changed
- Sidebar layout: setup wizard block copy/numbered steps, framed sections, larger refresh button, and keyboard shortcuts moved to the bottom.
- Sidebar scrolling now uses the outer navigation container (single scrollbar) with left-side scroll positioning.
- Sidebar open/close state now persists locally (defaults to open if storage is missing or invalid).
- Widget layout editing keeps the active tab selected after widget changes.
- New dashboard tabs start empty instead of copying preset widgets.
- Widget cards now share the Balance Index-style border treatment (including Deck cards).
- Widget cards now use a deeper 3D border/shadow treatment for more depth in light/dark themes.
- Cards toolbar now has top spacing so the border reads cleanly above the tabs/edit layout button.
- Chart widgets now use a unified filter selector (category/calendar) with a single multiselect defaulting to all categories.
- Notes editor widget adds a quick "Use previous" fill action and clearer saving state.
- Onboarding assignments are optional and preserve the selection order for calendars.
- Day-off trend widget uses the global range unit (week/month) and defaults color pickers to red/green tones.
- Day-off trend widget adds Balance Index-style trend label options (date range, week/month, offset).
- Sidebar guided steps now include compact per-step hints (strategy, calendars, targets, etc.) instead of a separate summary block.
- Sidebar bottom icons now open the same keyboard shortcuts overlay as `?`, with updated iconography and sizing.
- Sidebar navigation is now full-height (no internal scroll), keeping the bottom icon row pinned.
- Category mix trend tiles use tone-aware gradients and contrast in light/dark themes.
- Dashboard load uses core-first/data-second requests so layout renders before stats/charts.
- Template bootstraps default widget presets to avoid a blank main area on hard reloads.
- Frontend component tree regrouped into feature folders (widgets/charts/tables/panels), with unused sidebar panes removed.
- Trend/history widgets now use a consistent default sequence of oldest -> newest (left to right), with a shared `reverseOrder` widget option to flip to newest-first.
- Widget loading overlays are now limited to first paint; refresh keeps existing widget content visible.
- Notes fetching now runs non-blocking after main data payload application.
- E2E coverage was simplified to stable dashboard-start flows; deck-tab specific assertions were removed from `dashboard.spec.ts` to reduce env-dependent skips/flakes.
- Dashboard E2E selectors were aligned with the current UI (sidebar onboarding trigger + profiles overlay), keeping tests focused on startup/config smoke paths.

### Fixed
- Dense widget mode no longer inflates chart padding; compact mode keeps charts tight.
- Rapid widget edits no longer revert due to out-of-order persist responses.
- Balance Index current value now uses the same status color as the current indicator.
- Calendar table hover now matches category/calendar rows and stays readable in dark mode.
- Stale notes responses are ignored so quick range/offset switches cannot overwrite newer note state.
- Core cache version is bumped after persist writes so updated config is reflected on the next core load.

### Added
- Onboarding wizard “Dashboard preset” step (Quick / Standard / Pro) that applies a preset widget layout and stores the chosen dashboard mode.
- Dashboard layout tabs (add/rename/remove/set default) with per-tab widget lists.
- Deck cards widget overhaul: per-widget board/filter selection, auto-scroll/count options, reset-to-preset action in the widget toolbar.
- Day-off trend and Category mix trend widgets now expose Low/High color pickers; colors blend and apply to tiles with contrast-aware text.
- Backend refactor: extracted `/overview/persist` and `/overview/notes` into dedicated controllers (URLs unchanged).
- Frontend refactor: split `DashboardLayout` into grid/toolbar/add-menu/advanced-overlay components.

### Changed
- Backend refactor: `OverviewController` focuses on `/overview/load` (+ index/ping); config reads consolidated in `UserConfigService`.
- Frontend perf: widget components are now lazy-loaded via `defineAsyncComponent()` from per-widget registry files (enables future code-splitting/tree-shaking).
- Sidebar hides Profiles/Report tabs when the Quick dashboard preset is active; default widgets now come from the Standard preset.
- Widget toolbar includes “Reset preset” to restore the current dashboard mode’s layout.
- Widget layouts now persist as a tabbed payload (`{ tabs, defaultTabId }`), with legacy arrays normalized into a single tab.
- Layout toolbar is left-aligned and tab visuals are more pronounced for quick scanning (dark theme contrast improved).

## [0.4.7] - Unreleased
### Added
- Targets card and By Calendar progress bars now show today's hours as an overlay in the same series color, including the over-100% portion.
- Dashboard cards render through a widget registry and grid layout (`DashboardLayout`) so we can introduce an editor mode later.
### Changed
- Bump version to 0.4.7 and update fixtures/export metadata.

## [0.4.6] - Unreleased
### Added
- Keyboard shortcuts overlay + `useKeyboardShortcuts` composable: Alt+←/→ navigation, Alt+N notes pane, Alt+T Config & Setup, Ctrl/⌘+S note save, and `?` cheat sheet.
- QA month + notes fixtures (`load-month-qa.json`, `notes-month-qa.json`) wired into Vitest + PHPUnit to keep `/overview/load` + `/overview/notes` schema coverage in sync.
- Localization helpers: `npm run i18n:scan` highlights untranslated strings and `npm run i18n:extract` wraps `occ translations:create-app` for template generation.
- Telemetry hook via `trackTelemetry('shortcuts_opened')` so overlay usage is observable.
- Vitest coverage for `DeckCardsPanel` (filters, loading/error/empty states) and `TimeSummaryCard` to lock UI copy/metrics before Playwright runs.
- Deck preview: `src/services/deck.ts` normalises Deck API payloads, `composables/useDeckCards.ts` wires them into the SPA, and App.vue now exposes a Deck tab powered by `DeckCardsPanel.vue`.
- QA Deck seed script `apps/opsdash/tools/seed_deck_boards.php` (plus Vitest fixtures/tests) ensures CI and Playwright runs have deterministic Deck boards/cards.
- Deck tab now caches responses per range, surfaces explicit error states, and links out to the Deck app for deeper triage.
- Playwright e2e suite now exercises the Deck tab to confirm the seeded QA cards render end-to-end.
- Deck tab adds an “All cards / My cards” filter driven by assignees so individual workload snapshots stay focused.
- Sidebar gains a “Report” tab to configure weekly/monthly digests, interim reminders, and Deck visibility/filter defaults (persisted per user).
- Balance Overview mix rows now render as a heatmap grid that color-codes week/month deltas while keeping the exact share percentage inside every tile.
- Activity & Schedule card’s “Days off” comparison has been redesigned as a mini heatmap with tone-aware tiles so the current range vs. lookback window is readable at a glance.

### Changed
- Dashboard persistence now relies on server-provided `balance.ui.*` flags (fallback only triggers when an entire block is missing), matching the updated `/overview/persist` response.
- Playwright multi-user scenario now logs in as the secondary user to persist selection state, eliminating the flaky hard-coded assumption.
- Deck seeding is no longer exposed as an OCC command during CI packaging; use the PHP helper scripts directly when QA data is required.
- Balance config trimmed: removed `roundPercent`/`roundRatio`/`showDailyStacks` UI knobs, hardcoded ratio rounding to 1 decimal, unified default lookback to 3 (clamped 1–6), and kept basis/index sanitisation consistent across TS/PHP.
- Sidebar Activity & Balance pane copy fully in English with clearer help text and grouped toggles; basis selector hints now explain “Off/Category/Calendar/Both”.

### Fixed
- `cleanBalanceConfig()` propagates `showNotes`, so `/overview/persist` always echoes all balance UI toggles and the client no longer re-injects missing fields.
- Fixed `/overview/load` crashes when all-day events were normalised without a pass-by-reference day map (Nextcloud 31’s controller now updates the accumulator safely).

## [0.4.5] - 2025-11-10
### Added
- GitHub Actions matrix that provisions Nextcloud server branches (`stable30`, `stable31`) across PHP 8.2/8.3 and runs Vitest, PHPUnit, and Playwright.
- Playwright flow that re-runs onboarding and saves a preset to guard main UI paths.
- Security automation scripts (`tools/security/run_curl_checks.sh`, `import_fuzz.sh`, `preset_roundtrip.sh`, `opsdash/tools/security/run_notes_csrf.sh`).
- `make appstore` target for reproducible packaging + signing.
- `opsdash/tools/security/rerun_onboarding.sh` to replay the wizard payload (strategy/theme/targets) via `/overview/persist`.
- Fixture-backed tests that replay the Config & Setup export: Vitest simulates preset import and PHPUnit verifies the controller’s sanitiser accepts the same payload without warnings.

### Changed
- README simplified for end users; screenshots moved under `img/`.
- Docs moved out of the distribution package to keep releases lean.
- Internal doc set consolidated (`DEV_WORKFLOW.md`, `TESTING.md`, `ROADMAP.md`) while legacy references now sit under `docs-private/opsdash-docs/archive/` for historical lookup.

### Fixed
- Preset names are sanitised end-to-end (API + UI) after fuzz testing uncovered path/HTML issues.
- Notes endpoint enforces CSRF tokens even for curl clients.

## [0.4.4] - 2025-10-20
- First public beta: calendar overview, targets/pacing widgets, presets, onboarding wizard, notes panel, theme syncing.
