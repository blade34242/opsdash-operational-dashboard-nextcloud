# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Added
- Keyboard shortcuts overlay + `useKeyboardShortcuts` composable: Alt+←/→ navigation, Alt+N notes pane, Alt+T Config & Setup, Ctrl/⌘+S note save, and `?` cheat sheet.
- QA month + notes fixtures (`load-month-qa.json`, `notes-month-qa.json`) wired into Vitest + PHPUnit to keep `/overview/load` + `/overview/notes` schema coverage in sync.
- Localization helpers: `npm run i18n:scan` highlights untranslated strings and `npm run i18n:extract` wraps `occ translations:create-app` for template generation.
- Telemetry hook via `trackTelemetry('shortcuts_opened')` so overlay usage is observable.

### Changed
- Dashboard persistence now relies on server-provided `balance.ui.*` flags (fallback only triggers when an entire block is missing), matching the updated `/overview/persist` response.
- Playwright multi-user scenario now logs in as the secondary user to persist selection state, eliminating the flaky hard-coded assumption.

### Fixed
- `cleanBalanceConfig()` propagates `showNotes`, so `/overview/persist` always echoes all balance UI toggles and the client no longer re-injects missing fields.

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
