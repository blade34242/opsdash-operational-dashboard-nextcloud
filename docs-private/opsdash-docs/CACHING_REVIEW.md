# Caching Review

## Current State
- `/overview/load` uses a server response cache (see `OverviewController.php`).
- Cache key includes user, range/offset, selection hash, and config hash.
- TTL is configurable; debug/save requests bypass it.

## Risks
- Stale data until TTL expires.
- Cache misses caused by unrelated config changes.
- Ordering changes in selected IDs can alter the cache key.

## Notes
- CalDAV `getctag`/`sync-token` exist per calendar, not on the collection root.

## Next Steps (shortlist)
1) Normalize selected IDs before hashing.
2) Reduce config hash to only load-relevant fields.
3) Add cache hit/age fields to the payload for QA visibility.
4) Revisit per-calendar tokens if server-side access is cheap.
