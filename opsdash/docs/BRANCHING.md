# Branching & Versioning Strategy

Purpose: keep releases stable per Nextcloud major while allowing main to move fast.

Branches
- `main` → current line for NC 32 (later 33)
  - Version line: 0.5.x
  - App id: `opsdash`, route `/overview` (same id/route as 0.4.x)
- `support/0.4.x` → maintenance line for NC 30–31
  - Version line: 0.4.x
  - App id: `opsdash`, route `/overview`
  - No big refactors; only bug fixes

Compatibility windows
- 0.4.x: `info.xml` `<nextcloud min-version="30" max-version="31"/>`
- 0.5.x: `info.xml` `<nextcloud min-version="32" max-version="32"/>` → widen to 33 after test

Release process per line
- Bump `appinfo/info.xml` and `package.json` versions (aligned)
- Update `docs/CHANGELOG.md` and `docs/UPGRADE.md`
- Build → stage (runtime files only) → sign → tarball → upload to App Store
- Tag (e.g., v0.4.1 or v0.5.0)

Backports
- Implement on `main` then cherry-pick to `support/0.4.x` if needed.
- Avoid feature backports; keep maintenance branches stable.

Local multi-folder setup (recommended)
- Use git worktrees or separate folders per branch:
  - `worktrees/opsdash-main` (mounted to NC 32 container)
  - `worktrees/opsdash-nc31` (mounted to NC 31 container)
- Update docker-compose mounts to point to the correct folder per container.
