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
