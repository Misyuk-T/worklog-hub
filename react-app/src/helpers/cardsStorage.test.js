import test from "node:test";
import assert from "node:assert/strict";
import { cardsKey, clearCards, loadCards, parseCards, saveCards } from "./cardsStorage.js";

const fakeStorage = (initial = {}) => {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
  };
};

const cards = { "02-11-2026": [{ id: "a", date: "02-11-2026", description: "a", hours: 2, project: 101 }] };
const key = cardsKey("owner-1");

test("key is scoped to the owner", () => {
  assert.equal(key, "worklog-hub:cards:owner-1");
});

test("saves and loads a snapshot with the version and flags", () => {
  const storage = fakeStorage();
  assert.equal(saveCards(storage, "owner-1", { workLogs: cards, isJiraExport: true, isClickUpExport: false }), true);
  assert.deepEqual(JSON.parse(storage.map.get(key)), {
    v: 1, workLogs: cards, isJiraExport: true, isClickUpExport: false,
  });
  assert.deepEqual(loadCards(storage, "owner-1"), {
    workLogs: cards, isJiraExport: true, isClickUpExport: false,
  });
});

test("one account never reads another account's cards", () => {
  const storage = fakeStorage();
  saveCards(storage, "owner-1", { workLogs: cards });
  assert.equal(loadCards(storage, "owner-2"), null);
});

test("null or empty cards remove the key", () => {
  const storage = fakeStorage();
  saveCards(storage, "owner-1", { workLogs: cards });
  assert.equal(saveCards(storage, "owner-1", { workLogs: {} }), false);
  assert.equal(storage.map.has(key), false);
  saveCards(storage, "owner-1", { workLogs: cards });
  saveCards(storage, "owner-1", { workLogs: null });
  assert.equal(storage.map.has(key), false);
  saveCards(storage, "owner-1", { workLogs: cards });
  clearCards(storage, "owner-1");
  assert.equal(storage.map.has(key), false);
});

test("corrupt JSON, wrong version and wrong shape return null and remove the key", () => {
  const bad = [
    "{not json",
    JSON.stringify({ v: 2, workLogs: cards }),
    JSON.stringify({ workLogs: cards }),
    JSON.stringify({ v: 1, workLogs: [] }),
    JSON.stringify({ v: 1, workLogs: { d: "x" } }),
    JSON.stringify({ v: 1, workLogs: { d: [1] } }),
    JSON.stringify({ v: 1, workLogs: { d: [null] } }),
    JSON.stringify({ v: 1, workLogs: {} }),
    JSON.stringify(null),
    JSON.stringify([]),
  ];
  for (const raw of bad) {
    const storage = fakeStorage({ [key]: raw });
    assert.equal(loadCards(storage, "owner-1"), null, raw);
    assert.equal(storage.map.has(key), false, raw);
  }
});

test("storage errors never throw", () => {
  const broken = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("quota"); },
    removeItem: () => { throw new Error("blocked"); },
  };
  assert.equal(loadCards(broken, "owner-1"), null);
  assert.equal(saveCards(broken, "owner-1", { workLogs: cards }), false);
  assert.equal(clearCards(broken, "owner-1"), false);
  assert.equal(loadCards(null, "owner-1"), null);
  assert.equal(saveCards(undefined, "owner-1", { workLogs: cards }), false);
});

test("a failed save drops the stale snapshot instead of keeping it", () => {
  const storage = fakeStorage({ [key]: JSON.stringify({ v: 1, workLogs: cards }) });
  storage.setItem = () => { throw new Error("quota"); };
  assert.equal(saveCards(storage, "owner-1", { workLogs: { x: [{ id: "n" }] } }), false);
  assert.equal(storage.map.has(key), false);
});

test("nothing is read or written without an owner", () => {
  const storage = fakeStorage();
  assert.equal(saveCards(storage, null, { workLogs: cards }), false);
  assert.equal(saveCards(storage, "", { workLogs: cards }), false);
  assert.equal(storage.map.size, 0);
  assert.equal(loadCards(storage, undefined), null);
});

test("parseCards leaves the storage alone and defaults the flags", () => {
  assert.deepEqual(parseCards(JSON.stringify({ v: 1, workLogs: cards })), {
    workLogs: cards, isJiraExport: false, isClickUpExport: false,
  });
  assert.equal(parseCards(null), null);
});

const wrap = (workLogs) => JSON.stringify({ v: 1, workLogs });
const D = "02-11-2026";
const card = (over = {}) => ({ id: "x", date: D, description: "d", hours: 1, ...over });

test("malformed snapshots are rejected and removed", () => {
  const bad = [
    { [D]: [{}] },
    { d: [] },
    { [D]: [] },
    { "31-02-2026": [card({ date: "31-02-2026" })] },
    { "2026-11-02": [card()] },
    { [D]: [card({ date: undefined })] },
    { [D]: [card({ date: "nope" })] },
    { [D]: [card({ date: "31-02-2026" })] },
    { [D]: [card({ hours: undefined })] },
    { [D]: [card({ hours: null })] },
    { [D]: [card({ hours: "abc" })] },
    { [D]: [card({ hours: "" })] },
    { [D]: [card({ hours: {} })] },
    { [D]: [card({ description: undefined })] },
    { [D]: [card({ description: 5 })] },
    { [D]: ["x"] },
  ];
  for (const logs of bad) {
    const raw = wrap(logs);
    assert.equal(parseCards(raw), null, raw);
    const storage = fakeStorage({ [key]: raw });
    assert.equal(loadCards(storage, "owner-1"), null, raw);
    assert.equal(storage.map.has(key), false, raw);
  }
  // NaN and Infinity serialise to null in JSON, so test the parser directly
  assert.equal(parseCards(wrap({ [D]: [card({ hours: "NaN" })] })), null);
  assert.equal(parseCards(wrap({ [D]: [card({ hours: "Infinity" })] })), null);
});

test("fields the UI renders as text reject objects and arrays, accept strings, numbers and nullish", () => {
  const fields = ["jiraUrl", "project", "task", "clickupTask", "clickupTeamId", "blb", "taskKey", "taskName"];
  for (const field of fields) {
    for (const value of [{}, { value: "a" }, ["a"], true]) {
      const raw = wrap({ [D]: [card({ [field]: value })] });
      assert.equal(parseCards(raw), null, `${field}=${raw}`);
    }
    for (const value of ["", "abc", 101, null, undefined]) {
      assert.ok(parseCards(wrap({ [D]: [card({ [field]: value })] })), `${field}=${value}`);
    }
  }
});

test("cards from every source are accepted", () => {
  const sources = {
    jira: { description: "PRJ-1 work", hours: 1.5, date: D, task: "PRJ-1", project: "", blb: "nblb", id: "u1", jiraUrl: "https://x.atlassian.net", worklogId: "10", issueId: "5", issueKey: "PRJ-1", started: "2026-11-02T09:00:00.000+0000", timeSpentSeconds: 5400 },
    clickup: { id: "c1", clickupTask: "abc", taskKey: "abc", taskName: "T", description: "", hours: 0.25, date: D, clickupTeamId: "1", teamId: "1", blb: "blb", billable: true, url: null },
    redmine: { id: "r1", sourceId: 7, date: D, description: "", hours: 2, blb: "nblb", project: 101, task: "", clickupTeamId: "", clickupTask: "" },
    file: { description: "from file", hours: "3.5", date: D, project: "", blb: "nblb", id: "f1" },
    plus: { id: "p1", date: D, description: "New task", hours: 0.25, blb: "nblb", project: "", task: "", jiraUrl: "https://x.atlassian.net" },
  };
  for (const [name, source] of Object.entries(sources)) {
    const snapshot = parseCards(wrap({ [D]: [source] }));
    assert.ok(snapshot, name);
    assert.deepEqual(snapshot.workLogs[D][0], source, name);
  }
});
