# Changelog

All notable changes to this project will be documented in this file.

## [0.4.5] - 2025-11-10
### Added
- GitHub Actions matrix that provisions Nextcloud server branches (`stable30`, `stable31`) across PHP 8.2/8.3 and runs Vitest, PHPUnit, and Playwright.
- Playwright flow that re-runs onboarding and saves a preset to guard main UI paths.
- Security automation scripts (`tools/security/run_curl_checks.sh`, `import_fuzz.sh`, `preset_roundtrip.sh`, `opsdash/tools/security/run_notes_csrf.sh`).
- `make appstore` target for reproducible packaging + signing.

### Changed
- README simplified for end users; screenshots moved under `img/`.
- Docs moved out of the distribution package to keep releases lean.

### Fixed
- Preset names are sanitised end-to-end (API + UI) after fuzz testing uncovered path/HTML issues.
- Notes endpoint enforces CSRF tokens even for curl clients.

## [0.4.4] - 2025-10-20
- First public beta: calendar overview, targets/pacing widgets, presets, onboarding wizard, notes panel, theme syncing.
