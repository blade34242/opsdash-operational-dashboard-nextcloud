# Directory Structure (App Package)

This documents the required tree for the Nextcloud App Store package. Only files needed at runtime should be shipped.

Required top-level (shipped)
- appinfo/
  - info.xml (metadata)
  - signatures/ (after signing)
- lib/ (PHP controllers/services)
- templates/ (PHP templates)
- css/ (built styles)
- js/ (built assets + .vite/manifest.json)
- img/ (icons: app.svg, app-dark.svg, favicon.svg optional)
- README.md (optional but recommended)
- LICENSE (recommended)

Not shipped (exclude from tarball)
- .git/, .github/, .gitignore
- node_modules/
- src/ (TypeScript/Vue sources)
- tools/ (seed scripts)
- test/ (Vitest tests)
- backup/ (any backups)
- docs/ (optional to include; not required by runtime)
- vite.config.ts, tsconfig.json, package*.json/lockfiles

Reference tree (minimal example)
```
opsdash/
  appinfo/
    info.xml
    signatures/
  css/
    style.css
  js/
    assets/
      main-<hash>.js
    .vite/
      manifest.json
  img/
    app.svg
    app-dark.svg
    favicon.svg
  lib/
    AppInfo/
      Application.php
    Controller/
      OverviewController.php
  templates/
    overview.php
  README.md
  LICENSE
```

Notes
- The controller resolves JS and CSS entries via the Vite manifest; hashed filenames under `js/assets/` are referenced automatically.
- Keep info.xml and package.json versions aligned before building.
- After signing, `appinfo/signatures/*.json` must be present in the shipped app.
