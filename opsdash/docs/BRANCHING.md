# Branching & Versioning Strategy

Goal: keep the NC 31-compatible line (0.4.x) moving on `main`, cut release branches for App Store submissions, and prepare the next NC line without destabilising current users.

## Branch roles

- `main`
  - Tracks NC 31 today (release line 0.4.x). All day‑to‑day development happens here so that fixing bugs and shipping onboarding refactors does not require backports.
  - `appinfo/info.xml` should continue to declare `min-version="31" max-version="31"` until we officially support NC 32.
  - When we start NC 32 work we keep `main` on 0.4.x until a dedicated branch is ready (see “Future lines”).
- `release/0.4.x`
  - Cut from `main` whenever we stabilise for an App Store upload (e.g., `release/0.4.5`).
  - Only allow cherry-picked fixes after the release candidate is tagged to keep hashes stable for signature verification.
- Future NC line (placeholder name `feature/nc32-bootstrap` → later `main`)
  - Once NC 32 is validated we create a long‑lived branch for 0.5.x, repeat the same “release/<line>” pattern, and eventually flip `main` over after 0.5.0 is healthy. Until then `release/0.4.x` and `main` remain NC 31.

## Compatibility windows

- 0.4.x: `info.xml` `<nextcloud min-version="30" max-version="31"/>` (today we only test on 31 in CI; keep 30 support best‑effort).
- 0.5.x (future): `<nextcloud min-version="32" max-version="32"/>` initially, widen after CI gains new job entries.

## Release flow

1. Branch: `git switch -c release/0.4.5` from `main` once features freeze.
2. Bump versions (`appinfo/info.xml`, `package.json`, `VERSION`, docs/CHANGELOG entry).
3. Build assets: `npm ci && npm run build` (hash manifest) and `composer install --no-dev` for packaging.
4. Create App Store tarball via `pack_opsdash.sh`, sign, and upload.
5. Tag `v0.4.5` on the release branch, then merge/tag back to `main` if needed.

## Backport rules

- All work merges into `main` first. Only cherry-pick to a release branch when the bug affects that release and we need a follow-up build.
- Avoid diverging feature work on release branches; keep them hotfix‑only so signatures stay reproducible.
- If we ever maintain multiple major lines simultaneously, follow the same pattern as other Nextcloud apps (e.g., Notes, Deck): `main` targets the newest NC, `stable/xx` branches lock older compatibility.

## Local multi-folder setup (recommended)

- Use git worktrees or sibling clones to map each branch to a container volume:
  - `worktrees/opsdash-main` → mounted into the NC 31 dev container.
  - `worktrees/opsdash-release-0.4.x` → used to build App Store bundles without extra files in the volume.
- Update `docker-compose*.yml` to point at the correct path per container, matching how other Nextcloud apps (Calendar, Deck) mount their `apps/your-app` folder.
