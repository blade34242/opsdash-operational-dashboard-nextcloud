# Internationalisation Plan

## Goals
- Enumerate untranslated strings in Vue templates quickly.
- Extract/update locale files via Nextcloud's `occ translations:create-app` flow.
- Keep authoritative strings in `l10n/en.php` while shipping de/fr/es packs.

## Workflow
1. **Scan templates** (from repo root):
   ```bash
   cd opsdash
   npm run i18n:scan
   ```
   Review the output and wrap the reported literals with `t('...')` from `src/services/i18n.ts`.
2. **Update locale files**:
   ```bash
   export NEXTCLOUD_ROOT=/path/to/nextcloud
   cd opsdash
   npm run i18n:extract
   ```
   This runs `occ translations:create-app opsdash` and syncs the generated POT/locale files back into `opsdash/l10n/`.
3. **Contribute translations** via Nextcloud’s Weblate/Transifex instance or by editing the JSON/PHP files directly. Keep `en.php` authoritative.
4. **Testing** – run Vitest to make sure components still render with the mocked `t()` helper.

## Status
- `src/services/i18n.ts` provides a safe fallback wrapper (`window.t` or `window.OC.L10N`).
- Notes panel + sidebar already call `t()`.
- Remaining work: Sidebar tabs, cards, wizard copy, onboarding steps, and Deck/Reporting strings.
