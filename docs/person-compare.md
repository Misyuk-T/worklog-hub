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

## Release (2026-11-01)
- Source commit `8e0b1b2` deployed to [Firebase Hosting](https://redmine-scheduler-app.web.app/). Firebase reported `Deploy complete!`.
- Served HTML references `index-DgAuYUL_.js` and `index-B2_Oly4f.css`. Both match the built files byte for byte. JS SHA-256: `1cbdb5e01444603ce79658cd41833ab2bc933867573044db9cba16e8d65be09a`.
- Not pushed at release time.

## Hours and per-project breakdown (2026-11-02)
- Problem: Taras was told "HPE: Redmine 52 hrs, ClickUp 46 hrs" for October, but the Compare summary showed only entry counts.
  - His ClickUp HPE entries for October sum to 46.5h (41 entries, read through the ClickUp connector).
- Change: each connection line now shows hours and the entry count, and each source shows a total.
  - A "By project" table (`ProjectBreakdown.jsx`) has the columns Project, Source A, Source B and Difference. Clicking a row filters the daily tables to that project.
  - The project key comes from `helpers/projectKey.js`:
    - Jira: the issue key, with letters, digits and `_` allowed;
    - ClickUp: the description prefix, else the task key;
    - Redmine: the comment prefix, else the project name.
  - Cyrillic look-alikes are mapped to Latin (`СTV-26` → `CTV`).
- Review: GPT-6.1 Sol found one issue: Jira keys like `E2E-124` were parsed with the description rule. Fixed, with regression tests.
- Validation:
  - 108 helper tests pass and `npx vite build` passes.
  - Demo, by project: WEB 62h / 0h, OPS 14.5h / 0h. The OPS filter left only OPS entries, and its day totals sum to 14.5h.

## ClickUp entries start at midday (2026-11-02)
- Problem: Liubov's report showed HPE for October as 52h in Redmine and 46h in ClickUp. Both trackers actually hold 52.25h (Redmine: 43 entries read from the work-profile session; ClickUp: the connector).
  - The two 1 Oct entries (HPE-224 2.75h, HPE-223 3h) started at 00:00 Kyiv = 30 Sep 21:00 UTC, so UTC reports counted them in September. This had happened before.
- Change: `createClickUpTimeEntries` starts entries at 12:00 local time instead of 00:00. Jira already writes `T12:00:00+0000`.
- Review: GPT-6.1 Sol, no blockers. Noon Kyiv on 1 Oct is 09:00 UTC, and read-back buckets by local day.

## Manual identities and card input fixes (2026-11-06)

- Problem: different emails and display names left Compare without a selectable identity; card hours treated Home/End as min/max and reformatted unchanged values on blur.
- Choice: only a unique exact email still auto-confirms. Name hints use Cyrillic transliteration and a shared token of at least four letters; every other identity needs an explicit pick/Confirm. Mappings remain in memory and the read-only/fetch guards are unchanged.
- Change: ClickUp retains every workspace member, ordered exact → suggested/conflict → other, then by name. Jira rows search manually after 300 ms and two characters, with both context and request checks to discard late responses. The no-permission accountId field remains.
- Demo: Yuliia has a Cyrillic Redmine name, a shortened ClickUp name with another email, three worklogs and no Jira account. Iryna remains unrelated to every ClickUp member and gets the full manual list.
- Hours: Home/End move the caret; blur does not cast/clamp the value; equivalent numeric changes do not notify the parent. Typing/steppers still notify immediately. Positive input below the card minimum 0.1 is rejected, as is input above 24; empty/zero intermediate text still fails save validation.
- Card IDs: file import parsers, Redmine and Jira generate UUIDs; ClickUp copies the tracker entry ID. `addWorkLogs` now repairs missing/duplicate IDs once, preserving the first original ID and avoiding collisions across dates. Tests cover saving one formerly id-less card without changing its neighbor.
- Validation: `node --experimental-default-type=module --test src/helpers/*.test.js`: 114 passed, 0 failed. Normal and demo Vite builds pass. ESLint on every changed JS/JSX file and `git diff --check` pass. Builds still report CJS/Sass deprecations and a large-chunk warning.
- Additional DOM checks (temporary scripts in `/private/tmp/redmine-brief-browser`): 5/24 remain unchanged on blur and Home/End; numeric-equivalent input does not notify; 0.05/25 are rejected; typing, arrows and steppers notify immediately. Jira checks cover minimum query length, debounce, unrelated manual results, explicit picks and dropping a stale context response.
- Next: browser smoke test and real tracker permission checks. Browser verification was blocked here: Vite preview could not listen (`EPERM`) and Chrome could not launch. No commit, push or deployment was made.
