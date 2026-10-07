import { useEffect, useState } from "react";

export const getMappingStorageKey = ({ profileId, redmineUrl, userId }) =>
  profileId && redmineUrl && userId
    ? `redmine-prefix-mappings:v1:${JSON.stringify([
        profileId,
        redmineUrl,
        userId,
      ])}`
    : null;

export const readSavedMappings = (storage, key) => {
  if (!key) return {};
  const saved = JSON.parse(storage.getItem(key) || "{}");
  if (!saved || Array.isArray(saved) || typeof saved !== "object") return {};
  return Object.fromEntries(
    Object.entries(saved).filter(
      ([prefix, id]) =>
        /^[A-Z][A-Z0-9]*$/.test(prefix) &&
        ((typeof id === "number" && Number.isInteger(id) && id > 0) ||
          (typeof id === "string" && /^\d+$/.test(id) && Number(id) > 0))
    )
  );
};

const loadMappings = (key) => {
  try {
    return {
      key,
      mappings: readSavedMappings(window.localStorage, key),
      failed: false,
    };
  } catch {
    return { key, mappings: {}, failed: true };
  }
};

export default function useRedminePrefixMappings(storageKey) {
  const [saved, setSaved] = useState(() => loadMappings(storageKey));

  useEffect(() => {
    setSaved(loadMappings(storageKey));
  }, [storageKey]);

  // Never show or save another profile's rules during a profile switch.
  const mappings = saved.key === storageKey ? saved.mappings : {};
  const setMapping = (prefix, projectId) => {
    const next = { ...mappings };
    if (projectId == null) delete next[prefix];
    else next[prefix] = projectId;
    let failed = false;
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        failed = true;
      }
    }
    setSaved({ key: storageKey, mappings: next, failed });
  };

  return { mappings, setMapping, storageFailed: saved.failed };
}
