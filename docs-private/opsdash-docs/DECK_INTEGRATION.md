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
2. **Seed data** via `apps/opsdash/tools/seed_deck_boards.php` (planned) so CI/fixtures have deterministic boards/cards.
3. **Capture fixtures** (similar to calendar harness) and store them under `test/fixtures/deck-*` so Vitest can replay board payloads.
4. **UI Spike**: start with a sidebar pane summarizing “Cards due this week” and link to the Deck app.
