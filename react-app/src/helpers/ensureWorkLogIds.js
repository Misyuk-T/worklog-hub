import { v4 as uuidv4 } from "uuid";

// Reserve every existing ID first, so a generated ID cannot replace a later one.
export const ensureWorkLogIds = (workLogs, makeId = uuidv4) => {
  if (!workLogs || typeof workLogs !== "object") return workLogs;
  const reserved = new Set();
  for (const logs of Object.values(workLogs)) {
    if (!Array.isArray(logs)) continue;
    for (const log of logs) {
      if (log?.id !== undefined && log?.id !== null && log.id !== "") {
        reserved.add(String(log.id));
      }
    }
  }
  const seen = new Set();
  return Object.fromEntries(Object.entries(workLogs).map(([date, logs]) => [
    date,
    Array.isArray(logs) ? logs.map((log) => {
      const key = log?.id === undefined || log?.id === null ? "" : String(log.id);
      if (key && !seen.has(key)) {
        seen.add(key);
        return log;
      }
      let id;
      do { id = makeId(); } while (!id || reserved.has(String(id)) || seen.has(String(id)));
      seen.add(String(id));
      return { ...log, id };
    }) : logs,
  ]));
};
