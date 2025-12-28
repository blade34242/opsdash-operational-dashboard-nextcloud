# Caching Review — Problems, Solutions, Options

This doc captures the current caching behavior, observed problems, and the
available options to improve correctness/performance. Use it as a decision
record for next steps.

## Current State
- Opsdash `/overview/load` uses a server response cache in
  `opsdash/lib/Controller/OverviewController.php`.
- Cache key includes: user ID, range, offset, selection hash, and a config hash
  (groups + targets + reporting + deck settings).
- Cache TTL is configurable; debug/save requests bypass it.
- Frontend Deck cards are memoized per range in `useDeckCards`.

## Problems / Risks
1) Stale data on calendar edits
   - Calendar events change, but the cache only expires by TTL.
   - No invalidation hook from CalDAV changes.

2) Cache-key explosion
   - Config hash includes many settings. Small UI changes cause cache misses,
     even if the load payload is unaffected.

3) Ordering sensitivity risk
   - If `selectedIds` ordering is inconsistent, identical selections can hash
     differently.

4) No HTTP revalidation
   - Browser always fetches fresh responses; server cache helps CPU but not
     network latency.

5) Missing visibility
   - Hard to validate caching effectiveness without explicit hit/age metrics.

## Options (with Pros/Cons)
### Option A — Keep TTL-only response cache (status quo)
- Pros: simple, already implemented.
- Cons: stale data until TTL; higher cache-key churn.

### Option B — Add per-calendar change tokens to cache key
- Pros: invalidates cache when calendar changes.
- Cons: requires fetching getctag/sync-token for each selected calendar.
- Status: Tested via CalDAV PROPFIND on a calendar URL; getctag + sync-token
  are available per calendar but NOT on the collection root.

### Option C — Reduce config hash to only load-relevant fields
- Pros: fewer cache misses for unrelated UI tweaks.
- Cons: requires auditing which config fields impact `/overview/load`.

### Option D — Client-side memoization for `/overview/load`
- Pros: reduces repeat calls in a single session.
- Cons: does not reduce server work unless combined with Option B or HTTP cache.

### Option E — HTTP ETag/Cache-Control
- Pros: browser revalidation reduces bandwidth.
- Cons: needs reliable token (CTag/sync-token) or stable ETag on payload.

## Concrete Findings (from local checks)
- CalDAV PROPFIND on the collection root (`/remote.php/dav/calendars/<user>/`)
  returns 404 for `getctag` and `sync-token`.
- CalDAV PROPFIND on a specific calendar
  (`/remote.php/dav/calendars/<user>/<calendar>/`) returns both `getctag` and
  `sync-token`.
- Therefore, per-calendar tokens are viable but require per-calendar calls or a
  server-side access path.

## Recommended Next Steps
1) Sort `selectedIds` before hashing to avoid ordering-based cache misses.
2) Reduce `configHash` inputs to only data used by `/overview/load`.
3) Add per-calendar change tokens to the cache key, if we can retrieve them
   efficiently server-side (avoid extra CalDAV round-trips).
4) Expose `meta.cacheHit` and `meta.cacheAge` in the payload to validate cache
   behavior in QA.

## Open Questions
- Can we access calendar sync tokens server-side (via DAV backend or
  ICalendar metadata) without per-calendar PROPFIND calls?
- Which config fields are truly required to build `/overview/load`?
- What TTL is acceptable for Opsdash data freshness (30s? 60s? 120s)?
