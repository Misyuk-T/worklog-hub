import test from "node:test";
import assert from "node:assert/strict";
import useWorkLogsStore from "../store/worklogsStore.js";
import useJiraStore from "../store/jiraStore.js";

import {
  collectScopedTaskCodes,
  countUnscopedTaskCodes,
  findScopedItem,
  getDescriptionTaskCode,
  itemMatchesTaskCode,
  normalizeServiceScope,
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
