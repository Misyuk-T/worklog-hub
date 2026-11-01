import test from "node:test";
import assert from "node:assert/strict";
import { moveDayWorkLogs } from "./moveDayWorkLogs.js";
import useWorkLogsStore from "../store/worklogsStore.js";

const from = "01-11-2026";
const to = "03-11-2026";

test("moves every card, keeps ids and fields, and does not mutate the input", () => {
  const cards = [{ id: "a", date: from, hours: 2 }, { id: "b", date: from }];
  const logs = { [from]: cards, "02-11-2026": [{ id: "other" }] };
  const moved = moveDayWorkLogs(logs, from, to);
  assert.equal(moved[from], undefined);
  assert.deepEqual(moved[to], cards.map((card) => ({ ...card, date: to })));
  assert.equal(logs[from], cards);
  assert.equal(cards[0].date, from);
  assert.equal(moved["02-11-2026"], logs["02-11-2026"]);
});

test("appends after existing destination cards", () => {
  const existing = { id: "existing", date: to };
  const result = moveDayWorkLogs({ [from]: [{ id: "moved", date: from }], [to]: [existing] }, from, to);
  assert.deepEqual(result[to], [existing, { id: "moved", date: to }]);
  assert.equal(result[to][0], existing);
});

test("same date, missing source and empty state are no-ops", () => {
  const logs = { [from]: [{ id: "a", date: from }] };
  assert.equal(moveDayWorkLogs(logs, from, from), logs);
  assert.equal(moveDayWorkLogs(logs, to, from), logs);
  assert.equal(moveDayWorkLogs(null, from, to), null);
});

test("a moved card can be saved and deleted at its destination without duplication", () => {
  const store = useWorkLogsStore;
  store.getState().addWorkLogs({ [from]: [{ id: "a", date: from, hours: 1 }] });
  store.getState().moveDayWorkLogs(from, to);
  store.getState().updateWorkLog(to, "a", { date: to, hours: 3 });
  assert.deepEqual(store.getState().workLogs, { [to]: [{ id: "a", date: to, hours: 3 }] });
  store.getState().deleteWorkLog(to, "a");
  assert.deepEqual(store.getState().workLogs, {});
  store.getState().resetAll();
});
