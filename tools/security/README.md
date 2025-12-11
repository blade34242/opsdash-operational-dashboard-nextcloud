# Opsdash Security Scripts

## Token retrieval (for POSTs)
Most scripts now scrape the Nextcloud `requesttoken` from the Opsdash overview
page. If you need one manually, run:
```
TOKEN=$(curl -s -L -u admin:admin http://localhost:8088/index.php/apps/opsdash/overview \
  | sed -n 's/.*data-requesttoken=\"\([^\"]*\)\".*/\1/p' | head -n1)
```
Pass `-H "requesttoken: $TOKEN"` on POST requests.

## run_curl_checks.sh
Quick regression script that exercises the high-value REST endpoints using the
white-box pentest scenarios:

```
OPSDASH_BASE=http://localhost:8088/index.php/apps/opsdash \
OPSDASH_USER=admin OPSDASH_PASS=admin \
./tools/security/run_curl_checks.sh
```

What it does:
1. Ensures the backend clamps invalid `range` / extreme `offset`s.
2. Verifies unauthenticated and missing-OCS requests fail (401 / 412).
3. Replays the persist fuzz payload (`targets_*`, theme, HTML) to confirm clamps.
4. Saves a preset with HTML in the name, confirms the sanitized name is used,
   then deletes it (guards against the earlier 500 regression).
5. Posts an HTML note and fetches it back to confirm storage/escaping behavior.

## import_fuzz.sh
Simulates importing an exported sidebar envelope (with an injected `evilKey` and
unknown calendar IDs). The script extracts `.payload` and posts it to
`/overview/persist`, printing the resulting warnings/theme/targets. Use this to
confirm the backend ignores unexpected keys during import.

```
OPSDASH_USER=admin OPSDASH_PASS=admin ./tools/security/import_fuzz.sh
```

The script requires `curl` and `jq`. You can export different credentials (e.g.,
`pentester`) to confirm isolation between users.

## preset_roundtrip.sh
Saves a preset with HTML in its name, verifies the sanitised name + warnings via
`GET /overview/presets/{name}`, and deletes it again. Run this after
`run_curl_checks.sh` to validate the preset lifecycle in isolation.

```
OPSDASH_BASE=http://localhost:8088/index.php/apps/opsdash \
  OPSDASH_USER=admin OPSDASH_PASS=admin \
  ./tools/security/preset_roundtrip.sh
```

## run_notes_csrf.sh
Uses basic auth to load the Opsdash overview, scrape `window.OC.requestToken`,
POST a note with the proper CSRF header, and read it back. Helpful for verifying
notes remain user-scoped and require valid tokens even outside the SPA.

```
OPSDASH_BASE=http://localhost:8088 \
  OPSDASH_APP_PATH=/index.php/apps/opsdash \
  OPSDASH_USER=admin OPSDASH_PASS=admin \
  opsdash/tools/security/run_notes_csrf.sh
```

## check_multi_user.sh
Ensures two different users keep independent selections/configs. Requires two
existing accounts (set `OPSDASH_USER_A/PASS_A` and `OPSDASH_USER_B/PASS_B`). The
script sets unique selections for each user, fetches `/overview/load`, and
verifies the responses differ.

```
OPSDASH_BASE=http://localhost:8088/index.php/apps/opsdash \
  OPSDASH_USER_A=admin OPSDASH_PASS_A=admin \
  OPSDASH_USER_B=pentester OPSDASH_PASS_B=pentest \
  ./tools/security/check_multi_user.sh
```

## preset_export_import.sh
Exports the first available preset via `/overview/presets`, saves the JSON, and
re-imports its payload through `/overview/persist`. Useful to sanity-check that
exported envelopes remain valid inputs.

```
OPSDASH_BASE=http://localhost:8088/index.php/apps/opsdash \
  OPSDASH_USER=admin OPSDASH_PASS=admin \
  ./tools/security/preset_export_import.sh
```

## rerun_onboarding.sh
Replays the current dashboard state through the onboarding payload to verify the
backend accepts wizard submissions (strategy, theme preference, targets, groups).
The script fetches `/overview/load`, builds the persist payload, and posts it to
`/overview/persist`. Override the strategy or theme via `ONBOARDING_STRATEGY`
(`total_only`, `total_plus_categories`, `full_granular`) and `ONBOARDING_THEME`
(`auto`, `light`, `dark`) if you want to simulate a different choice.

```
OPSDASH_BASE=http://localhost:8088/index.php/apps/opsdash \
  OPSDASH_USER=admin OPSDASH_PASS=admin \
  ./opsdash/tools/security/rerun_onboarding.sh
```
## probe_dav_colors.sh
Runs a CalDAV `PROPFIND` against `remote.php/dav/calendars/<user>/<calendar>/` and fails if the `calendar-color`
property is missing or malformed. Useful to catch upstream changes in the Calendar app. Requires the same
`OPSDASH_BASE`, `OPSDASH_USER`, `OPSDASH_PASS` env vars as the other scripts; override `CALDAV_CALENDAR` if needed.

```
  OPSDASH_BASE=http://localhost:8088/index.php/apps/opsdash \
  OPSDASH_USER=admin OPSDASH_PASS=admin \
  ./opsdash/tools/security/probe_dav_colors.sh
```

## check_csrf_missing_token.sh
Posts a note to `/overview/notes` **without** the `requesttoken` header (still
using `OCS-APIREQUEST` and credentials) to see if the payload is stored. Exits 1
and prints the stored fragment if the write succeeds—use this to catch CSRF
regressions on write endpoints.

```
OPSDASH_BASE=http://localhost:8088/index.php/apps/opsdash \
  OPSDASH_USER=admin OPSDASH_PASS=admin \
  ./tools/security/check_csrf_missing_token.sh
```

## Suggested order for a full pass
1. `run_curl_checks.sh` (baseline clamps/auth)  
2. `check_csrf_missing_token.sh` (CSRF guard)  
3. `preset_export_import.sh` (preset lifecycle, uses token scrape)  
4. `import_fuzz.sh` (envelope import ignores evil keys, uses token scrape)  
5. `check_multi_user.sh` (isolation)  
6. `run_notes_csrf.sh` (happy-path CSRF)  
7. `probe_dav_colors.sh` (CalDAV color health)
