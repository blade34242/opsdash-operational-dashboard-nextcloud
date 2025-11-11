# Internationalisation Plan

Keep this doc private until we publish the first language packs. It captures the
current status, gaps, and workflow for adding de/fr/es translations to Opsdash.

## Goals
1. Ship high-quality German, French, and Spanish label packs that cover the SPA,
   PHP templates, and App Store metadata.
2. Make translations repeatable: single extraction command, single review
   checklist, automated smoke tests in CI.
3. Avoid leaking private docs/screenshots; only the README + changelog are
   exposed publicly.

## Current State (2025-11-12)
- `l10n/` contains `en.php` (authoritative) and an early `de.php`.
- Vue components still embed English strings; we only wrap strings in PHP.
- README now targets end users; internal docs live under `docs-private/`.
- CI executes Vitest/PHPUnit/Playwright on `stable30`/`stable31`; no localisation
  regression tests exist yet.

## Workflow
1. **String audit**
   - Run `npm run i18n:scan` from `opsdash/` (wrapper around
     `tools/i18n/scan_strings.mjs`) to list untranslated literals. Prioritise
     Sidebar, Onboarding, Cards, Notes.
   - Tag strings with `$t('opsdash', 'Key')` in Vue or `\OC_L10N` in PHP.
2. **Extraction**
   - Symlink the app into a local Nextcloud checkout (set `NEXTCLOUD_ROOT`).
   - Run `npm run i18n:extract` to execute `occ translations:create-app opsdash`
     and sync generated files back into this repository.
   - Commit updated POT and locale files (public repo).
3. **Translation**
   - Translate in Transifex or the internal sheet; keep QA focus on:
     - Range toolbar
     - Config & Setup copy
     - Keyboard overlay combos
   - Store WIP drafts under `docs-private/opsdash-docs/locales/`.
4. **Validation**
   - Add Vitest snapshot that renders Sidebar tabs with `__i18nLocale` mock.
   - Extend Playwright smoke to switch locale (Nextcloud personal settings) and
     ensure navigation succeeds.
5. **Release**
   - Update README badge + CHANGELOG.
   - Mention translations in App Store metadata (per locale).

## Commands
| Action | Command | Notes |
| --- | --- | --- |
| Audit Vue templates | `cd opsdash && npm run i18n:scan` | Lists literal strings + file/line numbers. |
| Generate POT/locale files | `NEXTCLOUD_ROOT=/path/to/nextcloud cd opsdash && npm run i18n:extract` | Requires `opsdash` symlinked into `<NEXTCLOUD_ROOT>/apps`. |

## Next Steps
1. ~~Add `tools/i18n/extract.sh` (wraps `occ translations:create-app`).~~ ✅ implemented 2025‑11‑12.
2. Replace hard-coded strings in Sidebar panes and cards.
3. Create TODO list per locale in `docs-private/opsdash-docs/locales/README.md`.
4. Wire Vitest helper to inject `$t`.
