import test from "node:test";
import assert from "node:assert/strict";
import { ensureWorkLogIds } from "./ensureWorkLogIds.js";
import useWorkLogsStore from "../store/worklogsStore.js";

test("preserves first real IDs and assigns distinct IDs to missing and duplicate cards", () => {
  const logs = { first: [{ id: "a" }, {}, { id: "a" }], second: [{ id: "b" }, { id: null }] };
  const ids = ["b", "new-1", "new-2", "new-3"];
  const result = ensureWorkLogIds(logs, () => ids.shift());
  assert.deepEqual(result.first.map((card) => card.id), ["a", "new-1", "new-2"]);
  assert.deepEqual(result.second.map((card) => card.id), ["b", "new-3"]);
  assert.equal(logs.first[1].id, undefined);
});

test("saving an imported card without an ID updates only that card", () => {
  const store = useWorkLogsStore;
  const date = "01-11-2026";
  store.getState().addWorkLogs({ [date]: [{ hours: 1 }, { hours: 2 }] });
  const [first, second] = store.getState().workLogs[date];
  assert.notEqual(first.id, second.id);
  store.getState().updateWorkLog(date, first.id, { date, hours: 3 });
  assert.deepEqual(store.getState().workLogs[date].map((card) => card.hours), [3, 2]);
  store.getState().resetAll();
});
