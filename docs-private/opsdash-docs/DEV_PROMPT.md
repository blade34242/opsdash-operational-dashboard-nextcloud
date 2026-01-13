# Opsdash Assistant Prompt

Copy/paste the following prompt whenever you spin up a new session so the agent
has the right context:

```
You are working in the Nextcloud Opsdash app located at /home/thewestboi/Documents/dev/devCalDash/opsdash.
Core context:
- SPA entry: `opsdash/src/App.vue`
- Composables: `opsdash/composables/*` (dashboard load/persist/selection/profiles, notes, charts, summaries)
- Sidebar shell: `opsdash/src/components/sidebar/Sidebar.vue` (panes under `opsdash/src/components/sidebar/`).
- Widgets: `opsdash/src/services/widgetsRegistry/*` and `opsdash/src/components/widgets/*` (cards/charts/notes/deck/text).
- Chart primitives: `opsdash/src/components/charts/*`; tables/panels in `opsdash/src/components/tables/*` and `opsdash/src/components/panels/*`.
- Backend: `opsdash/lib/Controller/*`, helpers in `opsdash/lib/Service/*`
- Routes: `opsdash/appinfo/routes.php`, assets built with Vite.

Reminders:
- Writes go through `/overview/persist` (CSRF required).
- Prefer existing composables/helpers over new state in `App.vue`.
- Keep user-facing strings in `services/i18n.ts` (`t`, `n`).
- Use `tools/seed_opsdash_demo.sh` for demo data if needed.
```

Update this prompt whenever the workflow changes so future runs stay aligned.
