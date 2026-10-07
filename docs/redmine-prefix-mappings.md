# Redmine prefix mappings

## Problem and choice

Imported logs can share a task-code prefix while needing the same Redmine issue.
Users can map `CE-*` to one issue and `CTV-*` to another across all imported dates.
Rules are remembered in this browser for the selected profile, Redmine server and
user. Applying rules is explicit; editing a rule never submits worklogs remotely.

The rules live in a modal opened by **Redmine mappings** on the left of the
Jira/ClickUp/Redmine submit row. A badge shows the number of saved rules. The page
header is unchanged, and the action row wraps within a narrow viewport.

## Change

- Detect exact, case-insensitive prefixes at the start of a description.
- Validate saved targets against currently available Redmine issues.
- Preview affected cards and optionally fill only empty Redmine fields.
- Explain live prefix detection in the modal and both empty-only modes in a
  hover/focus tooltip beside the checkbox; rules apply only on explicit Apply.
- Apply across dates, synchronize existing card fields, close the modal, and
  restore focus to its trigger. Closing the modal keeps edited rules saved but
  does not apply them to cards.
- Use 6 px vertical/horizontal scrollbars; tabs retain normal page scrolling.

## Validation — 2026-10-07

- 19 focused Node tests passed: existing task matching, prefix mapping and
  profile-scoped persistence.
- Targeted ESLint and production Vite build passed.
- Browser demo: CE mapped three cards (including one existing assignment) and
  CTV mapped two on different dates. The empty-only option previewed four changes.
- Browser reload restored rules; a second profile showed no inherited mappings.
- Modal dropdown selection, apply/close, focus return and zero repeat changes
  verified. Modal and action-row bounds checked at a 390 px viewport.
- Desktop screenshots: `/tmp/redmine-mappings-button.jpg` and
  `/tmp/redmine-mappings-modal.jpg` (demo data, not production worklogs).

## Delivery

Implemented and verified locally. Current prefix-mapping/modal changes have not
been pushed or deployed; the previous Jira/ClickUp matching release remains live.

## Help and footer polish

- Added hover/focus help beside the empty-only checkbox and clarified that the
  prefix list updates from imported, added or edited cards; Apply stays explicit.
- Verified the tooltip through a real pointer hover in the local browser.
- GitHub footer link gently highlights twice during the first 4.8 seconds of a
  60-second cycle, after an initial 12-second delay. No movement or external
  navigation is automatic. Hover/focus stops the effect; reduced-motion disables
  it (verified through browser media emulation, then reset).
- Focused lint: no errors; existing App auth-effect dependency warning remains.
  Production build and whitespace validation passed. Changes remain local.
