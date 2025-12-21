# Opsdash Caching Strategy

Single reference for how we approach caching across the dashboard stack. Captures today's behaviour, candidate optimisations, and the near‑term plan (Option 1) so engineering + QA stay aligned.

---

## 1. Current Behaviour
- `App.vue` → `useDashboard` → `/apps/opsdash/overview/load`: every range/offset/selection change issues a fresh request; PHP recomputes stats from raw CalDAV rows each time.
- Only Deck cards use memoization (`useDeckCards` caches per range). Everything else—KPIs, charts, targets, Balance/Activity trend history—recomputes on every load.
- No HTTP caching headers (ETag/Cache-Control). Browser always refetches.
- Server side has no `ICacheFactory` usage yet; every load hits CalDAV + aggregation.

## 2. Options Considered
| Option | Description | Pros | Cons / Risks | Fit |
| --- | --- | --- | --- | --- |
| 1. Response cache *(Selected)* | Wrap `/overview/load` response in `ICacheFactory` (APCu/Redis) keyed by `uid + range + offset + selection-hash`, short TTL (30‑120 s). | Immediate drop in redundant work when users bounce between offsets, minimal complexity, cheap invalidation by including selection + config versions. | Needs TTL + key hygiene to avoid stale payloads; must bypass when `save=true` (even though load ignores save). Add monitoring. | ✅ Shipping next. |
| 2. Per-calendar event cache | Cache normalized CalDAV rows per `(calendar, from, to)` and rebuild aggregates from cached rows. | Allows mixing/matching selections without re-querying CalDAV. | Complex invalidation (CalDAV changes, deletions), higher memory footprint, slower ROI. | Later if needed. |
| 3. Background materialisation | Cron job precomputes week/month ± offsets; `/load` reads prebuilt blobs. | Zero runtime work for common offsets, predictable cost. | Needs storage, scheduling, and invalidation for “just created an event” flows; harder to debug. | Maybe after Option 1 metrics. |
| 4. HTTP caching (ETag) | Use calendar `CTag`/sync token to emit ETag; browsers revalidate cheaply. | Works even without server cache, standard behaviour. | Requires reliable change token across all calendars; not available everywhere. | Track after Option 1. |
| 5. Client memoization/prefetch | Keep payloads in `useDashboard` for current session; prefetch adjacent offsets. | Improves perceived speed even without server cache. | Doesn’t reduce server cost unless combined with revalidation flag. | Nice-to-have. |

## 3. Selected Approach — Response Cache
1. Use Nextcloud’s `ICacheFactory` to obtain a per-user cache backend (APCu or Redis). Namespace key: `opsdash:load:<uid>:<range>:<offset>:<selectionHash>:<targetsVersion>:<deckVersion>`.
2. Cache the entire JSON response **after** computing stats, including metadata (from/to, colors, charts).
3. TTL: start with 60 s. Respect environment variable override (`OPSDASH_CACHE_TTL`).
4. Bypass cache when:
   - Request explicitly sets `save=true` (even though load ignores writes).
   - Selection array is empty but no saved selection exists (first-run autoload). Avoid caching to prevent mixing users.
   - Debug flag enabled (`debug=true`)—developers can see live data.
5. Invalidate implicitly by keying on selection hash + config versions (targets, deck, reporting). When user changes selection or we deploy new config shape, key changes and cache misses.
6. Log cache hit/miss counters (debug log level when `isDebugEnabled()` is true) for operational insight.

## 4. Implementation Checklist
1. Inject `ICacheFactory` into `OverviewController` and plumb `IUserSession` UID into key builder.
2. Serialize the payload once; before returning, store `(payload, storedAt)` in cache keyed by entry above.
3. On new request:
   - Build key → check cache → if hit, return cached payload + refresh metrics.
   - If miss, run current aggregation, store result, then respond.
4. Add config flag (app config + env) to disable caching (fallback for debugging).
   - `OPSDASH_CACHE_ENABLED=0` or `occ config:app:set opsdash cache_enabled --value=0`
5. Update `DEV_WORKFLOW.md` + `TROUBLESHOOTING.md` with “how to flush cache” instructions (e.g., `occ config:app:set opsdash cache_ttl 0` or `redis-cli FLUSHDB` if dedicated namespace).

## 5. Testing Plan
### PHP (PHPUnit)
- Unit test key builder to ensure selection order doesn’t affect hash; verify TTL/respect for debug flag.
- Functional test for controller: inject fake cache backend, make two requests with identical params and assert second call hits cache.
- Test negative cases: change selection, change offset, set debug flag → should miss.

### SPA / Integration
- Add Vitest test that mocks `/overview/load` to simulate cached payload (optional, mostly for telemetry).
- Playwright scenario: load current week, switch to previous week and back; with cache enabled, second “current week” call should include `meta.cacheHit=true` (add optional flag to payload to assert).

### Manual QA
- Enable caching, capture `/overview/load` response time via browser devtools before/after.
- Flip `debug` in sidebar (if available) to ensure cache bypass.

## 6. Future Work
- Implement Options 2–4 only if telemetry shows response cache isn’t enough.
- Consider exposing cache stats in `/overview/ping` for monitoring.
- Optionally add client-side memoization (prefetch offset ±1) once server cache is stable.

Keep this document updated as we iterate on caching layers.
