import { normalizeServiceScope } from "./matchWorklogTasks.js";

// A Jira key may only be sent to a host the same preset declared. Redmine takes
// its host from the same credentials object (X-Redmine-Url) and ClickUp has a
// fixed host, so only Jira needs this check.

export const CREDENTIAL_HOST_MISMATCH_CODE = "CREDENTIAL_HOST_MISMATCH";

// Same normalizer the rest of the app uses for Jira hosts; hosts are
// case-insensitive, so compare them lowercased.
const hostOf = (value) => normalizeServiceScope(String(value ?? "").trim()).toLowerCase();

export const declaredJiraHosts = (credentials) =>
  [
    credentials?.jiraUrl,
    ...(credentials?.additionalJiraUrls || []).map((item) => item?.url),
  ]
    .map(hostOf)
    .filter(Boolean);

export const isJiraHostAllowed = (credentials, jiraUrl) => {
  const host = hostOf(jiraUrl);
  if (!host) return false;
  return declaredJiraHosts(credentials).includes(host);
};
