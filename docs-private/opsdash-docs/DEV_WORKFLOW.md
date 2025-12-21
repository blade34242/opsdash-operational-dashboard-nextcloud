# Ops, Config & Dev Workflow

This consolidated guide covers local requirements, the build/test loop, configuration knobs, seeding scripts, and operational expectations. Use it as the single reference for day-to-day development.

---

## 1. Environment & Requirements
- **Server baseline**: Nextcloud 30–32 (CI currently runs stable30 + stable31 with PHP 8.2/8.3).
- **Tooling**: Node.js 20+, npm 10+, Composer 2, GNU `date`, `jq`, CalDAV-capable curl (standard).
- **Dev containers**: `docker-compose*.yml` spin up NC with Opsdash mounted under `apps-extra/opsdash`.
- **Logging**: `occ config:system:set loglevel --value=0` + `debug=true` for verbose traces when chasing issues.

---

## 2. Build & Test Loop
```bash
cd opsdash
npm ci && npm run build              # updates js/.vite/manifest.json + hashed assets
composer install                     # pulls PHP deps (if any)
npm run test -- --run                # Vitest suite (unit + integration fixtures)
composer run test:unit               # PHP layer (controllers/services)
PLAYWRIGHT_BASE_URL=http://localhost:8088 npm run test:e2e
```
- `make appstore VERSION=<x.y.z>` produces a clean, staged app under `build/` (see RELEASE.md).
- CI (`.github/workflows/server-tests.yml`) mirrors the loop before packaging Playwright artifacts.

---

## 3. Deploying UI Changes
1. Place the built app under `apps/opsdash/` (or `apps-extra/`).
2. Run the build above so `js/.vite/manifest.json` points at the fresh hashed chunks.
3. Clear caches: `docker restart <container>` and `occ app:disable opsdash && occ app:enable opsdash`.
4. Smoke-test assets:
   - `curl -I http://<host>/apps-extra/opsdash/js/assets/main-XXXX.js`
   - `curl -I http://<host>/index.php/apps/opsdash/overview`
5. Browser hard-reload with cache disabled.

The Vue mount pulls its entrypoint from the manifest, so filenames never need manual bumps.

---

## 4. Configuration, Targets & Sidebar
- `/overview/persist` stores per-user state: selected calendars, notes, sidebar tabs, category mapping, pacing thresholds, balance insights, and forecast toggles.
- “All-day hours” (0–24 h) defines how multi-day all-day events contribute per day.
- Sidebar remembers open/closed state via `localStorage` so the dock reopens in the last used position.

### Cache Controls
- Response cache toggle (global): `occ config:app:set opsdash cache_enabled --value=0` (set `1` to enable).
- TTL override (seconds): `occ config:app:set opsdash cache_ttl --value=60` or `OPSDASH_CACHE_TTL=60`.
- Env shortcut: `OPSDASH_CACHE_ENABLED=0` disables caching regardless of app config.

### Targets & Cards
- Range switch (Week/Month) recalculates totals; monthly targets default to weekly×4 unless explicitly set.
- Activity card toggles include weekend share, evening share, overlaps, longest session, last day off, projection modes, etc. These live under `targets_config.activityCard`.
- Balance card controls thresholds, insight toggles, pinning a note, and ratio precision. Stored under `targets_config.balanceCard`.

### Widget Layout & Sizing
- Widget width/height define the available grid space; content must never render outside this box.
- Scale (`sm`/`md`/`lg`/`xl`) controls font and element sizing inside the widget; Dense tightens spacing without changing layout size.
- Scrolling is a fallback only when a user makes a widget too small for its chosen Scale/Dense.

### Theme Overrides
- Config & Setup → Theme lets users pick `Follow Nextcloud`, `Force light`, or `Force dark`.
- Preference is persisted per-user server-side (`theme_preference` via `/overview/persist`) and bootstrapped into the DOM for instant paint; preset export/import includes it so profiles stay portable.

### Presets
- `GET/POST/DELETE /overview/presets` manage named snapshots of the full sidebar state.
- Loading a preset sanitises mismatched calendars/categories and reports warnings back to the UI.
- Export/import helpers (`tools/security/preset_export_import.sh`) validate round-trips.

### Reporting CLI
- `occ opsdash:report --user=<uid> --range=week --offset=0 --format=json` prints a lightweight report snapshot.

---

## 5. Performance, Caps & Colors
- Aggregation limits: `maxPerCal=2000`, `maxTotal=5000` events per load (exposed in `meta.limits`/`meta.truncated`).
- Colors resolve via server metadata → DAV lookups → deterministic fallbacks; missing colors are patched after load without blocking charts.
- Heatmap/pacing logic uses the user’s timezone (profile setting); odd shifts often trace back to missing timezone data.

---

## 6. Seeding & Demo Data
All scripts live under `tools/` and talk to CalDAV. Override credentials/URLs via env (`BASE`, `USER`, `PASS`).

| Script | Purpose | Common Flags |
| --- | --- | --- |
| `create_calendars.sh` | Bootstrap `seed-cal-01..10` | `COUNT`, `PREFIX`, `NAME_PREFIX` |
| `seed_week.sh` | Single calendar week load (default 40 events) | `CAL_SLUG`, `EVENTS`, `START_HOUR` |
| `seed_month.sh` | Single calendar month load (default 250 events) | `CAL_SLUG`, `EVENTS`, `MONTH_OFFSET` |
| `seed_week_multi.sh` | Spread events across 10 calendars | `CAL_COUNT`, `TOTAL`, `PREFIX` |
| `seed_month_multi.sh` | Month view across multiple calendars | same as above |
| `seed_opsdash_demo.sh` | Six-calendar “realistic” dataset | `WEEKS`, calendar names |
| `seed_month_work.sh` | Work-focused month (Focus, Sync, Support, Wellness) | `MONTH_OFFSET`, `FOCUS_HOURS` |
| `QA_USER=<uid> php apps/opsdash/tools/seed_deck_boards.php` | Deterministic Deck board (Inbox/In Progress/Done + QA cards) | `QA_DECK_BOARD_TITLE`, `QA_DECK_BOARD_COLOR`, `QA_DECK_KEEP_STACKS` |

Verification:
```bash
curl "$BASE/index.php/apps/opsdash/overview/load?range=week&offset=0" | jq '.meta.truncated'
curl "$BASE/index.php/apps/opsdash/overview/load?range=month&offset=0"
```
To remove data, delete the calendars in the NC UI or `DELETE /remote.php/dav/calendars/<user>/<slug>/`.

When working on Deck tests locally or in CI, run the OCC command above for every user that needs cards (usually `admin` and the QA user defined via `PLAYWRIGHT_SECOND_USER`). The legacy helper `php apps/opsdash/tools/seed_deck_boards.php` still proxies to the same service for scripted environments.

---

## 7. Debug & Verification
- Quick health checks: `/apps/opsdash/img/app.svg`, `/apps/opsdash/overview/ping`, and `js/.vite/manifest.json`.
- Enable verbose logging: `occ config:system:set debug --type=boolean --value=true`.
- Footer version sources (in order): `OC_App::getAppVersion()`, `/overview/ping`, `package.json`. Keep `info.xml` and `package.json` in sync to avoid mismatches.

---

## 8. Security & Automation Helpers
- `tools/security/run_curl_checks.sh` – range clamps, CSRF guard, preset sanitisation, notes escaping.
- `tools/security/import_fuzz.sh` – preset import fuzzing harness.
- `tools/security/preset_roundtrip.sh` – save/load/delete cycle.
- `tools/security/preset_export_import.sh` – export first preset and re-import payload.
- `opsdash/tools/security/rerun_onboarding.sh` – replays the wizard payload (strategy/theme/targets) via `/overview/persist` to ensure onboarding reruns stay healthy.
- `opsdash/tools/security/probe_dav_colors.sh` – CalDAV `PROPFIND` sanity check for `calendar-color`.
- `opsdash/tools/security/run_notes_csrf.sh` – notes CSRF.
- `tools/security/check_multi_user.sh` – verifies selections remain per-user.

---

## 9. Operational Tips
- Treat `[opsdash] Vue error` console messages as regressions; Playwright fails tests when it sees them.
- Use fixture replays (`opsdash/test/fixtures/*.json`) when refactoring composables to avoid hammering the server.
- When in doubt, restart the container and re-enable the app; opcache occasionally holds stale PHP.

Refer to `RELEASE.md` for packaging/signing/App Store submission, and the public `README.md` for end-user-facing documentation.
