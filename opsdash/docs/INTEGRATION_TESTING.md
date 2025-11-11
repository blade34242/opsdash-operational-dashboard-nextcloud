# Integration Testing (Calendar API)

Opsdash leans heavily on Nextcloud's Calendar stack. The SPA drives two
families of requests:

1. **App endpoints** — `/apps/opsdash/overview/load`, `/persist`, `/presets/*`
   served by `OverviewController`.
2. **Calendar endpoints** — CalDAV `PROPFIND` calls under
   `/remote.php/dav/calendars/<uid>/<calendarId>/` to read per-calendar
   metadata such as `calendar-color`, and deep links to
   `/apps/calendar/timeGridDay/...`.

This guide describes how to exercise those dependencies end-to-end locally or
in CI so we do more than unit-test the parsing helpers.

## 1. Reuse the Nextcloud server checkout

The GitHub Action already clones `nextcloud/server@stable31` (and in preview,
`stable30/32`) before syncing Opsdash into `server/apps/opsdash`. Use that exact
flow locally when you need a reproducible integration rig:

```bash
# 1) clone server
git clone --depth=1 --branch stable31 https://github.com/nextcloud/server.git nc-server

# 2) copy opsdash into apps/
rsync -a ../opsdash nc-server/apps/opsdash

# 3) install Nextcloud
cd nc-server
php occ maintenance:install --database=sqlite \
  --database-name=nextcloud --admin-user admin --admin-pass admin
php occ app:enable calendar
php occ app:enable opsdash
```

Because this matches CI, any failures you see locally will reproduce on GitHub
without extra environment drift.

## 2. Seed deterministic calendar data

Opsdash dashboards are only as useful as the calendars feeding them. Use OCC to
create fixtures instead of clicking through the Calendar UI:

```bash
# create a QA user so we don't mangle the admin calendars
php occ user:add --password-from-env qa
export OC_PASS=qa-secret
# Calendar app has a CLI helper for CalDAV
php occ dav:create-calendar qa opsdash-week "Opsdash Week" --color="#7DAFFF"
php occ dav:create-calendar qa opsdash-month "Opsdash Month" --color="#FFB347"
# import events from ICS fixtures committed under tools/seed/
php occ dav:import qa opsdash-week apps/opsdash/tools/seed/fixtures/week.ics
php occ dav:import qa opsdash-month apps/opsdash/tools/seed/fixtures/month.ics
```

If you prefer curl-based seeding, hit the CalDAV endpoint directly:

```bash
curl -u qa:${OC_PASS} -T week.ics \
  "$BASE_URL/remote.php/dav/calendars/qa/opsdash-week"
```

Either approach guarantees:
- Known calendar IDs (`opsdash-week`, `opsdash-month`).
- Predictable colors (`#7DAFFF`, `#FFB347`) for the `fetchDavColors` helper.
- Repeatable load/persist payloads that mirror production.

💡 Track fixture expectations in `test/fixtures/README.md` so Vitest suites can
consume the same data when mocking fetch calls.

## 3. Scripted API checks (curl + devtools)

Once calendars exist, validate both the Opsdash endpoints and the Calendar API
from the command line before wiring automation:

```bash
OPSDASH_BASE=http://localhost:8080/index.php/apps/opsdash
curl -sS -u admin:admin -H 'OCS-APIREQUEST: true' \
  "$OPSDASH_BASE/overview/load?range=week&offset=0" | jq '.charts'

# Persist flow (requires CSRF token)
TOKEN=$(php occ config:system:get secret --output=json)
curl -sS -u admin:admin \
  -H "requesttoken: $TOKEN" -H 'OCS-APIREQUEST: true' \
  -d '{"selected": ["opsdash-week"]}' \
  "$OPSDASH_BASE/overview/persist"

# Calendar color fetch (matches useCalendarLinks.fetchDavColors)
curl -sS -u qa:${OC_PASS} -X PROPFIND \
  -H 'Depth: 0' -H 'Content-Type: application/xml' \
  -d '<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:ical="http://apple.com/ns/ical/"><d:prop><ical:calendar-color/></d:prop></d:propfind>' \
  "$BASE_URL/remote.php/dav/calendars/qa/opsdash-week/"
```

Keep browser devtools open while exercising the dashboard. Console traces and
network HAR exports help when Playwright reports `[opsdash] Vue error`.

## 4. Automate as "integration tests"

With deterministic calendars and curl probes in place, wire them into tests:

1. **Vitest harness (short term).**
   - Record the `overview/load` and CalDAV responses under `test/fixtures/`.
   - Add `test/integration/*.test.ts` suites that spin up `useDashboard`
     against those fixtures via `fetch` mocks. This ensures Opsdash handles
     real payloads while still running fast.

2. **Full end-to-end (medium term).**
   - Extend Playwright to log in as `qa`, switch to the seeded calendars, and
     assert that charts/cards match fixture totals. Because CI already boots
     Nextcloud, only the seeding step is missing.
   - Consider a nightly job that seeds via OCC before running the smoke tests
     so release branches catch Calendar regressions early.

3. **Optional CalDAV contract tests.**
   - Use `caldavtester` or the Nextcloud Calendar app's integration tests as a
     reference to verify that PROPFIND parsing survives future server changes.
   - Track known server versions (NC 30/31/32) in the matrix and pin fixtures
     per version if the server outputs different color formats (`#RRGGBB` vs
     `rgba()`).

## 5. Best practices & gotchas

- Always enable the official Calendar app in the test instance; CalDAV routes
  are not exposed otherwise.
- Keep credentials out of scripts—read them from env vars (`PLAYWRIGHT_USER`,
  `PLAYWRIGHT_PASS`, `OC_PASS`).
- When recording fixtures, strip personal data and replace calendar IDs with
  placeholders (`cal-1`, `opsdash-week`).
- If you need to debug CalDAV manually, use `cadaver` or `curl -X PROPFIND`
  with `Depth: 0` like `fetchDavColors` does.
- Update `docs/TESTING_IMPROVEMENT_PLAN.md` after each milestone so the team
  knows which parts of the plan are complete.

Following this flow mirrors what other Nextcloud apps (Deck, Calendar, Notes)
perform in their CI pipelines: bootstrap Nextcloud, seed data via OCC, then run
API-level or browser tests for the workflows that matter.
