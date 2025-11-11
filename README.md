# Opsdash — Operational Calendar Dashboard for Nextcloud

![Nextcloud Server Tests](https://github.com/blade34242/nexcloud-operational-cal-deck-dashboard/actions/workflows/server-tests.yml/badge.svg)

Opsdash is a privacy-minded Nextcloud app that turns your calendars into actionable dashboards. The SPA (Vue 3 + Vite + TypeScript) loads directly inside Nextcloud and keeps every config per-user—no telemetry, no SaaS dependency.

## Screenshots (WIP)
| Overview (week) |
| --- |
| ![Overview screenshot](docs-private/opsdash-docs/screenshots/overview.png) |

*(Replace `docs-private/.../overview.png` with final public assets before publishing. For now the repo keeps only a placeholder path.)*

## Highlights
- **Time insights**: total/avg/median hours per week, busiest days, workday vs weekend split.
- **Targets & pacing**: per-calendar + per-category goals, Δ badges, pace hints, forecast overlays.
- **Balance view**: chart your focus areas, keep ratios in check, see trend deltas at a glance.
- **Presets & onboarding**: save/load full sidebar configurations and re-run the onboarding wizard any time.
- **Notes**: week/month notes with HTML safely escaped on rendering.
- **Dark/light aware**: follow Nextcloud or force your preferred theme (per user).

## Compatibility
| Branch | NC target | Version line |
| --- | --- | --- |
| `master` | NC 31 | 0.4.x (current line) |
| `release/0.4.x` | NC 31 | Frozen releases for App Store submissions |
| *(future)* `feature/nc32` | NC 32 | 0.5.x once CI matrix is green |

## Quick Start
1. **Clone + mount**: place `opsdash/` under `custom_apps/opsdash` in your Nextcloud dev stack (Docker compose files live in this repo for reference, but are `.gitignore`d by default).
2. **Install deps & build**:
   ```bash
   cd opsdash
   npm ci
   npm run build
   composer install
   ```
3. **Enable & seed**: `occ app:enable opsdash`; install the Calendar app; use the scripts in `opsdash/tools/seed/` to preload sample data if desired.
4. **Dev server** (optional): `npm run dev` for Vite HMR (Nextcloud still serves built assets, so rebuild before packaging).

## Testing & Security
- **Unit tests**: `npm run test -- --run` (Vitest), `composer run test:unit` (PHPUnit).
- **E2E smoke**: `npm run test:e2e` (Playwright) covers dashboard load, onboarding rerun, and preset saves (requires `npx playwright install --with-deps chromium`).
- **Security scripts** (manual white-box checks):
  - `tools/security/run_curl_checks.sh` → range/offset clamps, CSRF enforcement, preset + notes fuzz.
  - `tools/security/import_fuzz.sh` → config envelope import.
  - `tools/security/preset_roundtrip.sh` → preset save/load/delete sanitisation.
  - `opsdash/tools/security/run_notes_csrf.sh` → notes CSRF guard.

## Release Workflow
1. Bump `opsdash/VERSION`, `appinfo/info.xml`, `package.json`; update the private changelog.
2. Run all tests + security scripts.
3. `VERSION=<x.y.z> make appstore` → copies a clean tree to `build/opsdash`, runs prod builds, strips dev files, and emits `build/opsdash-<x.y.z>.tar.gz`.
4. Sign the tarball via `occ integrity:sign-app` once your App Store cert/private key is configured (Makefile prints the exact command).
5. Tag (`git tag v<x.y.z> && git push --tags`), create the GitHub Release, and upload the signed tarball before submitting to the Nextcloud App Store.

## Notes
- Full documentation (architecture, branching strategy, pentest plan, etc.) now lives in our private knowledge base; this repo stays lean for public consumption.
- Dummy screenshots live under `docs-private/opsdash-docs/screenshots/`; replace the README image path when you’re ready to publish.

## License
AGPL-3.0-or-later. See `LICENSE`.
