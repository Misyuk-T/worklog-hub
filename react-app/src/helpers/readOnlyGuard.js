// Requests made while looking at someone else's data, or with keys of a preset
// that is not the active one, may only read.

export const READ_ONLY_BLOCKED_CODE = "READ_ONLY_BLOCKED";

const JIRA_SEARCH_PATH = "/rest/api/3/search/jql";

// Jira's search endpoint is a POST but only reads.
const isJiraSearch = (method, url) =>
  method === "POST" &&
  String(url ?? "").split("?")[0].replace(/\/+$/, "").endsWith(JIRA_SEARCH_PATH);

export const shouldBlockRequest = ({
  method,
  url,
  readOnly = false,
  credentialsPresetId,
  activePresetId,
}) => {
  const foreignKeys =
    credentialsPresetId != null && credentialsPresetId !== activePresetId;
  if (!readOnly && !foreignKeys) return false;

  const verb = String(method || "get").toUpperCase();
  if (verb === "GET") return false;
  return !isJiraSearch(verb, url);
};
