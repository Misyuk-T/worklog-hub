const CUSTOM_TASK_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9]*-\d+$/;
const NATIVE_CLICKUP_ID_PATTERN = /^(?=.*\d)[A-Za-z0-9]{3,}$/;

export const normalizeServiceScope = (value) =>
  (value || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

export const getDescriptionTaskCode = (description, allowNative = true) => {
  const code = (description || "").split(":", 1)[0].trim();
  if (CUSTOM_TASK_CODE_PATTERN.test(code)) return code.toUpperCase();
  return allowNative && NATIVE_CLICKUP_ID_PATTERN.test(code) ? code : null;
};

export const collectScopedTaskCodes = (
  workLogs,
  getScope,
  allowNative = true
) => {
  const scopedCodes = new Map();

  Object.values(workLogs || {})
    .flat()
    .forEach((workLog) => {
      const code = getDescriptionTaskCode(workLog.description, allowNative);
      const scope = getScope(workLog);
      if (!code || !scope) return;

      const scopeKey = String(scope);
      if (!scopedCodes.has(scopeKey)) scopedCodes.set(scopeKey, new Set());
      scopedCodes.get(scopeKey).add(code);
    });

  return scopedCodes;
};

export const countUnscopedTaskCodes = (
  workLogs,
  getScope,
  allowNative = true
) =>
  Object.values(workLogs || {})
    .flat()
    .filter(
      (workLog) =>
        getDescriptionTaskCode(workLog.description, allowNative) &&
        !getScope(workLog)
    ).length;

export const itemMatchesTaskCode = (item, code) => {
  if (!code) return false;
  const normalizedCode = code?.toUpperCase();
  return [item?.key, item?.id, ...(item?.lookupAliases || [])].some(
    (identifier) =>
      identifier != null && String(identifier).toUpperCase() === normalizedCode
  );
};

export const findScopedItem = (items, code, scope, getScope) =>
  (items || []).find(
    (item) =>
      itemMatchesTaskCode(item, code) &&
      String(getScope(item)) === String(scope)
  );

export const resolveMissingScopedItems = async ({
  scopedCodes,
  items,
  getScope,
  load,
  onLoaded,
  withScope = (item, scope) => ({ ...item, serviceScope: scope }),
}) => {
  let failed = 0;

  for (const [scope, codes] of scopedCodes) {
    for (const code of codes) {
      if (findScopedItem(items, code, scope, getScope)) continue;
      let item = null;
      try {
        item = await load(code, scope);
      } catch (error) {
        console.error(`Could not load ${code} from ${scope}:`, error);
      }
      if (!item) {
        failed += 1;
        continue;
      }
      const scopedItem = withScope(item, scope);
      items.push(scopedItem);
      onLoaded(scopedItem, scope);
    }
  }

  return { items, failed };
};

const MAX_LISTED_MISSING_CODES = 5;

const uniqueValues = (values) => [...new Set(values.filter(Boolean))];

// Every loaded Jira issue (main instance + each additional one), tagged with
// its normalized instance so cards can be matched across instances.
export const buildJiraIssuePool = (
  assignedIssues,
  additionalAssignedIssues,
  mainJiraUrl
) => {
  const mainScope = normalizeServiceScope(mainJiraUrl);
  return [
    ...(assignedIssues || []).map((issue) => ({
      ...issue,
      jiraUrl: mainScope,
    })),
    ...Object.entries(additionalAssignedIssues || {}).flatMap(
      ([jiraUrl, issues]) =>
        (issues || []).map((issue) => ({
          ...issue,
          jiraUrl: normalizeServiceScope(jiraUrl),
        }))
    ),
  ];
};

// A card explicitly set to a non-main instance is authoritative: it only ever
// links to an issue on that instance. A card with no URL, or with the main URL
// (new cards get it hard-coded), is not.
const getAuthoritativeJiraScope = (cardJiraUrl, mainJiraUrl) => {
  const scope = normalizeServiceScope(cardJiraUrl);
  return scope && scope !== normalizeServiceScope(mainJiraUrl) ? scope : "";
};

// Picks the issue a card should link to. An authoritative card matches only on
// its own instance. Otherwise: main first, then the only other instance that
// knows the key.
export const pickJiraIssue = (pool, code, cardJiraUrl, mainJiraUrl) => {
  const matches = (pool || []).filter((issue) =>
    itemMatchesTaskCode(issue, code)
  );
  if (!matches.length) return null;

  const authoritativeScope = getAuthoritativeJiraScope(
    cardJiraUrl,
    mainJiraUrl
  );
  if (authoritativeScope) {
    return (
      matches.find(
        (issue) => normalizeServiceScope(issue.jiraUrl) === authoritativeScope
      ) || null
    );
  }

  const mainScope = normalizeServiceScope(mainJiraUrl);
  if (mainScope) {
    const hit = matches.find(
      (issue) => normalizeServiceScope(issue.jiraUrl) === mainScope
    );
    if (hit) return hit;
  }

  const instances = new Set(
    matches.map((issue) => normalizeServiceScope(issue.jiraUrl))
  );
  return instances.size === 1 ? matches[0] : null;
};

// Fetches only the Jira keys a card cannot be linked to from the loaded lists.
// Non-authoritative cards: a key is loaded if any list has it; otherwise it is
// tried on main, then the other instances, stopping at the first success.
// Authoritative cards: a key is loaded only if their own instance's list has
// it; otherwise it is fetched from that instance alone, with no fallback.
// Each key is requested at most once per instance. Fetched issues are appended
// to `issues`; keys that could not be found are returned.
export const resolveMissingJiraIssues = async ({
  workLogs,
  issues,
  mainJiraUrl,
  instanceUrls = [],
  load,
  onLoaded,
}) => {
  const mainScope = normalizeServiceScope(mainJiraUrl);
  const allScopes = uniqueValues(
    [mainScope, ...instanceUrls].map(normalizeServiceScope)
  );

  const openCodes = new Set();
  const authoritativeRequests = new Map();
  Object.values(workLogs || {})
    .flat()
    .forEach((workLog) => {
      const code = getDescriptionTaskCode(workLog.description, false);
      if (!code) return;
      const scope = getAuthoritativeJiraScope(workLog.jiraUrl, mainScope);
      if (!scope) {
        openCodes.add(code);
        return;
      }
      if (!authoritativeRequests.has(scope)) {
        authoritativeRequests.set(scope, new Set());
      }
      authoritativeRequests.get(scope).add(code);
    });

  const notFound = new Set();
  const tryLoad = async (code, scope) => {
    let issue = null;
    try {
      issue = await load(code, scope);
    } catch (error) {
      console.error(`Could not load ${code} from ${scope}:`, error);
    }
    if (!issue) return false;

    const scopedIssue = { ...issue, jiraUrl: scope };
    issues.push(scopedIssue);
    onLoaded(scopedIssue, scope);
    return true;
  };

  for (const code of openCodes) {
    if (issues.some((issue) => itemMatchesTaskCode(issue, code))) continue;
    let found = false;
    for (const scope of allScopes) {
      found = await tryLoad(code, scope);
      if (found) break;
    }
    if (!found) notFound.add(code);
  }

  for (const [scope, codes] of authoritativeRequests) {
    for (const code of codes) {
      const known = issues.some(
        (issue) =>
          itemMatchesTaskCode(issue, code) &&
          normalizeServiceScope(issue.jiraUrl) === scope
      );
      if (known) continue;
      if (!(await tryLoad(code, scope))) notFound.add(code);
    }
  }

  return { issues, notFound: [...notFound] };
};

export const formatMissingJiraCodes = (codes) => {
  const listed = codes.slice(0, MAX_LISTED_MISSING_CODES).join(", ");
  const rest = codes.length - MAX_LISTED_MISSING_CODES;
  return `Could not find Jira issue(s): ${listed}${
    rest > 0 ? ` and ${rest} more` : ""
  }`;
};
