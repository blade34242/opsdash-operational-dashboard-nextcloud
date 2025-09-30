# Packaging & Signing

This guide covers building, staging, signing, and producing the App Store tarball.

Prerequisites
- Nextcloud dev environment with `occ` (or a local NC container) to run `integrity:sign-app`.
- App Store certificate and private key (from your Nextcloud App Store account).

1) Build assets
- Align versions: set the new version in `appinfo/info.xml` and `package.json`.
- Build frontend:
```
npm ci
npm run build
```
- Verify: `js/.vite/manifest.json` exists; controller resolves entry via manifest.

2) Stage a clean app directory (exclude dev files)
```
mkdir -p dist
rsync -a --delete \
  --exclude '.git' --exclude '.github' --exclude 'node_modules' \
  --exclude 'src' --exclude 'tools' --exclude 'test' --exclude 'backup' \
  --exclude 'docs' --exclude 'vite.config.ts' --exclude 'tsconfig*.json' \
  --exclude 'package*.json' \
  aaacalstatsdashxyz/ dist/aaacalstatsdashxyz
```
- Ensure dist tree matches `docs/DIRECTORY_STRUCTURE.md`.

3) Sign the app
```
# inside a host/container where occ is available
php /var/www/html/occ integrity:sign-app \
  --privateKey=/path/privkey.pem \
  --certificate=/path/cert.crt \
  --path=/path/to/dist/aaacalstatsdashxyz
```
- This creates JSON signatures in `dist/aaacalstatsdashxyz/appinfo/`.
- Optional verify: install the app locally and check no integrity warnings.

4) Create tarball
```
(cd dist && tar -czf aaacalstatsdashxyz-<version>.tar.gz aaacalstatsdashxyz)
```

5) Upload to App Store
- Upload via Web UI or REST API.
- Provide release notes and metadata; submit for review.

Notes
- Keep blacklisted files out of the package; see App Store docs.
- Do not include `node_modules` or any dev-time files.
- Consider CI automation for repeatable releases (see RELEASE.md).

