# Opsdash Caching Strategy

This doc is intentionally short. Caching exists today; for open issues and next steps, see `CACHING_REVIEW.md`.

## Current Behavior (summary)
- `/overview/load` uses a server response cache with configurable TTL.
- Cache keys include user, range/offset, selection, and relevant config hashes.
- Debug and save-adjacent requests bypass the cache.
- Core-only payloads are cached separately with a short TTL (capped at 30s) to reduce repeated config/calendars reads.

## References
- `docs-private/opsdash-docs/CACHING_REVIEW.md`
- `docs-private/opsdash-docs/DEV_WORKFLOW.md` (cache toggles)
