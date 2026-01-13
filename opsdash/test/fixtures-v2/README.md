# Test Fixtures (v2)

These fixtures mirror `test/fixtures` but are writable in this workspace and
reflect the current API payload (notably `meta.uid` is removed from `/overview/load`).

Use these files in unit/integration tests:

```
import loadWeek from '../fixtures-v2/load-week.json'
```
