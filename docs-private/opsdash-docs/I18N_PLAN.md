# Internationalisation

## Workflow
1. Scan literals:
   ```bash
   cd opsdash
   npm run i18n:scan
   ```
2. Extract strings (Nextcloud root required):
   ```bash
   export NEXTCLOUD_ROOT=/path/to/nextcloud
   cd opsdash
   npm run i18n:extract
   ```
3. Wrap new UI strings with `t()`/`n()` from `src/services/i18n.ts`.

## Notes
- `l10n/en.php` is the source of truth.
- Keep this doc short; update only when the scripts change.
