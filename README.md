# OpsDash (Nextcloud app)

A lightweight dashboard for scheduling and operations on Nextcloud — with calendar statistics, targets, and visual insights. Built for clarity, privacy, and performance.

Current status
- NC 31 line (0.4.x): stable and in active use
- NC 32 line (0.5.x): planned; will follow the same app id and route

Features
- Calendar insights: totals, averages, busiest day, typical start/end
- Visuals: pie (with %), stacked bars (per-day, per-calendar), 24×7 heatmap
- Targets: per‑calendar weekly/monthly targets, auto‑convert (×4/÷4), Δ and %
- Grouping: optional per‑calendar groups (0–9) to slice charts
- Notes: short notes per week/month (user‑scoped)
- Timezone aware: bucketing in the user’s timezone (DST‑safe)
- No telemetry: zero usage tracking

Quick links
- Architecture & APIs: `aaacalstatsdashxyz/docs/ARCHITECTURE.md`, `aaacalstatsdashxyz/docs/API.md`
- Security & Ops: `aaacalstatsdashxyz/docs/SECURITY.md`, `aaacalstatsdashxyz/docs/OPERATIONS.md`
- Packaging & Release: `aaacalstatsdashxyz/docs/PACKAGING.md`, `aaacalstatsdashxyz/docs/RELEASE.md`, `aaacalstatsdashxyz/docs/PUBLISHING_CHECKLIST.md`
- App Store Policy: `aaacalstatsdashxyz/docs/APP_STORE_PUBLISHING.md`
- Dev workflow & branching: `aaacalstatsdashxyz/docs/DEV_WORKFLOW.md`, `aaacalstatsdashxyz/docs/BRANCHING.md`
- Calendar seeding (dev): `aaacalstatsdashxyz/docs/CALENDAR_DEV_SETUP.md`

Compatibility
- 0.4.x → Nextcloud 31 (Calendar 5.5.x for local dev)
- 0.5.x → Nextcloud 32 (Calendar 6.0.x for local dev; later widen to 33)

Install (dev)
1) Place the app folder in your Nextcloud apps path (e.g., `/var/www/html/custom_apps/opsdash` on the official Docker images or `/var/www/html/apps-extra/opsdash` on legacy setups).
2) Build assets: `npm ci && npm run build` inside the app folder.
3) Enable via `occ app:enable opsdash` and open from the navigation.
4) For demo data, install Calendar and run the seeding scripts (see docs).

Release overview
- We publish separate packages per NC major via `info.xml` min/max versions.
- Packages are signed with Nextcloud’s `integrity:sign-app`.
- The controller uses the Vite manifest to resolve built assets (no hard‑coded names).

License
- AGPL‑3.0‑or‑later

## CI & Testing

- GitHub Actions (`.github/workflows/ci.yml`) runs:
  - `npm run test -- --run` (Vitest, JS unit/integration tests).
  - `composer test` (PHPUnit).
  - Playwright smoke test (`npm run test:e2e`) against a freshly booted `nextcloud:31-apache` container to ensure the SPA mounts without errors.
- `tools/ci/setup_nextcloud.sh` provisions the container (install, trusted domains, enable app) for local or CI runs.

## Automation helpers

- Security scripts (`tools/security/run_curl_checks.sh`, `import_fuzz.sh`, `opsdash/tools/security/run_notes_csrf.sh`) are **manual** white-box checks; run them locally when you need the pentest coverage.
- Packaging helper (`opsdash/tools/release/package.sh`) builds clean `tar.gz`/`zip` artifacts for App Store submissions.
