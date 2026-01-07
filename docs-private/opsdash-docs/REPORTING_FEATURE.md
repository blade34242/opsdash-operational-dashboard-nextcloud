# Reporting Feature

## Current Status
- `reporting_config` is persisted via `/overview/persist`.
- CLI exists: `occ opsdash:report --user=<uid> --range=week --offset=0 --format=json`.
- No delivery pipeline (email/activity) is implemented yet.

## Next Steps (if enabled)
- Decide on delivery channel and build formatter.
- Add fixtures/tests for report payloads.
