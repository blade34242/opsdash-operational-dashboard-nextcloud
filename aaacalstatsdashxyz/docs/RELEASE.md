# Release Process (Internal)

This describes our internal, repeatable release process for the app.

Versioning
- Use Semantic Versioning (e.g., 0.4.0 → 0.4.1 for fixes, 0.5.0 for features).
- Align `appinfo/info.xml` and `package.json` versions.
- Update `docs/CHANGELOG.md` and `docs/UPGRADE.md` as needed.

Checklist
1) Decide compatibility window
   - `info.xml` `<nextcloud min-version="31" max-version="32"/>` (adjust if testing on newer NC passes).
2) Update versions and changelog
   - Bump versions and note key changes.
3) Build and sanity-check
   - `npm ci && npm run build` → JS + manifest present.
   - Local run on dev container: verify nav, route, charts, targets.
4) Package & sign
   - Follow `docs/PACKAGING.md` to stage, sign, and tar.
5) Upload
   - App Store upload, fill metadata, submit for review.
6) Tag and announce
   - Create a Git tag (e.g., v0.4.0), publish GitHub release (attach tarball).
7) Post-release
   - Monitor store feedback, handle patches promptly.

CI/CD (optional)
- Add a GitHub Actions workflow to:
  - Build on tag → stage → sign (using stored secrets) → upload via API → attach tarball.
  - Prevents human error and ensures repeatability.

