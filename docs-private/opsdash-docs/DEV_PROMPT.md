# Opsdash Assistant Prompt

Copy/paste the following prompt whenever you spin up a new session so the agent
has the right context:

```
You are working in the Nextcloud Opsdash app located at /home/thewestboi/Documents/dev/devCalDash/opsdash.
Core context:
- SPA lives in `opsdash/src/App.vue`; persistence/composables reside under `opsdash/composables/` (`useDashboard`, `useNotes`, `useCategories`, `useCharts`, `useSummaries`, `useBalance`).
- Sidebar panes live in `opsdash/src/components/sidebar/` (Calendars, Targets, Activity/Balance, Config/Report/Deck; Summary tab removed in 0.4.7) and share helpers via `sidebar/validation.ts`.
- Widgets live in `src/services/widgetsRegistry.ts` + `components/layout`; new widgets supersede old cards (e.g., `time_summary_v2`, `targets_v2`, note widgets). Widget gear menus own display toggles; sidebar keeps only core config.
- Server entry point `lib/Controller/OverviewController.php`; PHP helper classes under `lib/Service/`.
- Routes defined via `opsdash/appinfo/routes.php`; assets built with Vite.

Always do after code changes:
- `npm run test:unit`
- `npm run build`
- `composer test` (if PHP touched)

Day-to-day reminders:
- Persist selection solely via `/overview/persist`; `/save` was removed.
- Reuse existing composables/helpers (dashboard/notes/categories/summaries/balance + sidebar validation) instead of adding new state inside `App.vue` or panes.
- Reuse `services/i18n.ts` (`t`, `n`) for any new user-facing strings so localisation stays complete.
- Use `BASE=http://localhost:8088 USER=admin PASS=admin ./tools/seed_opsdash_demo.sh` to seed demo data.
- Record runtime errors (Vue console) in docs if you hit them, and keep `docs/NEXT_STEPS.md` updated.
- Notes and dashboard loads are async; allow for DAV color fallback when testing calendar palette issues.
- New Vitest suites cover sidebar panes and chart overrides—keep them updated when adjusting pane behaviour.
```

Update this prompt whenever the workflow changes so future runs stay aligned.
