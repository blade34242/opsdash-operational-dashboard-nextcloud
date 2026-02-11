# Testing Guide (short)

## Commands
```bash
cd opsdash
npm run test:unit
composer run test:unit
PLAYWRIGHT_BASE_URL=http://localhost:8088 npm run test:e2e
```

### Quick E2E smoke (startup-focused)
```bash
cd opsdash
PLAYWRIGHT_BASE_URL=http://localhost:8088 npx playwright test tests/e2e/dashboard.spec.ts --grep "Operational Dashboard loads without console errors|Offset navigation keeps day-off trend visible|Activity day-off trend widget renders on overview"
```

## Fixtures
- SPA fixtures: `opsdash/test/fixtures/*`
- PHP fixtures: `opsdash/test/fixtures/*` (shared with PHPUnit)

## Notes
- Run `npm run build` before packaging.
- Keep fixtures updated when `/overview/load` or `/overview/persist` schemas change.
- Current `dashboard.spec.ts` focuses on core startup/config flows; deck-tab heavy assertions were intentionally removed to keep CI/local runs stable.
