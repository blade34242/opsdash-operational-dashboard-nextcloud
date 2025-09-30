# Calendar App Setup for Dev Stacks

To seed data and test charts, install the Nextcloud Calendar app matching the server version in each dev container.

Steps (example)
1) Download calendar tarballs on your host:
- NC 30/31 → `calendar-v5.5.5.tar.gz`
- NC 32 → `calendar-v6.0.0.tar.gz`

2) Copy to containers
```
docker cp calendar-v5.5.5.tar.gz nc30-dev:/var/www/html/apps/
docker cp calendar-v6.0.0.tar.gz nc32-dev2:/var/www/html/apps/
```

3) Extract, set ownership, enable
```
# NC 30
docker exec nc30-dev bash -lc 'cd /var/www/html/apps && tar -xzf calendar-v5.5.5.tar.gz && chown -R www-data:www-data calendar'
docker exec -u www-data nc30-dev php /var/www/html/occ app:enable calendar

# NC 32
docker exec nc32-dev2 bash -lc 'cd /var/www/html/apps && tar -xzf calendar-v6.0.0.tar.gz && chown -R www-data:www-data calendar'
docker exec -u www-data nc32-dev2 php /var/www/html/occ app:enable calendar
```

4) Seed data
- Create 10 calendars per instance:
```
BASE=http://localhost:<port> USER=admin PASS=admin ./tools/create_calendars.sh
```
- Seed this week (TOTAL=40):
```
BASE=http://localhost:<port> USER=admin PASS=admin TOTAL=40 ./tools/seed_week_multi.sh
```
- Seed this month (TOTAL=250; e.g., September):
```
YEAR=$(date +%Y) BASE=http://localhost:<port> USER=admin PASS=admin YEAR=$YEAR MONTH=09 TOTAL=250 ./tools/seed_month_multi.sh
```

Notes
- Adjust container names/ports accordingly (`nc30-dev:8086`, `nc32-dev2:8092`).
- The seeding scripts use CalDAV; ensure login works and the app is enabled.

