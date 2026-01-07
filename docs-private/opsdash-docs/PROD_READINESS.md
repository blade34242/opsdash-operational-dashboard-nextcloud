# Production Readiness (short)

## Checklist
- Versions aligned (`appinfo/info.xml`, `package.json`, root `CHANGELOG.md`).
- `npm run build` produces `js/.vite/manifest.json` + hashed assets.
- CSRF enforced for POSTs (`/overview/persist`, `/overview/notes`, `/overview/presets`).
- `/overview/load` caps/truncation visible in `meta.limits`.

## Packaging
1. Build assets.
2. Package via `pack_opsdash.sh` or `make appstore`.
3. Sign with `occ integrity:sign-app`.

Keep this doc minimal; defer details to `RELEASE.md`.
