# Branching & Versioning Strategy

Keep the workflow simple: `main` is the active development line, and release branches are cut only for App Store submissions.

## Branch roles

- `main`
  - Daily development, bugfixes, and features.
  - `appinfo/info.xml` defines the supported Nextcloud version range; keep it current.
- `release/<version>`
  - Cut from `main` when preparing a store upload.
  - Hotfix-only after tagging to keep artifacts reproducible.

## Release flow (short)

1. `git switch -c release/<version>` from `main`.
2. Bump versions (`appinfo/info.xml`, `package.json`, `VERSION`, `docs-private/opsdash-docs/CHANGELOG.md`).
3. `npm ci && npm run build`, then package via `pack_opsdash.sh`.
4. Tag `v<version>` on the release branch, upload to the App Store.

## Backport rules

- Merge to `main` first; cherry-pick only if a released branch needs a fix.
- Avoid feature work on release branches.
