# Targets Service Refactor Plan

## Current Pain
- `src/services/targets.ts` mixes config helpers, progress calculation, forecasting, and balance UI toggles in ~800 LOC.
- Unit tests cover only `buildTargetsSummary`; other helpers rely on integration tests.
- PHP controller mirrors similar logic, making it hard to evolve.

## Objectives
1. Split the file into clear modules:
   - `targets/config.ts` – normalization, clamps, defaults.
   - `targets/progress.ts` – weekly/monthly summaries, Δ calculations.
   - `targets/forecast.ts` – momentum/linear projections, daypart padding.
2. Export typed DTOs so both Vue and PHP (via fixtures/tests) can rely on the same schema.
3. Increase Vitest coverage for each module and add docs explaining the contracts.

## Steps
1. Create the new module structure + barrel file (`src/services/targets/index.ts`).
2. Move existing helper functions gradually, keeping exports backward-compatible.
3. Update imports in composables/components.
4. Add dedicated tests per module (e.g., `targets/progress.test.ts`).
5. Mirror changes in `docs-private/opsdash-docs/ARCHITECTURE.md` and update PHPUnit tests if PHP logic shifts.

## Risks / Mitigation
- **Regression risk**: rely on fixtures + new unit tests; keep Playwright smoke in place.
- **Bundle size**: Vite tree-shakes modules; no change expected.
- **Timeline**: tackle after Deck/reporting spikes so we don’t refactor twice.
