# Test Fixtures

Store anonymised payloads from a real Nextcloud instance here so integration
tests can replay realistic `/overview` responses without hitting the server.

## Capture Checklist

1. **Start** your local/staging Nextcloud with Opsdash enabled and seeded with
   representative calendars/targets.
2. **Grab request token** from the web UI (or run within the NC container where
   `OCS-APIREQUEST` is sufficient).
3. **Load payloads**
   ```bash
   curl -sS -u admin:admin \
     -H "OCS-APIREQUEST: true" \
     -H "requesttoken: <token>" \
     "http://localhost:8088/index.php/apps/opsdash/overview/load?range=week&offset=0" \
     > test/fixtures/load-week.json

   curl -sS -u admin:admin \
     -H "OCS-APIREQUEST: true" \
     -H "requesttoken: <token>" \
     "http://localhost:8088/index.php/apps/opsdash/overview/load?range=month&offset=0" \
     > test/fixtures/load-month.json
   ```
   Repeat with `offset=-1`/`1` if forecasts depend on previous/next periods.
4. **Persist response**
   - In the UI, adjust selections/targets and capture the POST body (e.g. via
     DevTools) or manually craft one.
   - Send it to `/overview/persist`, saving the response:
     ```bash
     curl -sS -u admin:admin \
       -H "OCS-APIREQUEST: true" \
       -H "requesttoken: <token>" \
       -H "Content-Type: application/json" \
       -d @test/fixtures/persist-request.json \
       "http://localhost:8088/index.php/apps/opsdash/overview/persist" \
       > test/fixtures/persist-response.json
     ```
5. **Anonymise** IDs/names if needed (`cal-1`, `Focus Week`, …) before committing.
6. Ensure files stay small; trim arrays if the full payload is huge (keep the
   structure intact).

Integration suites can now import these fixtures directly, e.g.:
```ts
import loadWeek from '../fixtures/load-week.json'
```
- Added offset fixtures (week/month) to cover previous/next periods.
- `load-week-offset-1.json` (offset -1)
- `load-month-offset1.json` (offset +1)
- `load-week-offset2.json` (offset +2 with multiple calendars selected)
- `load-month-multiuser.json` (month view with multiple calendars)
- `preset-export.json` (Config & Setup export envelope)
- `onboarding-export.json` (Config & Setup export including onboarding snapshot)
- `persist-response.json` (sanitised `/overview/persist` response)
- `notes-week.json` (GET `/overview/notes` sample; also used for `/overview/persist` minimal fixture)
