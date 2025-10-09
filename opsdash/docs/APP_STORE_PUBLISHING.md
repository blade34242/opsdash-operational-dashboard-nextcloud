# Nextcloud App Store — Publishing Policy (for this app)

This document explains how we satisfy Nextcloud’s expectations for app publishing, versioning, compatibility, signing, and maintenance. It complements PACKAGING.md, RELEASE.md, and PUBLISHING_CHECKLIST.md.

## Compatibility and Release Lines

- We publish separate releases per Nextcloud major via min/max in `appinfo/info.xml`.
- Store delivery is filtered by the client’s server version. This is the supported, standard mechanism.

Planned lines
- 0.4.x → NC 30–31 (app id `opsdash`, route `/dashboard`)
  - `info.xml`: `<nextcloud min-version="30" max-version="31"/>`
  - Purpose: keep 31/30 users on a stable line with bug-fix backports only.
- 0.5.x → NC 32 (and optionally 33 after test) (app id `opsdash`, route `/dashboard`)
  - `info.xml`: `<nextcloud min-version="32" max-version="32"/>` (later `33`)
  - Purpose: current development line with new features.

Branching model
- `main`: current line for NC 32+ (0.5.x onwards).
- `support/0.4.x`: maintenance line for NC 30–31.
- Only critical fixes are backported to the maintenance branch; new work lands on `main` first.

## Versioning

- Semantic Versioning per line (x.y.z).
- `appinfo/info.xml <version>` and `package.json version` stay aligned.
- `CHANGELOG.md` and `UPGRADE.md` updated for each release.

## Packaging & Blacklist

Shipped (runtime only):
- `appinfo/` (with `info.xml` and signing `signatures/`)
- `lib/`, `templates/`, `css/`, `js/` (with `.vite/manifest.json`), `img/`
- `README.md`, `LICENSE`

Excluded:
- `.git/`, `.github/`, `node_modules/`, `src/`, `tools/`, `test/`, `backup/`, `docs/`, `vite.config.ts`, `tsconfig*.json`, `package*.json`

See DIRECTORY_STRUCTURE.md and PACKAGING.md for exact steps.

## Signing

- We sign the staged app with `occ integrity:sign-app` using the App Store certificate/private key.
- Resulting signature JSONs are written into `appinfo/` and must be included in the package.

## CI/CD (optional but recommended)

- GitHub Actions per line:
  - On tag → build, stage, sign (secrets), upload to App Store API, attach tarball to GitHub Release.

## Security / API Usage

- Only public OCP APIs are used.
- All write endpoints are `POST` + CSRF; reads are `GET` and read-only.
- Inputs are clamped and ID lists are intersected with the user’s calendars.
- CSP: no inline scripts; template fallback uses CSS classes.

## UX/Navigation

- `appinfo/navigation.xml` present; `Application::boot()` adds a runtime nav fallback for older servers.
- Icons live in `img/` (`app.svg`, `app-dark.svg`); favicon is set at runtime when app page is open.

## Testing/Verification

- Docker dev stacks for NC 30/31/32; Calendar app installed (see CALENDAR_DEV_SETUP.md) and seeded data.
- Checklist: nav entry visible, SPA loads, charts render, targets edit works, timezone bucketing correct.

## Calendar App Compatibility (dev/test)

- For local testing: install a calendar release matching your NC major, e.g.:
  - NC 30/31 → Calendar 5.5.x
  - NC 32 → Calendar 6.0.x
- See CALENDAR_DEV_SETUP.md for install steps (copy tar.gz to container, extract, `chown`, `occ app:enable`).
