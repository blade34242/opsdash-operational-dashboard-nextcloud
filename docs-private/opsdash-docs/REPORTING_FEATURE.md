# Reporting Feature Concept

## Idea
Allow Opsdash to generate a weekly/monthly summary report (targets vs actuals, balance insights, notes) and deliver it via Nextcloud-native channels (Activity feed, email, or Deck comments).

## Why
- Stakeholders who don’t log into Opsdash daily still get visibility.
- Team leads can share Opsdash stats in recurring updates without screenshots.

## Delivery Options
1. **Activity Notification**: use Nextcloud’s Activity API to post a "Opsdash weekly report" entry with key metrics and a link back.
2. **Email summary**: leverage `
OC_Mail` to send a templated HTML email (respecting Nextcloud mail settings).
3. **Deck comment hook**: optional; post the summary to a Deck card/comment for teams who manage work in Deck.

## Contents
- Range covered (Week X / Month Y).
- Total hours vs target; top categories; pacing badge summary.
- Balance highlights (e.g., over/under focus areas).
- Latest note text.

## Implementation Thoughts
- Reuse existing `/overview/load` payloads; build a formatter that extracts the most relevant data.
- Add a CLI command (`php occ opsdash:report --range=week --user=<uid>`) and wire it to a cron job.
- Store report history or simply log delivery to avoid duplicates.

## Next Steps
1. Prototype the CLI command with mock payloads and log output (no delivery yet).
2. Capture report fixtures (week/month) once the formatter is stable so Vitest/PHPUnit can validate the schema.
3. Add user-level toggles in Config & Setup (“Email me weekly report”).
4. Decide on the first delivery channel (Activity vs Email) and document data retention expectations.

## Open Questions
- Should users opt-in per account? (Likely via Config & Setup toggle.)
- What cadence do we support initially (weekly only?).
- Translation needs once the feature stabilises.
