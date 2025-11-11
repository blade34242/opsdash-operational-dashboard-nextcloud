# Publishing Checklist & Priorities

This checklist tracks what must be in place before submitting to the Nextcloud App Store, with priorities for incremental delivery.

P0 — Must Have (blockers)
- [ ] `appinfo/info.xml`: correct `id` (`opsdash`), `name`, version (e.g., `4.0.x`), `<category>`, `<icon>app.svg</icon>`, `<bootstrap>`, and `<nextcloud min/max>`.
- [ ] Build & manifest: `npm run build` produces `js/.vite/manifest.json`; controller resolves hashed entries.
- [ ] Security: POST routes require CSRF; GET routes read-only; inputs clamped; no inline styles.
- [ ] Packaging hygiene: stage runtime-only files; exclude dev content.
- [ ] Code signing: sign staged app; signatures present under `appinfo/`.
- [ ] Basic QA: nav works; app loads; charts render; targets CRUD; timezone bucketing sanity.

P1 — Should Have (strongly recommended)
- [ ] API docs (`docs/API.md`) reflect payloads (targets, notes, validation).
- [ ] CHANGELOG/UPGRADE state compatibility and highlights for the release.
- [ ] README references docs, dev requirements, and NC compatibility.
- [ ] Seeding scripts documented (`docs/SEEDING.md` / `docs/CALENDAR_DEV_SETUP.md`).
- [ ] Changelog URL configured (`occ config:app:set opsdash changelog_url ...`).

P2 — Nice to Have / Post-publish
- [ ] i18n: extract UI strings for translation; use Nextcloud l10n.
- [ ] a11y: labels, roles, keyboard navigation on sidebar cards.
- [ ] CI/CD: GitHub Action to build, sign, and upload on tag.
- [ ] Server cache for load() results (short TTL) to speed repeated views.
- [ ] Color flip smoothing (defer chart draw until DAV colors resolved or fade transition).

Verification Steps (each release)
1) Build
   - `npm ci && npm run build` → manifest present.
2) Runtime check
   - :8088 dev container → login → app nav → charts and targets visible; timezone-correct heatmap.
3) Package & sign
   - Follow `docs/PACKAGING.md`.
4) App Store upload
   - Submit signed tarball with release notes.
5) Tag & publish
   - Tag repo; optional CI release.

Notes
- Keep `info.xml` and `package.json` aligned to avoid footer version mismatch during load.
- For broader compatibility (e.g., NC 33), test and then update `max-version`.
