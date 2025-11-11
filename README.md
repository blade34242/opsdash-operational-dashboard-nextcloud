# Opsdash — Operational Calendar Dashboard for Nextcloud

![Nextcloud Server Tests](https://github.com/blade34242/nexcloud-operational-cal-deck-dashboard/actions/workflows/server-tests.yml/badge.svg)

Opsdash turns raw calendar data into actionable week/month insights inside Nextcloud. It ships as a privacy-preserving app (no telemetry, user-scoped config storage) and targets the NC 31 line today while we stage NC 32 support.

## Feature Highlights
- **Dedicated SPA** powered by Vue 3 + Vite: fast navigation, collapsible sidebar, onboarding wizard, and dark/light auto theme.
- **Targets + pacing**: per-calendar weekly/monthly targets, Δ, badges, pace hints, and forecast overlay (linear vs. calendar/category modes).
- **Charts & tables**: stacked bars, pie, calendar-by-category tables, longest tasks, heatmap, balance index, and activity breakdowns (weekend share, overlaps, earliest/latest, etc.).
- **Notes & presets**: jot context per range and save/load named presets (sanitised and scoped per user).
- **No telemetry**: the app never leaves your server; all configs live in Nextcloud’s config backend.

## Compatibility & Branching

| Branch | NC support | Version line | Notes |
| --- | --- | --- | --- |
| `master` | NC 31 | 0.4.x | Active development (architecture refactor, onboarding revamp). |
| `release/0.4.x` | NC 31 | 0.4.x | Cut from `master` for App Store submissions (e.g., `release/0.4.5`). |
| *(staged)* | NC 32 | 0.5.x | Matrix entries exist in `.github/ci-matrix.json` but stay disabled until `info.xml` widens. |

Detailed branching/roadmap docs now live in our private knowledge base; the repo stays focused on runtime code + this README.

## Local Development
1. **Bootstrap Nextcloud**: use the provided docker-compose files (`docker-compose31.yml` or `docker-compose.yml`) to mount the app under `custom_apps/opsdash`.
2. **Install deps & build**:
   ```bash
   cd opsdash
   npm ci
   npm run build
   composer install
   ```
3. **Enable + seed**: `occ app:enable opsdash`, install the Calendar app, then run the seeding helpers from `opsdash/tools/seed/` (documented in `docs/SEEDING.md`).
4. **Vite dev server** (optional): `cd opsdash && npm run dev` to hot-reload the SPA; Nextcloud still serves the built assets, so rebuild before packaging.

## Testing & CI
- **Local commands**
  - `npm run test -- --run` (Vitest suites for composables/components/services).
  - `composer run test:unit` (PHPUnit controllers/services).
  - `npm run test:e2e` (Playwright smoke tests for dashboard load, onboarding rerun, and preset saves; requires `npx playwright install --with-deps chromium`).
  - `npm run build` (ensures `js/.vite/manifest.json` matches hashed assets).
- **GitHub Actions** (`.github/workflows/server-tests.yml`)
  - Reads `.github/ci-matrix.json` and runs every enabled combo (currently `stable30/stable31 × PHP 8.2/8.3`).
  - Steps: checkout `nextcloud/server@branch`, rsync Opsdash into `server/apps/opsdash`, `npm ci → test → build`, install PHP deps, `occ maintenance:install`, run PHPUnit + Playwright, upload per-matrix artifacts.
- **Security smoke scripts**
  - `tools/security/run_curl_checks.sh` (range/offset clamp, CSRF header, preset sanitisation, notes injection) now relies on basic auth instead of the legacy form login.
  - Additional helpers (`tools/security/import_fuzz.sh`, `tools/security/preset_roundtrip.sh`, `opsdash/tools/security/run_notes_csrf.sh`) cover config import/export, preset roundtrips, and notes CSRF scenarios.

## Security & Pentest Workflow
- Pentest plan/log, integration instructions, and security hardening guides remain in the internal docs portal. Public repo keeps only the automation scripts under `tools/security/`.

## Release Workflow
1. Bump versions (`opsdash/VERSION`, `appinfo/info.xml`, `package.json`) and update the private changelog.
2. Run the full test suite + security scripts.
3. `make appstore VERSION=<x.y.z>` → copies a clean app tree into `build/`, runs `npm ci && npm run build` and `composer install --no-dev`, strips dev files, and produces `build/opsdash-<x.y.z>.tar.gz`.
4. Sign the tarball via `occ integrity:sign-app` once your App Store certificate is available (the `Makefile` echoes the command to use).
5. Cut `release/<line>` branch, create Git tag (e.g., `v0.4.5`), and upload to the App Store.

## License
AGPL‑3.0-or-later. See `LICENSE` for details.
