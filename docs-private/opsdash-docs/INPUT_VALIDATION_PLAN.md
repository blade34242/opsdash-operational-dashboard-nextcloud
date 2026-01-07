# User Input Validation

## Current State
- Client uses shared helpers (`src/services/validators.ts`, `src/components/sidebar/validation.ts`) for numeric clamps.
- Server sanitises inputs via `PersistSanitizer` and echoes the cleaned payload.
- No structured 400 validation payloads are returned today.

## When Editing Inputs
- Keep client and server ranges aligned.
- Prefer shared helpers over inline clamps.
- Update `API.md` if payload shape changes.

## Future Work (optional)
- Structured validation errors (if UX needs inline error reporting).
