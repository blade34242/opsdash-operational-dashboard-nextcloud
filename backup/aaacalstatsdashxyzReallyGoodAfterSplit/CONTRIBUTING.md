# Contributing Guide

Thanks for your interest in improving this app! A few guidelines:

## Development
- Requirements: Node.js 18+, Nextcloud 32.
- Install deps: `npm ci`
- Build: `npm run build` (outputs `js/main46.js`)
- Dev: `npm run dev` for frontend iteration (build for NC integration).

## Coding Standards
- PHP: PSR-12, strict types where possible, thin controllers, logic in services.
- TypeScript: strict mode; avoid `any`; keep components small (<150 LOC).
- Security: never add state changes to read endpoints; POST+CSRF for writes.
- CSP: no inline scripts; minimize inline styles (prefer CSS classes/files).

## Commits & PRs
- Keep PRs scoped; include tests or testing steps.
- Update docs (API/SECURITY/CHANGELOG) when behavior changes.
- Describe any performance impact and migration notes.

## Tests (recommended)
- Server: selection filtering, group clamps, offset bounds, truncation meta.
- Client: `useRange`, `useNotes`, API client, chart draw scheduling.

## Reporting Issues
- Include NC version, app version, steps to reproduce, and server logs (sanitized).
