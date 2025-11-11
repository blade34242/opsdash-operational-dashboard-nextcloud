# Packaging & Signing

This guide covers building, staging, signing, and producing the App Store tarball.

Prerequisites
- Nextcloud dev environment with `occ` (or a local NC container) to run `integrity:sign-app`.
- App Store certificate and private key (from your Nextcloud App Store account).

1) Build + stage via Makefile

From the repo root run:
```
VERSION=<x.y.z> make appstore
```
The target copies `opsdash/` into `build/opsdash`, runs `npm ci && npm run build` and
`composer install --no-dev --optimize-autoloader`, strips dev-only folders (`src`,
`tests`, `tools`, docs, docker files, node_modules, etc.), and produces
`build/opsdash-<x.y.z>.tar.gz`.

2) Sign the app (once certificates are ready)
```
# inside a host/container where occ is available
php /var/www/html/occ integrity:sign-app \
  --privateKey=/path/privkey.pem \
  --certificate=/path/cert.crt \
  --path=/absolute/path/to/build/opsdash
```
- This injects signatures into `appinfo/signature.json`. The Makefile prints the
  exact command to run (commented out) so you can drop in your key paths later.

3) Upload to App Store
- Upload the signed tarball via the Nextcloud App Store UI or REST API.
- Provide release notes and metadata; submit for review.

Notes
- Keep blacklisted files out of the package; see App Store docs.
- Do not include `node_modules` or any dev-time files.
- Consider CI automation for repeatable releases (see RELEASE.md).
