# Compare another person's worklogs

- Problem: Compare could only show the signed-in user. Taras wants to pick a colleague and compare that person's Redmine, Jira and ClickUp logs, using the API keys already in his presets.
- This is the Compare-only first step of [manager-mode.md](manager-mode.md).

## Choice
- **"Whose logs" picker:** a Redmine autocomplete over the active preset. Options read "Name · email".
  - It tries the admin-only `/users.json?name=` first.
  - On 401/403 it builds a member directory once per session from `/projects.json` and `/projects/:id/memberships.json` (4 requests in flight at most, with progress). Mails come from `/users/:id.json` for the first 8 matches.
  - Caches are keyed by preset id and Redmine host.
- **Finding the same person:** every preset's Jira hosts and ClickUp workspaces are searched with that preset's own key.
  - Only a unique, visible, exact email match is selected automatically.
  - A match by name, a hidden email or a different email needs an explicit Confirm. A different email also shows a warning.
  - Jira: the `USER_PICKER` permission is checked once per site. If it is missing, the row says so and offers a manual accountId field, validated with `GET /user`.
  - ClickUp rows note that other people's time is visible only to Workspace Owners and Admins.
- **Fetching:** Redmine by `user_id`, Jira by `accountId`, ClickUp by `assignee`.
  - The Jira fetch was rewritten for "Me" as well: the JQL uses the accountId, worklogs are paginated, results are filtered by `author.accountId`, and the date bounds are local days. The undocumented `authorAccountId` param is gone.
- **Safety:**
  - Another person's view is read-only. Rows can't be clicked and a "Viewing … · read-only" banner is shown.
  - The axios guard (`helpers/readOnlyGuard.js`) passes only GET and Jira's `POST /search/jql` for read-only requests.
  - Credentials are captured once at the start of each fetch. The transport rejects a Jira request whose host is not declared by the preset that supplies the key (`helpers/credentialHost.js`, `CREDENTIAL_HOST_MISMATCH`).
  - Context tokens (`helpers/contextGuard.js`) drop late responses and late identity confirmations. Editing needs the "me" person, the same preset and the same generation.
- **Also changed:**
  - Generate → Jira and Generate → Redmine keep the existing cards when a fetch fails or finds nothing, and always stop the spinner.
  - Compare controls are one toolbar: the person picker, Source A/B chips with "vs", a date button with This week / Last week / This month, and Compare.
- **Demo:** three fictional people.
  - Olena matches by email everywhere.
  - Marek has a hidden Jira email and needs a Confirm.
  - Iryna is missing in ClickUp.

## Process
- Brief by Claude Opus 5.5. The plan was checked by GPT-6.1 Sol, which added 3 amendments: email-only auto-match, clearing state on context change, and Jira search-permission handling.
- Implementation by Claude Sonnet 5.5.
- Code review by GPT-6.1 Sol in three rounds:
  - first round: 3 findings (credentials could be mixed across presets and hosts, stale "Me" hosts, a late confirmation could land on another person);
  - second round: 2 findings (a late save could bring back editable "Me" results, and Generate → Jira could stall after a preset switch);
  - third round: no blockers.

## Validation (2026-11-01)
- 97 helper tests pass. `npx vite build` and `VITE_DEMO=true npx vite build` pass.
- Browser checks on the demo:
  - Olena: Jira and ClickUp matched by email. Compare gave Jira 9, ClickUp 10, Redmine 10 entries, and 0 cells were clickable.
  - Marek: the Jira row showed "Suggested by name, confirm" and was not read until Confirm; after it Jira returned 9 entries.
  - Switching the person cleared the old results.
  - "Me": rows are clickable and the "Edit Jira worklog" modal opens.
  - Generate → Jira and Generate → Redmine each produced 7 cards and closed the modal, checked through React state (`isOpen: false`, `isLoading: false`).
- Not verified: real tracker permissions. That covers the Redmine member directory against admin access, Jira `user/search` and `mypermissions`, ClickUp `assignee` for non-admins, and live Jira worklog pagination. Taras checks these on his account after the deploy.
