const LOOKALIKES = {
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", Х: "X",
  а: "a", в: "b", е: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", х: "x",
};

export const OTHER_PROJECT = "Other";

// Cyrillic letters that look like Latin ones ("СTV-26") are mapped to Latin.
const toLatin = (text) =>
  String(text ?? "").replace(/[А-Яа-я]/g, (char) => LOOKALIKES[char] ?? char);

const prefixOf = (text) => {
  const match = toLatin(text).match(/^\s*([A-Za-z]{2,10})-\d+/);
  return match ? match[1].toUpperCase() : null;
};

// Jira project keys may hold letters, digits and underscores ("E2E", "AB_1").
const jiraKeyOf = (text) => {
  const match = toLatin(text).match(/^\s*([A-Za-z][A-Za-z0-9_]*)-\d+\s*$/);
  return match ? match[1].toUpperCase() : null;
};

const nameOf = (text) => {
  const name = typeof text === "string" ? text.trim() : "";
  return name || null;
};

// Project of one Compare entry: the issue-key prefix, else the Redmine project.
export const getProjectKey = (log) => {
  if (!log || typeof log !== "object") return OTHER_PROJECT;

  if (log.source === "jira") {
    return jiraKeyOf(log.task) || prefixOf(log.description) || OTHER_PROJECT;
  }
  if (log.source === "clickup") {
    return prefixOf(log.description) || prefixOf(log.taskKey) || OTHER_PROJECT;
  }
  if (log.source === "redmine") {
    return prefixOf(log.comments ?? log.description) || nameOf(log.project?.name) || OTHER_PROJECT;
  }
  return OTHER_PROJECT;
};

// Flattens a { date: [log] } map.
const flatten = (byDate) => Object.values(byDate || {}).flat();

// Rows for the "By project" table: the union of both sources, biggest first.
export const summarizeByProject = (source1Logs, source2Logs) => {
  const rows = new Map();
  const add = (byDate, field) => {
    flatten(byDate).forEach((log) => {
      const key = getProjectKey(log);
      const row = rows.get(key) || { project: key, hours1: 0, hours2: 0 };
      row[field] += parseFloat(log.hours) || 0;
      rows.set(key, row);
    });
  };
  add(source1Logs, "hours1");
  add(source2Logs, "hours2");
  return [...rows.values()].sort(
    (a, b) =>
      Math.max(b.hours1, b.hours2) - Math.max(a.hours1, a.hours2) ||
      a.project.localeCompare(b.project),
  );
};

// Keeps only the entries of `project`; days left empty are dropped.
export const filterByProject = (byDate, project) => {
  if (!project) return byDate || {};
  const result = {};
  Object.entries(byDate || {}).forEach(([date, logs]) => {
    const kept = logs.filter((log) => getProjectKey(log) === project);
    if (kept.length) result[date] = kept;
  });
  return result;
};
