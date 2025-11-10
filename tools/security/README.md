# Opsdash Security Scripts

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
