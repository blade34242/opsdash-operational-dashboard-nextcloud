# Onboarding Workflow Specification

This document defines the first-run experience for the Opsdash app. It expands 
on the target strategy selector and captures all UX and technical requirements 
needed to guide new users toward a useful initial configuration.

## Objectives
- Help new users understand what Opsdash offers within 60 seconds.
- Capture enough preferences to produce meaningful dashboard data without 
  overwhelming users.
- Offer clear escape hatches (skip, change later) while nudging toward best 
  practices.
- Persist onboarding choices via the existing `/persist` endpoint so the flow 
  never repeats unnecessarily.

## User Stories
- *As a new user*, I want a quick explanation of what Opsdash does so that I 
  know why I should continue.
- *As a goal-driven user*, I want to select the target complexity that matches 
  my workflows (total only, categories, calendars) so that my dashboard stays 
  actionable.
- *As an admin/tester*, I want to reset onboarding state for QA or support.
- *As a returning user*, I want to bypass onboarding instantly, while still 
  being able to change the chosen profile later.

## Entry Conditions
- Triggered the first time `load()` returns without an onboarding flag in the 
  persisted payload.
- Also triggered when the stored onboarding version is lower than the client’s 
  expected version (to allow future expansion).
- Exposed via a manual entry point (`?onboarding=reset` query parameter) to 
  support testing/support.

## High-Level Flow
1. **Intro Screen**
   - Brief summary (e.g., “Opsdash visualizes your calendar workload.”).
   - List of highlights (Targets, Balance, Notes).
   - `Get started` primary action, `Maybe later` secondary (skip sets default 
     profile and marks onboarding complete).
   - If an existing configuration is detected, display a reminder to save a preset first (button triggers the same save flow as Config & Setup → “Save current configuration”).
2. **Target Strategy Step**
   - Presents the strategies described in `TARGET_STRATEGIES.md`.
   - Each strategy card includes: recommended audience, quick bullet benefits, 
     preview illustration or icon, default configuration summary.
   - Selecting a card reveals strategy-specific inputs (e.g., total hours).
   - `Continue` becomes enabled after selection.
3. **Calendar Selection Step**
   - Pulls available calendars and highlights recommended defaults (e.g., work 
     calendars pre-selected).
   - Shows progress indicator (`Step 2 of 4` when categories are enabled).
4. **Categories & Targets Step** (strategies with categories)
  - Users can create/rename categories, assign weekly targets, and toggle weekend inclusion.
  - Selected calendars can be mapped to categories before first load.
  - Category rows inherit suggested colours from mapped calendars (fallback palette matches Nextcloud); users can tweak them before completing onboarding.
5. **Preferences Step**
  - Theme selector (`Follow Nextcloud`, `Force light`, `Force dark`) with guidance that charts keep calendar colours; applies once onboarding completes.
  - Input for total weekly target (editable for total-only strategies, read-only summary when categories are active).
  - All-day event hours control (default 8 h) so multi-day all-day events align with expected workloads.
6. **Review & Confirm**
   - Summary of choices: strategy, selected calendars, targets seeded, weekend 
    handling, balance hints, theme preference, and all-day setting.
   - `Start dashboard` finalizes choices and writes them via `/persist`.
   - Optional `Back` and `Skip for now`.
7. **Completion Toast**
   - “Setup saved — you can change this later in the Sidebar.”
   - Automatically scroll/focus the main dashboard.

## Data & Persistence
- Extend persisted payload with:
  ```json
  {
    "onboarding": {
      "completed": true,
      "version": 1,
      "strategy": "total_only",
      "completed_at": "2025-01-12T10:15:00Z"
    }
  }
  ```
- When missing or `version < current`, prompt onboarding.
- Store the initial target/weekend/category choices using existing fields 
  (`targets_week`, `targets_month`, `targets_config`, `groups`).
- Include a UI toggle in Sidebar → Config & Setup: “Re-run onboarding”.

## Content Requirements
- Intro copy: “Opsdash visualises your calendar time and keeps goals on track.”
- Highlights: Targets · Balance · Notes.
- Use placeholder illustrations/icons for the MVP; final artwork arrives later. No localisation in phase 1.
- Wizard FAQ: “Can I change this later? Yes — open Sidebar → Targets.”

## Out of Scope (v1)
- Team onboarding (track separately).
- Importing historical targets (future enhancement).

## Decisions (2025-03)
- Demo data stays out of scope. Surface the hint “Make sure your calendars contain recent events so charts have data.” during onboarding instead of seeding demo events.
- The wizard inherits dashboard theme tokens once Phase 1 theming ships; no bespoke palette work before that milestone.
- Calendar-day goal conversion remains a backlog item to revisit after the initial onboarding release stabilises.

## Next Steps
- Finalize copy and illustrations.
- Implement onboarding modal wizard (Vue component).
- Add persistence keys and server migration for onboarding flag.
- QA across desktop/mobile, light/dark themes (see theming spec).
