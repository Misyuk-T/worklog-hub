const REDMINE_TASK_PREFIX_PATTERN = /^\s*([A-Za-z][A-Za-z0-9]*)-\d+(?=\s|:|$)/;
const VALID_PREFIX_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;

const normalizePrefix = (prefix) => {
  const value = typeof prefix === "string" ? prefix.trim() : "";
  return VALID_PREFIX_PATTERN.test(value) ? value.toUpperCase() : null;
};

const mappingEntries = (mappings) => {
  if (mappings instanceof Map) return [...mappings.entries()];
  if (mappings && typeof mappings === "object" && !Array.isArray(mappings)) {
    return Object.entries(mappings);
  }
  return [];
};

const isEmptyProject = (project) => project == null || project === "";

export const getRedmineDescriptionPrefix = (description) => {
  if (typeof description !== "string") return null;
  return description.match(REDMINE_TASK_PREFIX_PATTERN)?.[1].toUpperCase() || null;
};

export const detectRedminePrefixes = (workLogs) => {
  const counts = new Map();

  Object.values(workLogs || {})
    .flatMap((cards) => (Array.isArray(cards) ? cards : []))
    .forEach((card) => {
      const prefix = getRedmineDescriptionPrefix(card?.description);
      if (prefix) counts.set(prefix, (counts.get(prefix) || 0) + 1);
    });

  return [...counts.entries()]
    .map(([prefix, count]) => ({ prefix, count }))
    .sort((left, right) => left.prefix.localeCompare(right.prefix));
};

export const collectRedmineDescriptionPrefixes = detectRedminePrefixes;

export const applyRedminePrefixMappings = (
  workLogs,
  mappings,
  allowedIssueIds,
  { onlyEmpty = false } = {}
) => {
  const allowedIds = new Set(
    (Array.isArray(allowedIssueIds) ? allowedIssueIds : [])
      .map((issue) =>
        issue && typeof issue === "object" && !Array.isArray(issue)
          ? issue.id
          : issue
      )
      .filter((id) => id != null)
  );
  const validMappings = new Map();
  let invalidMappingCount = 0;

  mappingEntries(mappings).forEach(([rawPrefix, issueId]) => {
    const prefix = normalizePrefix(rawPrefix);
    if (!prefix || !allowedIds.has(issueId)) {
      invalidMappingCount += 1;
      return;
    }
    validMappings.set(prefix, issueId);
  });

  let matchedCount = 0;
  let updatedCount = 0;
  let totalCount = 0;
  let nextWorkLogs = workLogs;

  if (workLogs && typeof workLogs === "object" && !Array.isArray(workLogs)) {
    Object.entries(workLogs).forEach(([date, cards]) => {
      if (!Array.isArray(cards)) return;
      totalCount += cards.length;
      let changedDate = false;
      const nextCards = cards.map((card) => {
        const prefix = getRedmineDescriptionPrefix(card?.description);
        if (!prefix || !validMappings.has(prefix)) return card;

        matchedCount += 1;
        const issueId = validMappings.get(prefix);
        if ((onlyEmpty && !isEmptyProject(card?.project)) || card?.project === issueId) {
          return card;
        }

        changedDate = true;
        updatedCount += 1;
        return { ...card, project: issueId };
      });

      if (changedDate) {
        if (nextWorkLogs === workLogs) nextWorkLogs = { ...workLogs };
        nextWorkLogs[date] = nextCards;
      }
    });
  }

  return {
    workLogs: nextWorkLogs,
    totalCount,
    matchedCount,
    updatedCount,
    skippedCount: matchedCount - updatedCount,
    unchangedCount: matchedCount - updatedCount,
    invalidMappingCount,
  };
};
