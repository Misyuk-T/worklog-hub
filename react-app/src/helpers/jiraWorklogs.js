import { endOfDay, parse, startOfDay } from "date-fns";

export const JIRA_WORKLOG_PAGE_SIZE = 1000;

// Local-day bounds of a yyyy-MM-dd range, as epoch milliseconds.
export const dayRangeToMs = (startDate, endDate) => ({
  fromMs: startOfDay(parse(startDate, "yyyy-MM-dd", new Date())).getTime(),
  toMs: endOfDay(parse(endDate, "yyyy-MM-dd", new Date())).getTime(),
});

// Jira sends "2026-10-27T10:00:00.000+0200"; Date wants "+02:00".
export const startedToMs = (started) =>
  new Date(String(started ?? "").replace(/(\+\d{2})(\d{2})$/, "$1:$2")).getTime();

// fetchPage({ startAt, maxResults }) -> { worklogs, total }. Reads every page
// of one issue's worklogs; an issue can hold more than one page.
export const fetchAllIssueWorklogs = async (
  fetchPage,
  maxResults = JIRA_WORKLOG_PAGE_SIZE,
) => {
  const all = [];
  let startAt = 0;

  for (;;) {
    const page = await fetchPage({ startAt, maxResults });
    const worklogs = page?.worklogs || [];
    all.push(...worklogs);
    startAt += worklogs.length;

    const total = Number.isFinite(page?.total) ? page.total : startAt;
    if (worklogs.length === 0 || startAt >= total) return all;
  }
};

// Keeps one author's worklogs inside the range. The author is matched by
// accountId, never by email (Jira often hides it).
export const filterWorklogs = (worklogs, { accountId, fromMs, toMs }) =>
  (worklogs || []).filter((worklog) => {
    if (!accountId || worklog.author?.accountId !== accountId) return false;
    const startedMs = startedToMs(worklog.started);
    return startedMs >= fromMs && startedMs <= toMs;
  });
