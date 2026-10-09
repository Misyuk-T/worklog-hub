import test from "node:test";
import assert from "node:assert/strict";
import useWorkLogsStore from "../store/worklogsStore.js";
import useJiraStore from "../store/jiraStore.js";

import {
  buildJiraIssuePool,
  collectScopedTaskCodes,
  countUnscopedTaskCodes,
  findScopedItem,
  formatMissingJiraCodes,
  getDescriptionTaskCode,
  itemMatchesTaskCode,
  normalizeServiceScope,
  pickJiraIssue,
  resolveMissingJiraIssues,
  resolveMissingScopedItems,
} from "./matchWorklogTasks.js";

test("extracts only a task code at the start of a description", () => {
  assert.equal(getDescriptionTaskCode(" ce-580: work"), "CE-580");
  assert.equal(getDescriptionTaskCode("86abc123: work"), "86abc123");
  assert.equal(getDescriptionTaskCode("9hz: work"), "9hz");
  assert.equal(getDescriptionTaskCode("86abc123: work", false), null);
  assert.equal(getDescriptionTaskCode("meeting: work"), null);
});

test("matches a native ClickUp id even when the task also has a custom key", () => {
  const task = { id: "86abc123", key: "CP-170", teamId: "1" };
  assert.equal(itemMatchesTaskCode(task, "86abc123"), true);
  assert.equal(
    findScopedItem([task], "86abc123", "1", (item) => item.teamId),
    task
  );
});

test("deduplicates missing lookups within each service scope", () => {
  const result = collectScopedTaskCodes(
    {
      day: [
        { description: "CP-47: one", teamId: "1" },
        { description: "cp-47: two", teamId: "1" },
        { description: "CP-47: three", teamId: "2" },
      ],
    },
    (item) => item.teamId
  );
  assert.deepEqual([...result.get("1")], ["CP-47"]);
  assert.deepEqual([...result.get("2")], ["CP-47"]);
});

test("existing matches stay scoped to their Jira instance or ClickUp team", () => {
  const items = [
    { key: "CE-10", jiraUrl: "one.atlassian.net" },
    { key: "CE-10", jiraUrl: "two.atlassian.net" },
  ];
  assert.equal(
    findScopedItem(items, "CE-10", "two.atlassian.net", (item) => item.jiraUrl),
    items[1]
  );
});

test("normalizes configured Jira URLs for scoped matching", () => {
  assert.equal(
    normalizeServiceScope("https://one.atlassian.net/"),
    "one.atlassian.net"
  );
});

test("loads a missing item once and reports inaccessible items", async () => {
  const loadedCodes = [];
  const result = await resolveMissingScopedItems({
    scopedCodes: new Map([["team-1", new Set(["CP-1", "CP-2"])]]),
    items: [{ key: "CP-1", serviceScope: "team-1" }],
    getScope: (item) => item.serviceScope,
    load: async (code) => {
      loadedCodes.push(code);
      return null;
    },
    onLoaded: () => {},
  });

  assert.deepEqual(loadedCodes, ["CP-2"]);
  assert.equal(result.failed, 1);
  assert.equal(result.items.length, 1);
});

test("hydrates a successfully fetched item for later card linking", async () => {
  const added = [];
  const result = await resolveMissingScopedItems({
    scopedCodes: new Map([["team-1", new Set(["CP-9"])]]),
    items: [],
    getScope: (item) => item.teamId,
    load: async () => ({ id: "native-9", key: "CP-9", summary: "Hydrated" }),
    withScope: (item, teamId) => ({ ...item, teamId }),
    onLoaded: (item) => added.push(item),
  });
  assert.deepEqual(result.items, added);
  assert.equal(result.items[0].summary, "Hydrated");
  assert.equal(result.failed, 0);
});

test("isolates thrown lookup failures and reports missing service scope", async () => {
  const result = await resolveMissingScopedItems({
    scopedCodes: new Map([["jira", new Set(["CE-1", "CE-2"])]]),
    items: [],
    getScope: (item) => item.jiraUrl,
    load: async (code) => {
      if (code === "CE-1") throw new Error("forbidden");
      return null;
    },
    onLoaded: () => {},
  });
  assert.equal(result.failed, 2);
  assert.equal(
    countUnscopedTaskCodes(
      { day: [{ description: "CE-1: work" }] },
      () => null
    ),
    1
  );
});

test("bulk linking uses the card scope and preserves inaccessible or unscoped cards", () => {
  const logs = [
    {
      id: "one",
      description: "QA-1: one",
      jiraUrl: "https://first.net/",
      clickupTeamId: "1",
    },
    {
      id: "two",
      description: "QA-1: two",
      jiraUrl: "second.net",
      clickupTeamId: "2",
    },
    {
      id: "missing",
      description: "QA-404: gone",
      jiraUrl: "first.net",
      clickupTeamId: "1",
      task: "KEEP-1",
      clickupTask: "keep",
    },
    { id: "unscoped", description: "QA-1: no scope" },
    {
      id: "native",
      description: "86abc123: native",
      jiraUrl: "first.net",
      clickupTeamId: "1",
    },
  ];
  useWorkLogsStore.setState({ workLogs: { day: logs } });
  useWorkLogsStore.getState().bulkUpdateWorkLogsWithJira([
    { key: "QA-1", jiraUrl: "first.net" },
    { key: "QA-1", jiraUrl: "second.net" },
  ]);
  useWorkLogsStore.getState().bulkUpdateWorkLogsWithClickUp([
    { key: "QA-1", id: "first-task", teamId: "1" },
    { key: "QA-1", id: "second-task", teamId: "2" },
    { key: "CP-170", id: "86abc123", teamId: "1" },
  ]);
  const result = useWorkLogsStore.getState().workLogs.day;
  assert.equal(result[0].jiraUrl, "first.net");
  assert.equal(result[0].clickupTask, "first-task");
  assert.equal(result[1].jiraUrl, "second.net");
  assert.equal(result[1].clickupTask, "second-task");
  assert.deepEqual(result[2], logs[2]);
  assert.deepEqual(result[3], logs[3]);
  assert.equal(result[4].clickupTask, "86abc123");
  assert.equal(result[4].task, undefined);
  useWorkLogsStore.getState().resetAll();
});

test("Jira hydration reuses normalized instances and preserves moved-key aliases", () => {
  useJiraStore.setState({
    organizationURL: "https://first.net/",
    assignedIssues: [{ key: "QA-2", summary: "Existing" }],
    additionalAssignedIssues: {
      "https://second.net/": [{ key: "QA-1", summary: "Existing" }],
    },
  });
  useJiraStore
    .getState()
    .addFetchedIssue("second.net", { key: "QA-2", summary: "Fetched" });
  useJiraStore
    .getState()
    .addFetchedIssue("first.net", { key: "QA-2", lookupAliases: ["OLD-1"] });
  useJiraStore
    .getState()
    .addFetchedIssue("first.net", { key: "QA-2", lookupAliases: ["OLD-2"] });
  const state = useJiraStore.getState();
  assert.deepEqual(Object.keys(state.additionalAssignedIssues), [
    "https://second.net/",
  ]);
  assert.equal(state.additionalAssignedIssues["https://second.net/"].length, 2);
  assert.equal(state.assignedIssues.length, 1);
  assert.deepEqual(state.assignedIssues[0].lookupAliases, ["OLD-1", "OLD-2"]);
  useJiraStore.getState().resetAll();
});

const MAIN = "main.atlassian.net";
const OTHER = "other.atlassian.net";
const jiraPool = (main = [], other = []) =>
  buildJiraIssuePool(main, { [`https://${OTHER}/`]: other }, `https://${MAIN}/`);

test("builds a Jira pool tagged with normalized instance URLs", () => {
  const pool = jiraPool([{ key: "A-1" }], [{ key: "B-1" }]);
  assert.deepEqual(
    pool.map((issue) => [issue.key, issue.jiraUrl]),
    [
      ["A-1", MAIN],
      ["B-1", OTHER],
    ]
  );
});

test("a card defaulting to main still matches a key known only on another instance", () => {
  const pool = jiraPool([], [{ key: "ABC-1179" }]);
  assert.equal(pickJiraIssue(pool, "ABC-1179", MAIN, MAIN).jiraUrl, OTHER);
  assert.equal(pickJiraIssue(pool, "ABC-1179", undefined, MAIN).jiraUrl, OTHER);

  useWorkLogsStore.setState({
    workLogs: {
      day: [
        { id: "a", description: "ABC-1179: imported" },
        { id: "b", description: "ABC-1179: new card", jiraUrl: MAIN },
      ],
    },
  });
  useWorkLogsStore.getState().bulkUpdateWorkLogsWithJira(pool, MAIN);
  const [a, b] = useWorkLogsStore.getState().workLogs.day;
  assert.deepEqual([a.task, a.jiraUrl], ["ABC-1179", OTHER]);
  assert.deepEqual([b.task, b.jiraUrl], ["ABC-1179", OTHER]);
  useWorkLogsStore.getState().resetAll();
});

test("an ambiguous Jira key prefers the card's instance, then main", () => {
  const pool = jiraPool([{ key: "QA-1" }], [{ key: "QA-1" }]);
  assert.equal(pickJiraIssue(pool, "QA-1", OTHER, MAIN).jiraUrl, OTHER);
  assert.equal(pickJiraIssue(pool, "QA-1", MAIN, MAIN).jiraUrl, MAIN);
  assert.equal(pickJiraIssue(pool, "QA-1", undefined, MAIN).jiraUrl, MAIN);
  assert.equal(pickJiraIssue(pool, "QA-1", "third.net", MAIN), null);
  assert.equal(pickJiraIssue(pool, "QA-1", undefined, ""), null);
  assert.equal(pickJiraIssue(pool, "NOPE-1", OTHER, MAIN), null);
});

test("fetches only Jira keys that no loaded list contains", async () => {
  const issues = jiraPool([{ key: "A-1" }], [{ key: "ABC-1179" }]);
  const calls = [];
  const result = await resolveMissingJiraIssues({
    workLogs: {
      day: [
        { description: "A-1: main" },
        { description: "ABC-1179: other", jiraUrl: MAIN },
        { description: "meeting: no key" },
      ],
    },
    issues,
    mainJiraUrl: MAIN,
    instanceUrls: [OTHER],
    load: async (code, scope) => {
      calls.push([code, scope]);
      return null;
    },
    onLoaded: () => {},
  });
  assert.deepEqual(calls, []);
  assert.deepEqual(result.notFound, []);
});

test("an unknown Jira key is tried on the card instance, then main, then others; first success wins", async () => {
  const issues = jiraPool();
  const calls = [];
  const loaded = [];
  const result = await resolveMissingJiraIssues({
    workLogs: {
      day: [
        { description: "XX-1: a" },
        { description: "xx-1: dup", jiraUrl: `https://${MAIN}/` },
        { description: "XX-2: gone" },
      ],
    },
    issues,
    mainJiraUrl: `https://${MAIN}/`,
    instanceUrls: [`https://${OTHER}/`, "third.atlassian.net"],
    load: async (code, scope) => {
      calls.push([code, scope]);
      return code === "XX-1" && scope === OTHER
        ? { key: "XX-1", summary: "Found" }
        : null;
    },
    onLoaded: (issue, scope) => loaded.push([issue.key, scope]),
  });
  assert.deepEqual(calls, [
    ["XX-1", MAIN],
    ["XX-1", OTHER],
    ["XX-2", MAIN],
    ["XX-2", OTHER],
    ["XX-2", "third.atlassian.net"],
  ]);
  assert.deepEqual(loaded, [["XX-1", OTHER]]);
  assert.deepEqual(result.notFound, ["XX-2"]);
  assert.equal(result.issues[0].jiraUrl, OTHER);
  assert.equal(pickJiraIssue(result.issues, "XX-1", MAIN, MAIN).jiraUrl, OTHER);
});

test("a thrown Jira lookup does not stop the remaining instances", async () => {
  const result = await resolveMissingJiraIssues({
    workLogs: { day: [{ description: "ZZ-1: x" }] },
    issues: [],
    mainJiraUrl: MAIN,
    instanceUrls: [OTHER],
    load: async (code, scope) => {
      if (scope === MAIN) throw new Error("forbidden");
      return { key: code };
    },
    onLoaded: () => {},
  });
  assert.deepEqual(result.notFound, []);
  assert.equal(result.issues[0].jiraUrl, OTHER);
});

test("Jira matching never calls ClickUp", async () => {
  useWorkLogsStore.setState({
    workLogs: { day: [{ id: "a", description: "CE-1: x", clickupTeamId: "1" }] },
  });
  const pool = jiraPool([{ key: "CE-1" }]);
  await resolveMissingJiraIssues({
    workLogs: useWorkLogsStore.getState().workLogs,
    issues: pool,
    mainJiraUrl: MAIN,
    load: async () => assert.fail("no fetch expected"),
    onLoaded: () => {},
  });
  useWorkLogsStore.getState().bulkUpdateWorkLogsWithJira(pool, MAIN);
  const [card] = useWorkLogsStore.getState().workLogs.day;
  assert.equal(card.task, "CE-1");
  assert.equal(card.clickupTask, undefined);
  useWorkLogsStore.getState().resetAll();
});

test("formats the missing Jira key warning with a cap", () => {
  assert.equal(
    formatMissingJiraCodes(["ABC-1179", "XX-12"]),
    "Could not find Jira issue(s): ABC-1179, XX-12"
  );
  assert.equal(
    formatMissingJiraCodes(["A-1", "A-2", "A-3", "A-4", "A-5", "A-6", "A-7"]),
    "Could not find Jira issue(s): A-1, A-2, A-3, A-4, A-5 and 2 more"
  );
});

test("an authoritative card never falls back to another instance's issue", async () => {
  const issues = jiraPool([{ key: "QA-5", summary: "Unrelated" }], []);
  const calls = [];
  const result = await resolveMissingJiraIssues({
    workLogs: { day: [{ description: "QA-5: work", jiraUrl: OTHER }] },
    issues,
    mainJiraUrl: MAIN,
    instanceUrls: [OTHER],
    load: async (code, scope) => {
      calls.push([code, scope]);
      return null;
    },
    onLoaded: () => {},
  });
  assert.deepEqual(calls, [["QA-5", OTHER]]);
  assert.deepEqual(result.notFound, ["QA-5"]);
  assert.equal(pickJiraIssue(issues, "QA-5", OTHER, MAIN), null);

  const logs = [{ id: "a", description: "QA-5: work", jiraUrl: OTHER }];
  useWorkLogsStore.setState({ workLogs: { day: logs } });
  useWorkLogsStore.getState().bulkUpdateWorkLogsWithJira(issues, MAIN);
  assert.deepEqual(useWorkLogsStore.getState().workLogs.day[0], logs[0]);
  useWorkLogsStore.getState().resetAll();
});

test("an authoritative card links to its own instance without a fetch", async () => {
  const issues = jiraPool(
    [{ key: "QA-5", summary: "Main" }],
    [{ key: "QA-5", summary: "Other" }]
  );
  const result = await resolveMissingJiraIssues({
    workLogs: { day: [{ description: "QA-5: work", jiraUrl: OTHER }] },
    issues,
    mainJiraUrl: MAIN,
    instanceUrls: [OTHER],
    load: async () => assert.fail("no fetch expected"),
    onLoaded: () => {},
  });
  assert.deepEqual(result.notFound, []);
  assert.equal(pickJiraIssue(issues, "QA-5", OTHER, MAIN).summary, "Other");
});

test("an authoritative card's fetched issue stays on its own instance", async () => {
  const issues = jiraPool([{ key: "QA-5" }], []);
  const result = await resolveMissingJiraIssues({
    workLogs: { day: [{ description: "QA-5: work", jiraUrl: OTHER }] },
    issues,
    mainJiraUrl: MAIN,
    load: async (code) => ({ key: code, summary: "Fetched" }),
    onLoaded: () => {},
  });
  assert.deepEqual(result.notFound, []);
  assert.equal(pickJiraIssue(issues, "QA-5", OTHER, MAIN).summary, "Fetched");
});
