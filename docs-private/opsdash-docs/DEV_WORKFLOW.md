# Opsdash Dev Workflow

Short, current guide for local work and ops toggles.

## Environment
- Nextcloud 30-32, Node.js 20+, npm 10+, Composer 2.
- Docker files: `docker-compose*.yml` mount the app under `apps-extra/opsdash`.

## Build & Test
```bash
cd opsdash
npm ci
npm run build
npm run test:unit
npm run test:e2e
composer run test:unit
```
- Packaging: `make appstore VERSION=<x.y.z>` (see `RELEASE.md`).

## Persistence & Profiles
- `/overview/persist` stores selection, targets, theme, reporting, Deck settings, and widget layout.
- Profiles are saved via `/overview/presets` (endpoint name kept for legacy reasons).

## Cache Toggles
- Disable cache: `occ config:app:set opsdash cache_enabled --value=0` or `OPSDASH_CACHE_ENABLED=0`.
- TTL: `occ config:app:set opsdash cache_ttl --value=60` or `OPSDASH_CACHE_TTL=60`.

## Seeding
- Calendar seeding scripts live under `tools/` (week/month, multi-calendar, demo).
- Deck seeding: `apps/opsdash/tools/seed_deck_boards.php`.

## Security Helpers
- `tools/security/run_curl_checks.sh` (persist/notes/profile flows).
- `tools/security/check_multi_user.sh` (per-user isolation).
- `opsdash/tools/security/rerun_onboarding.sh` (wizard replay).

For deeper context, see `TESTING.md`, `API.md`, and `RELEASE.md`.
