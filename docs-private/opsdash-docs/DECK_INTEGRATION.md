# Deck Integration

## Current Behavior (summary)
- Deck cards are fetched client-side and shown in the dashboard.
- Data is read-only and scoped to the logged-in user's permissions.
- Deck settings persist via `/overview/persist` as part of the profile payload.

## Local Seeding
- `apps/opsdash/tools/seed_deck_boards.php` seeds a deterministic board for QA.
- Use it when Playwright or fixtures need stable Deck data.

## Fixtures & Tests
- Fixtures live under `opsdash/test/fixtures/deck-*`.
- Vitest covers Deck service + UI rendering.
