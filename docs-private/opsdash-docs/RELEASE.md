# Release & App Store Guide

This consolidates the release workflow, packaging/signing steps, App Store submission details, and the internal publishing checklist.

## Versioning & Branches
- Align `appinfo/info.xml`, `package.json`, and the public `CHANGELOG.md`.
- Use a release branch only when preparing an App Store submission.

## Pre-release Checklist
1. **Choose compatibility window** - adjust `<nextcloud min-version="X" max-version="Y"/>` if QA confirms broader support.
2. **Update versions & changelog** - bump `appinfo/info.xml`, `package.json`, `CHANGELOG.md`.
3. **Build + sanity check** - `npm ci && npm run build`; run the app locally.
4. **Run tests** - `npm run test -- --run`, `composer run test:unit`, `npm run test:e2e`, security scripts in `tools/security/`.

## Packaging & Signing
1. `VERSION=<x.y.z> make appstore` - copies `opsdash/` into `build/opsdash`, installs prod deps, strips dev files, and creates `build/opsdash-<version>.tar.gz`.
2. Sign the staged app:
   ```bash
   php /var/www/html/occ integrity:sign-app \
     --privateKey=/path/privkey.pem \
     --certificate=/path/cert.crt \
     --path=/absolute/path/to/build/opsdash
   ```
3. (Optional) Automation: once signing works end-to-end, add a GitHub Action that runs `make appstore`, signs with stored secrets, and uploads the tarball on tag pushes.

## App Store Submission
- Upload the signed tarball via the Nextcloud App Store UI or REST API.
- Provide release notes (copy from `CHANGELOG.md`), compatibility details, screenshots, and support links.
- Ensure packaging excludes dev artifacts (`src/`, `tools/`, `node_modules/`, etc.) and includes `appinfo/signature.json`.
- After approval, monitor feedback and prepare patches if needed.

## Publishing Checklist (P0/P1/P2)
- P0: correct `info.xml`, build/manifest present, POST routes enforce CSRF, package hygiene, signatures included, manual QA complete.
- P1: API docs, changelog, README, seeding instructions, changelog URL configured.
- P2: i18n/a11y polish, CI/CD release automation, caching/perf enhancements.

## Post-release
- Tag the release (`git tag v<x.y.z>`) and push.
- Publish a GitHub Release (attach the signed tarball).
- Track telemetry (if any) and user reports; plan follow-up fixes as needed.
