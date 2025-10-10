# Documentation Map

A quick guide to the docs that matter most when working on the Operational Dashboard.

## Quick Start
- **DEV_WORKFLOW.md** — day-to-day dev loop (build, containers, cache flushing, seed scripts).
- **CONFIGURATION.md** — runtime behaviour (targets, caps, colors) and key server toggles.
- **API.md** — endpoints exposed by the app (`/load`, `/persist`, `/notes`, `/ping`) with payload shapes.

## Architecture & Code
- **ARCHITECTURE.md** — high-level view of controllers, services, and Vue SPA structure.
- **DIRECTORY_STRUCTURE.md** — what ships in the App Store tarball and why.
- **TARGETS_PLAN.md**, **NEXT_STEPS.md** — current backlog for Targets UI and overall roadmap.

## Operations & Support
- **SEEDING.md**, **CALENDAR_DEV_SETUP.md** — how to prepare data and install calendar app versions for QA.
- **KNOWN_ISSUES.md**, **TROUBLESHOOTING.md** — production quirks, reproduction tips, and fixes (including the Targets summary regression note).
- **OPERATIONS.md**, **PERFORMANCE.md** — operational expectations, caps, and profiling hints.

## Release & Publishing
- **CHANGELOG.md** — user-facing release notes.
- **PACKAGING.md**, **APP_STORE_PUBLISHING.md**, **PUBLISHING_CHECKLIST.md**, **RELEASE.md** — build/sign/upload workflow and review prep.

> Tip: run `npm run build` before packaging so `js/.vite/manifest.json` and `js/assets/main-<hash>.js` stay in sync. All docs assume that hashed build output.
