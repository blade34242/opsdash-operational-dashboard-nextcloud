# Production Readiness Checklist (opsdash 4.0.1)

Scope: Nextcloud 31–32 (info.xml min=31, max=32).

Essentials
- Versions aligned: `appinfo/info.xml` and `package.json` = 4.0.1.
- Dependencies: Frontend built (`npm ci && npm run build`), manifest present.
- App ID and folder: `opsdash` under a configured `apps_paths`.
- Icons: `img/app.svg` and `img/app-dark.svg` only; no root overrides.
- Routes: canonical under `/apps/opsdash/config_dashboard/*`.
- Security: POST endpoints require CSRF; `load`/`notes` GETs require user session.

Code Hygiene
- No legacy `appinfo/app.php` (IBootstrap warning eliminated).
- Navigation via `navigation.xml` (runtime add tolerated, remain idempotent).
- No favicon override in production code.
- Frontend debug logs behind a flag (defaults off).

Performance & UX
- Full-width layout on large screens; empty-state remains full-height and scrollable.
- Charts render with server colors or DAV fallback.
- Targets card communicates status; room for incremental enhancements (see TARGETS_PLAN.md).

Docs & Ops
- Docs updated to opsdash (install, routes, APIs, seeding).
- Seeding scripts are dev-only; exclude `tools/` and `src/` from release tarball.
- Changelog and UPGRADE updated for 4.0.1.

Packaging & Signing
- Build: `npm ci && npm run build`.
- Stage: copy only `appinfo/`, `lib/`, `templates/`, `img/`, `css/`, `js/`, `README.md`, `docs/` (optional).
- Sign: `occ integrity:sign-app --path <app-root> --privateKey <key> --certificate <crt>`.
- Verify: `occ app:check-code opsdash` (informational), install on NC 31 & 32 test nodes.

Validation
- Static: `curl -I /apps-extra/opsdash/js/mainXX.js`, `/img/app.svg` → 200.
- Auth: `/index.php/apps/opsdash/config_dashboard` after login.
- API: `/config_dashboard/ping`, `load?range=week|month&offset=0`.
- UI: navigation entry, load/save/persist/notes, charts, targets; full width at default zoom.

Release
- Tag repo as `v4.0.1`, attach signed tarball, publish notes (CHANGELOG extract).
- Monitor logs and feedback; follow-up patches per TARGETS_PLAN.

