# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Pending changes.

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
- Balance config trimmed: removed `roundPercent`/`roundRatio`/`showDailyStacks` UI knobs, hardcoded ratio rounding to 1 decimal, unified default lookback to 4, and kept basis/index sanitisation consistent across TS/PHP.
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
