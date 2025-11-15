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
- Prototype a service class that hits the Deck OCS API with the logged-in user context.
- Create Seeds for deck
- Capture sample JSON responses for fixtures.
