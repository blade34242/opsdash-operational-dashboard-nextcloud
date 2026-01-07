# Testing Guide (short)

## Commands
```bash
cd opsdash
npm run test:unit
composer run test:unit
PLAYWRIGHT_BASE_URL=http://localhost:8088 npm run test:e2e
```

## Fixtures
- SPA fixtures: `opsdash/test/fixtures/*`
- PHP fixtures: `opsdash/test/fixtures/*` (shared with PHPUnit)

## Notes
- Run `npm run build` before packaging.
- Keep fixtures updated when `/overview/load` or `/overview/persist` schemas change.
