# Manager mode (team review): plan

- Problem: a manager wants to check a teammate's Redmine, Jira and ClickUp worklogs with their own keys from the active preset, without entering the teammate's keys.
- Process (2026-11-01): one fact sheet (code + tracker docs). Then two blind plans on it, one by Claude Opus 5.5 and one by GPT-6 Astra, and a merge. Nothing is implemented yet.

## What the trackers allow with your own key
- Redmine:
  - `GET /time_entries.json?user_id=<id>` shows another user's entries when your role has "View spent time" with visibility "all". A role limited to "own" shows only yours.
  - `/users.json` is admin only. People come from `/projects/:id/memberships.json`, or the ID is entered by hand.
  - Sources: [time entries](https://www.redmine.org/projects/redmine/wiki/Rest_TimeEntries), [users](https://www.redmine.org/projects/redmine/wiki/Rest_Users), [time_entry.rb visibility](https://raw.githubusercontent.com/redmine/redmine/master/app/models/time_entry.rb).
- Jira Cloud:
  - Other authors' worklogs are readable on issues you can browse, subject to worklog visibility groups.
  - Search by `accountId`, because other users' email is often hidden. `/user/search` needs "Browse users and groups"; fall back to entering the account ID.
  - Source: [issue worklogs](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-worklogs/).
- ClickUp: `assignee=<other user>` on `GET /team/{id}/time_entries` works only for Workspace Owners and Admins ([doc](https://developer.clickup.com/reference/gettimeentrieswithinadaterange)). A regular member cannot review colleagues there.

## Bugs found on the way (they affect "My work" too)
- `actions/jira.jsx` passes the user's email into `worklogAuthor` and into `authorAccountId`. The latter is not a documented parameter.
  - Should be: JQL by `accountId`, then filter the worklogs by `author.accountId`.
- Per-issue worklogs are not paginated (`startAt`/`maxResults`). An issue with many worklogs can lose entries.

## Merged plan
- Mode, not preset:
  - A `My work | Team review` switch in the header next to the settings.
  - Team review is a separate read-only workspace: a banner "Read-only · Preset · Viewing: <name>", a person or team picker, a date range and Refresh.
  - Latest Activity and Compare follow the selected person.
  - The cards workspace, Generate, Submit, Edit and Delete are not mounted in this mode.
- People:
  - A local `personId` with confirmed mappings: Redmine user id, Jira accountId per host, ClickUp user id per workspace.
  - Matches suggested by name or email must be confirmed. Partial mappings are allowed.
  - States are shown separately: unmapped, denied, empty, failed, partial.
- Storage:
  - `users/{ownerId}/managerProfiles/{presetId}/{people,groups,preferences}`, apart from the credentials.
  - Only ids and labels are stored, never a colleague's logs.
  - RTDB rules get `.validate` for this subtree.
- Write safety, in three layers:
  1. The UI does not mount write controls.
  2. A mutation guard in the action layer and the axios interceptor allows reads only, plus Jira's `POST /search/jql`.
  3. Later, proxy review routes with a method/endpoint allowlist.
  - Context-generation checks drop stale responses after a person or preset switch.
- Phases:
  0. Spike, about 30 minutes: one known colleague and one day per tracker, with the manager's keys.
  1. Fix the two Jira bugs above in My work.
  2. Team review for one person: Redmine + Jira, manual ID mapping, daily totals per tracker.
  3. ClickUp when the key owner is a workspace admin, people pickers, Compare per person.
  4. Team overview (people × days, gaps), proxy pacing for team-size pulls, demo data with 3 fictional people.

## Where the two plans differed
- Placement:
  - Claude: a "Viewing: Me ▾" switcher reusing the existing panels.
  - Astra: a separate Team review mode and workspace.
  - Merged: Astra's version, because it keeps own-work drafts and writes out of reach.
- Storage:
  - Claude: `settings/{presetId}/people`.
  - Astra: a separate `managerProfiles` subtree.
  - Merged: Astra's version, so credentials and mappings stay apart.
- First release:
  - Claude: all three trackers.
  - Astra: Redmine only.
  - Merged: Redmine + Jira after the Jira fixes; ClickUp depends on the admin role.
- Guard:
  - Claude: a client-side interceptor only.
  - Astra: action layer + transport + proxy allowlist.
  - Merged: the first two now, the proxy allowlist with the team overview.

## Open questions for the owner
- One colleague at a time, or a weekly review of a whole team (and how many people)?
- Is the ClickUp key owner a Workspace Owner or Admin?
- Which tracker is authoritative when totals differ?
- Should mappings stay private to each manager?
