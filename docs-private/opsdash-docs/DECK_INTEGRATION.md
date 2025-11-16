# Deck Integration Spike Notes

## Goal
Explore how Opsdash can surface Deck board activity (cards, due dates, assignees) alongside calendar metrics so teams see execution + planning in one place.

## Questions
- Which Deck APIs are available for read-only consumption (OCS vs REST)?
- Can we map Deck boards to Opsdash categories or calendars?
- What data is most useful in Opsdash context? (Upcoming due cards? Aging cards per board?)
- How do we respect permissions — only show boards the current user can access?

## Potential Approach
1. Start with the OCS endpoints exposed by Deck (`/ocs/v2.php/apps/deck/api/v1/boards`). Authenticate with the same session Opsdash already has.
2. Add a lightweight Deck service inside Opsdash that fetches:
   - Boards the user is a member of.
   - Cards due in the current Opsdash range (week/month) with statuses.
3. Surface snapshots in the sidebar (e.g., "Deck cards due this week" panel) before attempting deep charts.
4. Consider linking Deck board colours to Opsdash categories for visual alignment.

## Open Concerns
- API rate limits / caching: Deck responses might need caching similar to calendar loads.
- UI real estate: ensure Deck widgets don’t overcrowd the dashboard.
- Permissions: verify Deck enforces board permissions server side; Opsdash should not cache anything cross-user.

## Next Steps
1. **Prototype Deck service** under `src/services/deck.ts` that calls `/ocs/v2.php/apps/deck/api/v1/boards` with the current request token/cookies. Reuse the `useOcHttp` composable.
2. **Seed data** via `apps/opsdash/tools/seed_deck_boards.php`, `occ opsdash:seed-deck --user <uid>`, or the repo helper `./tools/seed_deck_occ.sh` (wraps OCC inside the docker container) so CI/fixtures have deterministic boards/cards for every relevant account (admin + QA).
3. **Capture fixtures** (similar to calendar harness) and store them under `test/fixtures/deck-*` so Vitest can replay board payloads.
4. **UI Spike**: start with a sidebar pane summarizing “Cards due this week” and link to the Deck app.

---

## 0.4.6 Progress (Dec 2025)

### Seed script + fixtures
- `apps/opsdash/tools/seed_deck_boards.php` (and the OCC wrapper `php occ opsdash:seed-deck --user qa`) bootstraps a QA board (“Opsdash Deck QA”) for the `QA_USER` (defaults to `qa`).
- Script deletes previous stacks/cards, recreates Inbox/In Progress/Done stacks, and inserts deterministic cards:
  - Active cards due in the current Opsdash week (Prep Opsdash Deck sync, Resolve Deck blockers).
  - Completed/archived cards (Publish Ops report cards, Archive completed Ops tasks) so the “completed” path has data.
  - Future month card (“Plan monthly Ops themes”) so month ranges aren’t empty.
- The script assigns default labels (“Ops”, “Blocked”, “Reporting”), ties cards to the QA user, marks some `done`+`archived`, and echoes status to stdout so CI logs show progress.
- Fixtures:
  - `test/fixtures/deck-week.json` captures the Deck API payload (boards + stacks + cards) used by Vitest.
  - Playwright now relies on the seed script instead of brittle shell probes.

### Frontend service/composable
- `src/services/deck.ts`
  - Fetches boards and stacks via `/apps/deck/api/v1/boards` and `/apps/deck/api/v1/boards/{id}/stacks`.
  - Normalises cards (board/stack metadata, due/done timestamps, labels, assignees) and filters them for the active Opsdash `from`/`to`.
  - Marks range matches as `due` vs `completed`, accounting for archived cards lacking a `done` timestamp.
  - Returns empty arrays (instead of throwing) when Deck is disabled/absent so Opsdash stays silent for tenants without Deck.
  - Covered by `test/deckService.test.ts` using the QA fixture.
- `composables/useDeckCards.ts`
  - Watches `from`/`to` derived from `/overview/load` responses and refreses Deck cards automatically.
  - Exposes `refreshDeck`, loading state, error text, and `deckLastFetchedAt`.
  - Vitest coverage via `test/useDeckCards.test.ts` (happy path + error path).

### UI
- New `DeckCardsPanel.vue` renders a dedicated tab inside App.vue’s tabstrip:
  - Read-only list with board + stack chips, due/completed badges, labels, and assignees.
  - Refresh button hooks into the composable (no additional server dependency).
  - Empty state text nudges QA to rerun seeding if deck payloads disappear.
  - Styling keeps parity with existing cards (chips, badges, dark-mode friendly palette).
  - All vs My cards filter buttons use the cached payload and the viewer’s UID to slice by assignees; the UI disables “My cards” when we can’t resolve the user.
- `App.vue` gained a “Deck” tab (pane `'deck'`) and wires the composable’s state into the panel.
- Config: Sidebar now exposes a “Report” tab where users can toggle Deck visibility, enable/disable filters, pick default filter mode, and configure weekly/monthly report cadences.
- Playwright coverage clicks the Deck tab and asserts QA card titles exist so CI catches regressions.

### Follow-ups
- Consider caching Deck responses per load to avoid re-fetching during rapid range switches. ✅ implemented via `useDeckCards` cache map.
- Deck tab currently read-only; next iterations can link to Deck boards or show quick filters (My cards vs All). ✅ added a deep-link to `/apps/deck/` and All/My filters; consider persisting the filter choice and surfacing counts.
- Mirror QA Deck payloads in PHPUnit if we add server-side aggregation later (currently client-only).
