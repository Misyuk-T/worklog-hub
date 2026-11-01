import { format } from "date-fns";

import {
  getDemoClickUpLogs,
  getDemoJiraLogs,
  getDemoPersonLogs,
  getDemoRedmineLogs,
  isDemoActive,
} from "../demo/demoMode";
import groupByField from "../helpers/groupByField";
import { getLatestRedmineWorkLogs } from "./redmine";
import { getJiraWorklogIssues } from "./jira";
import { getClickUpTimeEntries } from "./clickup";

// Compare reads one service at a time and tags every entry with its source.
// `credentials` is the preset captured when the comparison started; `isMe`
// tells the demo whether to answer for the signed-in user or a colleague.
const tag = (grouped, source) =>
  Object.fromEntries(
    Object.entries(grouped || {}).map(([date, logs]) => [
      date,
      logs.map((log) => ({ ...log, source, date })),
    ]),
  );

const fetchOptions = (credentials) => ({
  credentials,
  readOnly: true,
  throwOnError: true,
  skipErrorToast: true,
});

export const fetchCompareRedmine = async ({ userId, isMe, startDate, endDate, credentials }) => {
  let entries;
  if (isDemoActive()) {
    entries = isMe
      ? getDemoRedmineLogs(startDate, endDate)
      : getDemoPersonLogs("redmine", userId, startDate, endDate);
  } else {
    entries = await getLatestRedmineWorkLogs(
      userId,
      startDate,
      endDate,
      0,
      [],
      fetchOptions(credentials),
    );
  }
  const normalized = (entries || []).map((log) => ({
    ...log,
    source: "redmine",
    date: format(new Date(log.spent_on), "dd-MM-yyyy"),
    hours: log.hours,
    description: log.comments,
  }));
  return groupByField(normalized, "date");
};

export const fetchCompareJira = async ({ host, accountId, isMe, startDate, endDate, credentials }) => {
  const grouped = isDemoActive()
    ? isMe
      ? getDemoJiraLogs(startDate, endDate)
      : getDemoPersonLogs("jira", accountId, startDate, endDate)
    : await getJiraWorklogIssues(
        host,
        startDate,
        endDate,
        accountId,
        null,
        [],
        false,
        fetchOptions(credentials),
      );
  return tag(grouped, "jira");
};

export const fetchCompareClickUp = async ({ teamId, userId, isMe, startDate, endDate, credentials }) => {
  const grouped = isDemoActive()
    ? isMe
      ? getDemoClickUpLogs(startDate, endDate)
      : getDemoPersonLogs("clickup", userId, startDate, endDate)
    : await getClickUpTimeEntries(teamId, startDate, endDate, userId, false, true, {
        credentials,
        readOnly: true,
        skipErrorToast: true,
      });
  return tag(grouped, "clickup");
};
