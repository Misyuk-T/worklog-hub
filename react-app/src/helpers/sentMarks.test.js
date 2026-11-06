import test from "node:test";
import assert from "node:assert/strict";
import {
  applyMarkEntries,
  clearSent,
  diffMarks,
  dropSent,
  isSentTo,
  markAllSent,
  markSent,
  mergeMarks,
  sentServices,
  sentSummary,
} from "./sentMarks.js";
import { filterWorklogsForRedmine } from "./filterWorklogsForRedmine.js";
import { filterWorklogsByTask } from "./filterWorklogsForJira.js";
import { filterWorklogsForClickUp } from "./filterWorklogsForClickUp.js";
import { parseCards, saveCards } from "./cardsStorage.js";
import { transformToRedmineData } from "./transformToRedmineData.js";
import useWorkLogsStore from "../store/worklogsStore.js";

const D1 = "02-11-2026";
const D2 = "03-11-2026";
const card = (id, extra = {}) => ({
  id,
  date: D1,
  description: `card ${id}`,
  hours: 1,
  project: 100,
  task: "CE-1",
  clickupTask: "abc",
  clickupTeamId: "t1",
  ...extra,
});
const base = () => ({
  [D1]: [card("a"), card("b")],
  [D2]: [card("c", { date: D2 })],
});

test("markSent marks only the given ids and leaves other cards untouched", () => {
  const logs = base();
  const next = markSent(logs, "redmine", ["a", "c"]);
  assert.equal(isSentTo(next[D1][0], "redmine"), true);
  assert.equal(isSentTo(next[D1][1], "redmine"), false);
  assert.equal(isSentTo(next[D2][0], "redmine"), true);
  assert.equal(next[D1][1], logs[D1][1], "unchanged card keeps its identity");
  assert.equal(logs[D1][0].sentTo, undefined, "input is not mutated");
});

test("markSent keeps marks for other trackers and returns the same object when nothing changes", () => {
  const logs = markSent(base(), "redmine", ["a"]);
  const both = markSent(logs, "clickup", ["a"]);
  assert.deepEqual(sentServices(both[D1][0]), ["redmine", "clickup"]);
  assert.equal(markSent(both, "clickup", ["a"]), both);
  assert.equal(markSent(both, "jira", []), both);
  assert.equal(markSent(both, "jira", ["missing"]), both);
});

test("marks accept null workLogs (empty state)", () => {
  assert.equal(markSent(null, "redmine", ["a"]), null);
  assert.equal(clearSent(null, "redmine", "a"), null);
  assert.equal(markAllSent(null, "jira"), null);
  assert.equal(mergeMarks(null, base()), null);
  assert.deepEqual(diffMarks(null, null), { added: [], removed: [] });
  assert.deepEqual(sentSummary(null, "redmine", () => true), { qualifying: 0, sent: 0 });
  assert.deepEqual(dropSent(null, null, "redmine"), {});
  assert.deepEqual(dropSent(base(), null, "redmine"), base());
});

test("clearSent removes only that tracker's mark and drops an empty sentTo", () => {
  const both = markSent(markSent(base(), "redmine", ["a"]), "jira", ["a"]);
  const one = clearSent(both, "redmine", "a");
  assert.deepEqual(one[D1][0].sentTo, { jira: true });
  const none = clearSent(one, "jira", "a");
  assert.equal("sentTo" in none[D1][0], false);
  assert.equal(clearSent(none, "jira", "a"), none);
});

test("markAllSent marks every card for that tracker", () => {
  const next = markAllSent(base(), "jira");
  assert.equal(Object.values(next).flat().every((c) => isSentTo(c, "jira")), true);
  assert.equal(Object.values(next).flat().some((c) => isSentTo(c, "redmine")), false);
});

test("filters skip cards already sent to that tracker only", () => {
  const logs = markSent(base(), "redmine", ["a"]);
  assert.deepEqual(filterWorklogsForRedmine(logs)[D1].map((c) => c.id), ["b"]);
  assert.deepEqual(filterWorklogsByTask(logs)[D1].map((c) => c.id), ["a", "b"]);
  assert.deepEqual(filterWorklogsForClickUp(logs, "t1")[D1].map((c) => c.id), ["a", "b"]);

  const all = markAllSent(base(), "redmine");
  assert.deepEqual(filterWorklogsForRedmine(all), {});

  const jira = markSent(base(), "jira", ["a", "b", "c"]);
  assert.deepEqual(filterWorklogsByTask(jira), {});
  const clickup = markSent(base(), "clickup", ["a", "b", "c"]);
  assert.deepEqual(filterWorklogsForClickUp(clickup, "t1"), {});
});

test("filters handle null workLogs", () => {
  assert.deepEqual(filterWorklogsForRedmine(null), {});
  assert.deepEqual(filterWorklogsByTask(null), {});
  assert.deepEqual(filterWorklogsForClickUp(null, "t1"), {});
});

test("sentSummary counts sent cards among those that could go", () => {
  const logs = markSent(
    { [D1]: [card("a"), card("b", { project: "" }), card("c")] },
    "redmine",
    ["a", "b"]
  );
  assert.deepEqual(
    sentSummary(logs, "redmine", (c) => Boolean(c.project)),
    { qualifying: 2, sent: 1 }
  );
});

test("dropSent removes cards marked in the latest state and prunes empty days", () => {
  const shown = filterWorklogsForRedmine(base());
  const latest = markSent(base(), "redmine", ["a", "c"]);
  const result = dropSent(shown, latest, "redmine");
  assert.deepEqual(Object.keys(result), [D1]);
  assert.deepEqual(result[D1].map((c) => c.id), ["b"]);
  assert.deepEqual(dropSent(shown, base(), "redmine"), shown, "nothing changed -> same cards");
});

test("mergeMarks adds marks from the source, never removes", () => {
  const mine = markSent(base(), "redmine", ["a"]);
  const theirs = markSent(base(), "clickup", ["a", "b"]);
  const merged = mergeMarks(mine, theirs);
  assert.deepEqual(sentServices(merged[D1][0]), ["redmine", "clickup"]);
  assert.deepEqual(sentServices(merged[D1][1]), ["clickup"]);
  assert.equal(mergeMarks(mine, base()), mine);
  const unknownCard = { [D1]: [card("zzz")] };
  assert.equal(mergeMarks(unknownCard, theirs), unknownCard);
});

test("diffMarks reports added and cleared marks, not new or moved cards", () => {
  const before = markSent(base(), "redmine", ["a"]);
  const after = clearSent(markSent(before, "jira", ["b"]), "redmine", "a");
  assert.deepEqual(diffMarks(before, after), {
    added: [{ id: "b", service: "jira" }],
    removed: [{ id: "a", service: "redmine" }],
  });
  const withNew = { ...before, [D2]: [...before[D2], card("n", { sentTo: { jira: true } })] };
  assert.deepEqual(diffMarks(before, withNew), { added: [], removed: [] });
});

test("applyMarkEntries re-applies missing marks and drops seen ones and deleted cards", () => {
  const logs = markSent(base(), "jira", ["b"]);
  const { workLogs, remaining } = applyMarkEntries(logs, [
    { id: "a", service: "redmine" },
    { id: "b", service: "jira" },
    { id: "gone", service: "redmine" },
  ]);
  assert.equal(isSentTo(workLogs[D1][0], "redmine"), true);
  assert.deepEqual(remaining, [{ id: "a", service: "redmine" }]);
});

test("cardsStorage accepts sentTo and rejects a non-object", () => {
  const snapshot = (sentTo) => ({
    workLogs: { [D1]: [{ ...card("a"), sentTo }] },
  });
  const raw = (sentTo) =>
    JSON.stringify({ v: 1, workLogs: snapshot(sentTo).workLogs });
  const parsed = parseCards(raw({ redmine: true, clickup: true }));
  assert.deepEqual(parsed.workLogs[D1][0].sentTo, { redmine: true, clickup: true });
  assert.ok(parseCards(raw(undefined)), "absent sentTo is fine");
  for (const bad of ["redmine", 5, null, ["redmine"], { redmine: "yes" }]) {
    assert.equal(parseCards(raw(bad)), null, JSON.stringify(bad));
  }
  const storage = new Map();
  const fake = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, v),
    removeItem: (k) => storage.delete(k),
  };
  saveCards(fake, "A", snapshot({ jira: true }));
  assert.match([...storage.values()][0], /"sentTo":\{"jira":true\}/);
});

test("Redmine requests keep the card order used to pair them with ids", () => {
  const logs = { [D1]: [card("a", { project: 1 }), card("b", { project: 2 })], [D2]: [card("c", { project: 3 })] };
  const ids = Object.values(logs).flat().map((c) => c.id);
  const issues = transformToRedmineData(logs).map((e) => e.time_entry.issue_id);
  assert.deepEqual(issues, [1, 2, 3]);
  assert.deepEqual(ids, ["a", "b", "c"]);
});

test("store: marks survive edits and date changes; a stale sentTo cannot change them", () => {
  const store = useWorkLogsStore;
  store.setState({ workLogs: base() });
  store.getState().markCardsSent("redmine", ["a"]);
  assert.equal(isSentTo(store.getState().workLogs[D1][0], "redmine"), true);

  const edited = { ...store.getState().workLogs[D1][0], description: "changed" };
  store.getState().updateWorkLog(D1, "a", edited);
  assert.equal(store.getState().workLogs[D1][0].description, "changed");
  assert.equal(isSentTo(store.getState().workLogs[D1][0], "redmine"), true);

  store.getState().updateWorkLog(D1, "a", { ...edited, date: D2 });
  const moved = store.getState().workLogs[D2].find((c) => c.id === "a");
  assert.equal(isSentTo(moved, "redmine"), true, "kept after changing the date");

  store.getState().updateWorkLog(D2, "a", { ...moved, sentTo: undefined });
  assert.equal(isSentTo(store.getState().workLogs[D2].find((c) => c.id === "a"), "redmine"), true);

  store.getState().moveDayWorkLogs(D2, "04-11-2026");
  assert.equal(isSentTo(store.getState().workLogs["04-11-2026"].find((c) => c.id === "a"), "redmine"), true);

  store.getState().clearCardSent("redmine", "a");
  assert.equal(isSentTo(store.getState().workLogs["04-11-2026"].find((c) => c.id === "a"), "redmine"), false);

  store.setState({ workLogs: null });
  store.getState().markCardsSent("redmine", ["a"]);
  store.getState().clearCardSent("redmine", "a");
  assert.equal(store.getState().workLogs, null);
});
