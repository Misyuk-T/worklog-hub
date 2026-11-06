import test from "node:test";
import assert from "node:assert/strict";
import { filterWorklogsForRedmine } from "./filterWorklogsForRedmine.js";
import { validateWorkLogsData } from "./validateWorklogsData.js";

const card = (over = {}) => ({
  id: "a",
  date: "02-11-2026",
  description: "Work",
  hours: 2,
  project: 101,
  ...over,
});

test("keeps cards with a project and drops the others", () => {
  const withProject = card();
  const result = filterWorklogsForRedmine({
    "02-11-2026": [withProject, card({ id: "b", project: undefined }), card({ id: "c", project: "" })],
  });
  assert.deepEqual(result, { "02-11-2026": [withProject] });
});

test("drops days left with no cards and keeps the input untouched", () => {
  const logs = { "02-11-2026": [card({ project: undefined })], "03-11-2026": [] };
  assert.deepEqual(filterWorklogsForRedmine(logs), {});
  assert.equal(logs["02-11-2026"].length, 1);
});

test("handles null, undefined and malformed input", () => {
  assert.deepEqual(filterWorklogsForRedmine(null), {});
  assert.deepEqual(filterWorklogsForRedmine(undefined), {});
  assert.deepEqual(filterWorklogsForRedmine({ a: null, b: [null, card()] }), { b: [card()] });
});

test("the filtered set passes validation, and a skipped card's month does not matter", () => {
  const logs = {
    "02-11-2026": [card()],
    "03-10-2026": [card({ id: "z", date: "03-10-2026", project: undefined })],
  };
  assert.throws(() => validateWorkLogsData(logs, false));
  assert.equal(validateWorkLogsData(filterWorklogsForRedmine(logs), false), true);
});
