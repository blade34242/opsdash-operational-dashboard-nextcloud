# Production Readiness — opsdash 0.4.4

Target platform: Nextcloud 30–31 (per `appinfo/info.xml`).

## Essentials
- ✅ Versions match (`appinfo/info.xml`, `package.json`, footer) — 0.4.4.
- ✅ Build pipeline: `npm ci && npm run build` refreshes `js/.vite/manifest.json` and hashed bundles under `js/assets/`.
- ✅ App folder `opsdash` lives inside a configured `apps_paths`; icons limited to `img/app.svg` and `img/app-dark.svg`.
- ✅ Routes confined to `/apps/opsdash/overview/*`; POST routes enforce CSRF via `window.oc_requesttoken`.
- ✅ Backend aggregates per-user selection safely (clamped range/offset, category mapping, target bounds).

## Code & UX Checks
- Navigation registered through `navigation.xml`; no legacy `appinfo/app.php`.
- Frontend cards render in a responsive 4→3→2 grid; charts fall back to deterministic colors if DAV data is missing.
- Sidebar stores calendar selection, category targets, and notes; calendars default to “Unassigned” until a category is set.
- Heatmap and per-day stats are timezone-aware; aggregation caps protect heavy accounts (see `docs/PERFORMANCE.md`).

## Packaging
1. `npm ci && npm run build`
2. Copy release payload: `appinfo/`, `lib/`, `templates/`, `img/`, `css/`, `js/`, `README.md`, `docs/`
3. Sign: `occ integrity:sign-app --path <app-root> --privateKey ... --certificate ...`
4. Verify: `occ app:check-code opsdash` (informational) and install on NC 30 & 31 staging nodes

## Validation
- Static assets respond: `curl -I https://host/apps-extra/opsdash/img/app.svg`
- Authenticated load: `/index.php/apps/opsdash/overview`
- API smoke: `/apps/opsdash/overview/load?range=week&offset=0`
- UI flow: toggle calendars, edit targets/categories, add notes, confirm summary/balance cards update
- Notes persistence: POST `/notes` with request token

## Remaining Work Before App Store Submission
- Add Vitest coverage for `targets.ts` helpers and balance calculations.
- Improve accessibility: tab order in sidebar, aria labels for charts/cards.
- Localise strings via Nextcloud l10n once copy stabilises.
- Test against Nextcloud 32; bump `<nextcloud max-version>` after verification.

When the checklist above is green and the follow-ups addressed, the build can move to release (tag `v0.4.4`, attach signed tarball, include `docs/CHANGELOG.md` excerpt).
