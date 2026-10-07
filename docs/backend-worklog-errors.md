# Worklog errors and durations above eight hours

## Problem and choice

Import errors were replaced by a generic HTTP 500 message and then swallowed by
`sendWorkLogs`, leaving the form marked as sent. Proxy errors discarded upstream
validation details. A per-entry eight-hour cap existed in both the parser and UI.

Keep the existing successful response formats. Return a stable JSON error shape:
`{error: {code, message, details: []}}`, retain actionable upstream 4xx statuses,
and use 502 for upstream availability failures. Remove the eight-hour cap while
requiring finite, positive hours. No automatic retries or external worklog writes
are introduced.

## Changes

- TXT diagnostics identify the physical line and field; invalid nonblank lines
  fail the whole import rather than silently dropping worklogs.
- XLSX diagnostics identify the sheet, physical row and source column. Missing
  files/types/sheets, invalid dates/durations and empty files have useful errors.
- Proxy errors retain Redmine/Jira/ClickUp reasons, redact known credentials, and
  avoid raw Axios logging or HTML. Filtering/pagination/custom-ID query parameters
  are forwarded while connection credentials stay out of upstream URLs except
  Redmine's required key parameter.
- Import failures stay visible in the form, preserve current cards and allow retry.
- Submission failures identify the date, hours and task/card description. All
  requests settle before reporting successful/failed counts; partial success warns
  against resubmitting the whole batch.
- The parser, card hours input and submission validation accept durations above 8h.
  The existing daily total colour cue is retained; it does not block submission.

## Validation — 2026-10-07

- 14 backend tests: TXT/XLSX parsing, physical rows, malformed/missing uploads,
  actual multipart >8h import, upstream query forwarding, auth/validation errors,
  HTML rejection and credential redaction.
- 23 frontend/helper tests: detailed error rendering, partial batch success,
  finite positive hours above 8, and existing task/prefix mapping regressions.
- Targeted ESLint, production build and `git diff --check` pass.
- Browser against the local HTTP API: malformed TXT displayed line 2 / hours;
  previous cards remained and Import stayed enabled. A 12.5h card edited and saved
  as 13.5h without clamping. Synthetic multipart import of 12.5h also passed.
- Screenshot: `/tmp/worklog-import-error.jpg` (local demo, no remote worklog writes).

## Release

Target: `firebase-click-up-app`; Firebase Hosting `redmine-scheduler-app` for the
frontend and Northflank `logger/github` for the backend. Northflank builds `/server`
from the same repository/branch. Automatic deployment is disabled; deployment must
pin the successful build of the reviewed source commit. The prior deployed backend
commit was `74ece0db81e55e802e167e0f5d1043cc355b3fde` and its server tree matched the
pre-change checkout.

### Completed release — 2026-10-07

- Source commit `b7bf28051135b2274f05eddf4d25bb209a50e7c0` pushed to
  `origin/firebase-click-up-app`.
- Firebase Hosting deployment completed from an isolated archive of that commit.
  Live HTML and both JS/CSS assets exactly matched the released files:
  `index-CMMdRF6Z.js` and `index-BuDZ7cwc.css`.
- Northflank build `true-range-5706` succeeded. Manual deployment pinned that
  build ID; service status is `COMPLETED` and `deployedSHA` matches the source
  commit. The deployment API accepts either `buildId` or `buildSHA`, not both.
  Automatic deployment remains disabled.
- Live API checks: a synthetic 12.5h TXT import returned 200 with hours unchanged;
  missing duration returned 400 / `INVALID_TXT` with line 2 and field `hours`;
  missing upload returned 400 / `MISSING_FILE`; missing Redmine connection settings
  returned 400 / `MISSING_CREDENTIALS`.
- No downstream worklogs were created. Authenticated submissions to Redmine,
  Jira and ClickUp were covered through mocked upstream responses, not live writes.

Frontend: https://redmine-scheduler-app.web.app/

Backend: https://rest--github--jjfz5dbqtvkd.code.run
