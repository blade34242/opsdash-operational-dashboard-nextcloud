Recurring Events Debug
======================

Use container-local curl if the host port is not exposed:
```bash
docker exec <container> curl -s -u admin:admin \
  -H 'OCS-APIREQUEST: true' \
  'http://localhost/index.php/apps/opsdash/overview/load?range=week&offset=0' | jq .
```

Keep specific seeds/observations in git issues or test fixtures instead of this doc.
