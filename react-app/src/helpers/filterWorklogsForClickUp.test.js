import test from "node:test";
import assert from "node:assert/strict";
import { filterWorklogsForClickUp } from "./filterWorklogsForClickUp.js";

test("keeps the stored team and maps the ClickUp task and team as before", () => {
  const card = { id: "card-1", hours: 2, clickupTask: "task-1", clickupTeamId: "team-1" };
  const worklogs = { "2026-11-06": [card] };

  assert.deepEqual(filterWorklogsForClickUp(worklogs, "default-team"), {
    "2026-11-06": [{ ...card, task: "task-1", teamId: "team-1" }],
  });
  assert.deepEqual(worklogs, { "2026-11-06": [card] });
  assert.equal(card.task, undefined);
  assert.equal(card.teamId, undefined);
});

test("uses the default team when a card with a task has no stored team", () => {
  const card = { id: "card-1", hours: 2, clickupTask: "task-1" };

  assert.deepEqual(filterWorklogsForClickUp({ first: [card] }, "default-team"), {
    first: [{ ...card, task: "task-1", teamId: "default-team" }],
  });
  assert.equal(card.clickupTeamId, undefined);
});

test("excludes cards without a task even when a team is available", () => {
  assert.deepEqual(filterWorklogsForClickUp({ first: [
    { hours: 1, clickupTeamId: "team-1" },
    { hours: 2 },
  ] }, "default-team"), {});
});

test("excludes a task without a stored or default team", () => {
  assert.deepEqual(filterWorklogsForClickUp({ first: [
    { hours: 1, clickupTask: "task-1" },
  ] }), {});
});

test("keeps eligible cards grouped by date and omits empty dates", () => {
  const card = { hours: 1, clickupTask: "task-1", clickupTeamId: "team-1" };

  assert.deepEqual(filterWorklogsForClickUp({ first: [card, { hours: 2 }], second: [{}] }), {
    first: [{ ...card, task: "task-1", teamId: "team-1" }],
  });
});
