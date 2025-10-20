# Testing Strategy Specification

## Goal
Define how the Opsdash app should be tested across PHP (server) and Vue
(frontend) layers, using tools recommended in the Nextcloud ecosystem.

## Overview
- **Server-side:** PHPUnit tests targeting controllers and services.
- **Client-side:** Vitest + Vue Test Utils for components/composables.
- **Future:** Optional end-to-end (Cypress/Playwright) once UI stable.

## Server-side (PHP) Testing
1. **Framework:** PHPUnit (Nextcloud ships setup via `nextcloud/server` repo).
2. **Structure:**
   - Place tests under `tests/` or `lib/Tests/` following NC conventions.
   - Use `\OCP\AppFramework\Test\ControllerTest` for controller tests.
   - Create dedicated service tests (pure PHP assertions) with mocked dependencies.
3. **Fixtures:**
   - Prefer dependency injection over static calls to ease mocking.
   - Use Nextcloud’s in-memory SQLite support when DB interaction required.
4. **Execution:**
   - Run inside NC dev container or using `make app-code-check` tooling.
   - Document command (e.g., `composer run app:phpunit` or `phpunit --configuration phpunit.xml`).
   - Immediate action (2025-03): add a PHPUnit bootstrap with a smoke test covering targets services to validate the harness.
   - Status (2025-10): Controller, validator, and dashboard tab coverage is in place; new sidebar pane + chart tests run in Vitest; continue expanding to keyboard shortcuts and chart render flows.

## Client-side (Vue) Testing
1. **Framework:** Vitest.
2. **Scope:**
   - Unit tests for composables (`useTargets`, `useCharts`).
   - Component tests for cards, sidebar subcomponents, charts (with mocks).
   - Service tests for business logic modules (`targets/progress` etc.).
3. **Tools:**
   - Vue Test Utils for DOM assertions.
   - `@testing-library/vue` optional for user-centric assertions.
4. **Execution:**
   - Add npm scripts (`npm run test:unit`).
   - Integrate into CI (GitHub Actions).
   - Immediate action (2025-03): scaffold Vitest with a placeholder test around `buildTargetsSummary`.
   - Status (2025-10): Vitest suite covers `buildTargetsSummary`, validator helpers, dashboard tabs/balance flows, `computePaceInfo`, chart helpers, and sidebar pane interaction tests. Next stretch: keyboard shortcuts, chart render assertions, and onboarding wizard once available.

## End-to-End (Optional Later)
- Use Cypress or Playwright once onboarding/theming stabilises.
- Mock Nextcloud APIs where feasible; for real integration, run in NC Docker env.

## CI Integration
- Extend GitHub workflow to run both PHPUnit and Vitest.
- Fail build on test failure; publish coverage reports (Codecov optional).

## Documentation
- Update `docs/DEV_WORKFLOW.md` with commands and guidelines.
- Keep a testing matrix per feature (targets, balance, notes).

## Open Questions
- Do we need snapshot tests for charts?
- Should we provide a seeded dataset fixture for e2e runs?
