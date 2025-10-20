# User Input Validation Plan

## Motivation
Opsdash currently clamps and sanitises user input in ad-hoc ways (e.g. manual
`Number()` casts in Vue, `cleanTargets()` in the controller). This works but
isn’t consistent, provides little feedback, and makes it hard to extend forms.

## Objectives
- Provide a clear validation pipeline across client and server.
- Surface helpful inline feedback when values are rejected.
- Keep the API resilient against malformed payloads.
- Maintain Nextcloud CSRF/security constraints.

## Current Gaps
- **Client:** Inputs silently ignore invalid numbers; no error states or helper
  text. Each field implements its own clamp logic.
- **Server:** `ConfigDashboardController` sanitises payloads but lacks schema
  definitions or structured error responses.
- **Docs:** No guidance for contributors on adding inputs safely.

## Proposed Approach
1. **Audit Inputs**
   - Catalogue all editable fields (sidebar targets, pace options, notes editor,
     upcoming onboarding wizard).
   - Document expected ranges/types in a shared table.

2. **Shared Validation Utilities**
   - Introduce `src/services/validators.ts` with reusable helpers (number range,
     boolean toggles, string trimming, category IDs).
   - Provide structured issue reporting via `validateNumberField()` on the client
     and mirror enforcement in PHP with `lib/Service/Validation/NumberValidator`.
   - Replace ad-hoc clamps with these helpers to ensure consistent behaviour.
  - Share pane-level helpers in `src/components/sidebar/validation.ts` so UI panes reuse the same numeric workflow.
   - On PHP side, add a `Validation` trait or helper class that mirrors the
     rules (possibly leveraging typed DTOs).

3. **Inline Feedback**
   - Extend sidebar components to show validation messages/tooltips (e.g.
     “Enter a value between 0 and 1000”).
   - Highlight invalid fields with error styles (following NC design tokens).
   - Prevent `queueSave` until fields are valid.

4. **Server Responses**
   - When a payload fails validation, return a structured 400 response with
     details (`field`, `expected`, `received`).
   - Update client to read these errors and display them near inputs/toasts.

5. **Schema Documentation**
   - Add a section to `docs/API.md` and `docs/CONFIGURATION.md` describing input
     expectations, including units and conversions (week↔month).

6. **Testing**
   - Unit tests for validator utilities (Vitest).
   - Integration tests for controller endpoints with malformed payloads.
   - UI tests covering inline feedback (Cypress or Vue Test Utils).

7. **Roll-out**
   - Stage the work per input cluster (targets, balance options, onboarding).
   - Coordinate with onboarding and theming timelines so validation changes
     land before or alongside new forms.
   - Kick off with shared validator skeletons (TS + PHP) wired into at least one sidebar input to unblock incremental adoption.
   - Status (2025-10): Sidebar numeric inputs run through the shared validator + `sidebar/validation.ts`; controller sanitisation mirrors the same constraints. Next step: surface structured 400 responses and localise user-facing messages.

## Open Questions
- Provide localisation for error messages out of the box?
- How strict should API errors be for legacy saved configs (migration needs)?
