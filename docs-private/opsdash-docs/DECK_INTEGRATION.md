# Deck Integration

## Current Behavior (summary)
- Deck cards are fetched via the Opsdash backend and shown in the dashboard.
- Data is read-only and scoped to the logged-in user's permissions.
- Deck settings persist via `/overview/persist` as part of the profile payload.

## Deck Data Sources (Backend proxy)

Opsdash proxies Deck data through Opsdash endpoints. The SPA never calls Deck APIs directly.

Primary endpoints (see `opsdash/lib/Controller/DeckController.php`):
- `GET /apps/opsdash/overview/deck/boards` → board list (metadata only).
- `GET /apps/opsdash/overview/deck/cards?from=...&to=...&includeArchived=1&includeCompleted=1` → normalized cards.

Backend sources (see `opsdash/lib/Service/DeckDataService.php`):
- `OCA\Deck\Service\BoardService::findAll(...)` for board metadata.
- `OCA\Deck\Service\StackService::findAll($boardId)` for active stacks + cards.
- `OCA\Deck\Service\StackService::findAllArchived($boardId)` for archived stacks (when available).

Compatibility fallbacks:
- If archived stacks are unsupported by the Deck version, archived stacks are skipped.
- If Deck is unavailable/disabled, Opsdash returns empty lists instead of failing the dashboard.

Filtering rules:
- Cards are included when **due** or **done** timestamps fall inside the requested date range.
- “Undated” cards are still included so manually created items can surface.
- `includeCompleted` and `includeArchived` default to `true` unless disabled in settings.

Auth/headers:
- Opsdash uses the current Nextcloud session (same-origin), no direct Deck headers needed in the SPA.

## Local Seeding
- `apps/opsdash/tools/seed_deck_boards.php` seeds a deterministic board for QA.
- Use it when Playwright or fixtures need stable Deck data.

## Fixtures & Tests
- Fixtures live under `opsdash/test/fixtures/deck-*`.
- Vitest covers Deck service + UI rendering.
