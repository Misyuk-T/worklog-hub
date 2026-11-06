import test from "node:test";
import assert from "node:assert/strict";
import { filterWorklogsByTask } from "./filterWorklogsForJira.js";

test("keeps only cards with a Jira task", () => {
  const withTask = { id: "a", task: "CE-1" };
  assert.deepEqual(
    filterWorklogsByTask({
      d1: [withTask, { id: "b", task: "" }, { id: "c" }, { id: "d", task: null }],
    }),
    { d1: [withTask] }
  );
});

test("drops days left empty and handles null input", () => {
  assert.deepEqual(filterWorklogsByTask({ d1: [{ id: "b" }], d2: [] }), {});
  assert.deepEqual(filterWorklogsByTask(null), {});
});
