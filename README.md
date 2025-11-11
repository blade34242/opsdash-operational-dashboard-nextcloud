# Opsdash — Operational Calendar Dashboard for Nextcloud

![Nextcloud Server Tests](https://github.com/blade34242/nexcloud-operational-cal-deck-dashboard/actions/workflows/server-tests.yml/badge.svg)

Opsdash turns calendars into actionable dashboards directly inside Nextcloud. The SPA (Vue 3 + Vite + TS) renders fast, respects user privacy (no telemetry), and stores every preference per user.

## UI Preview
| Overview | Config & Setup |
| --- | --- |
| ![Overview](img/overview.png) | ![Config](img/config.png) |
| Targets | Balance |
| ![Targets](img/targets.png) | ![Balance](img/balance.png) |

*(Screenshots are placeholders; replace `img/*.png` with final captures.)*

## Feature Highlights
- **Insights at a glance**: totals, averages, busiest day stats, workday/weekend split.
- **Targets + pacing**: per-calendar targets, category focus goals, Δ badges, forecasting.
- **Balance + charts**: pie + stacked bars, per-category breakdowns, heatmap, top tasks.
- **Notes & presets**: jot weekly/monthly notes and save/load complete sidebar profiles.
- **Onboarding wizard**: guide users through strategy selection, calendars, categories.
- **Dark/light aware**: follow Nextcloud theme or pin your preference.

## Compatibility
| Branch | NC target | Version |
| --- | --- | --- |
| `master` | NC 31 | 0.4.x (active dev) |
| `release/0.4.x` | NC 31 | App Store releases |
| *(future)* `feature/nc32` | NC 32 | 0.5.x prep |

## Local Dev
1. **Bootstrap Nextcloud**: mount `opsdash/` under `custom_apps/opsdash` in your NC stack (docker compose files are local and ignored by Git).
2. **Install deps & build**:
   ```bash
   cd opsdash
   npm ci
   npm run build
   composer install
   ```
3. **Enable & seed**: `occ app:enable opsdash`; install Calendar; run `opsdash/tools/seed/*` if you need sample data.
4. **Vite dev server** (optional): `npm run dev` (rebuild before packaging).

## Testing & Security
- `npm run test -- --run` (Vitest)
- `composer run test:unit` (PHPUnit)
- `npm run test:e2e` (Playwright smoke: dashboard load, onboarding rerun, preset save)
- Security scripts:
  - `tools/security/run_curl_checks.sh`
  - `tools/security/import_fuzz.sh`
  - `tools/security/preset_roundtrip.sh`
  - `opsdash/tools/security/run_notes_csrf.sh`

## Release Checklist
1. Bump versions + private changelog.
2. Run all tests + security scripts.
3. `VERSION=<x.y.z> make appstore` → creates `build/opsdash-<x.y.z>.tar.gz`.
4. Sign via `occ integrity:sign-app` once certificates are available.
5. Tag (`v<x.y.z>`), push, and attach the signed tarball to the GitHub + App Store release.

## Docs
Full architecture, roadmap, and pentest docs live in our private knowledge base; this README stays concise for public consumption.

## License
AGPL-3.0-or-later.
