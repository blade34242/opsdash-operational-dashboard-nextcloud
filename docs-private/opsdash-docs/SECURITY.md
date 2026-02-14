# Security Guidelines

## Threat Model
- Only authenticated users can access data; all storage is per-user.
- Calendar IDs are intersected with the user's calendars; spoofed IDs are ignored.
- Read endpoints are strictly side-effect free; write endpoints require POST + CSRF.

## Controls
- CSRF: POST endpoints (`/overview/persist`, `/overview/notes`, `/overview/presets`) require `requesttoken`.
- Input validation: clamp `range`, `offset`, groups (0-9), ID lengths; notes length capped (32k).
  - Targets clamped to 0-10000 hours per calendar (decimals allowed).
  - Offset clamped to +/-24 weeks/months.
- Output encoding: Vue escapes all text fields; no HTML rendering from user input.
- Colors: normalized to `#RRGGBB` to avoid CSS injection.
- Logging: Debug logs avoid sensitive data; no raw request parameters echoed.

## DoS Mitigations
- Aggregation caps per calendar and per request; `meta.truncated` indicates partial results.
- Request limits: JSON bodies capped at 256 KB with depth 16; GET query strings capped at 4096 bytes.
- Drawing throttled on the client; no `ResizeObserver` feedback on `body`.

## CSP
- No inline scripts; CSS extracted and loaded via `Util::addStyle`.
- Template fallback currently includes a small inline `<style>` block for the boot skeleton.
- Remaining dynamic styles are limited to color dots; consider palette classes if strict CSP forbids inline styles.

## Recommendations
- Keep debug level off in production.
- Consider app-level rate limiting for expensive ranges.
- Continue removing inline styles in templates; prefer CSS classes.
- Consider adding Web Application Firewall (WAF) rules to throttle abusive clients on read endpoints.
