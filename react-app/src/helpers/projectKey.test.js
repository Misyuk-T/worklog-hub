import test from "node:test";
import assert from "node:assert/strict";
import {
  filterByProject,
  getProjectKey,
  summarizeByProject,
} from "./projectKey.js";

test("maps Cyrillic look-alikes in a ClickUp description", () => {
  assert.equal(getProjectKey({ source: "clickup", description: "СTV-26: x" }), "CTV");
});

test("reads the prefix of a ClickUp description", () => {
  assert.equal(
    getProjectKey({ source: "clickup", description: "HPE-4: Team meeting" }),
    "HPE",
  );
});

test("falls back to the ClickUp task key", () => {
  assert.equal(
    getProjectKey({ source: "clickup", description: "no key", taskKey: "afs-9" }),
    "AFS",
  );
});

test("uses the Jira issue key", () => {
  assert.equal(getProjectKey({ source: "jira", task: "WEB-124" }), "WEB");
});

test("Jira key with a digit in the project part", () => {
  assert.equal(getProjectKey({ source: "jira", task: "E2E-124" }), "E2E");
});

test("a valid Jira key wins over the description", () => {
  assert.equal(
    getProjectKey({ source: "jira", task: "E2E-124", description: "HPE-4: x" }),
    "E2E",
  );
});

test("Jira key with an underscore", () => {
  assert.equal(getProjectKey({ source: "jira", task: "AB_1-7" }), "AB_1");
});

test("Redmine without a prefix gives its project name", () => {
  assert.equal(
    getProjectKey({ source: "redmine", comments: "just work", project: { name: "Payments" } }),
    "Payments",
  );
});

test("Redmine with a prefix in the comment gives that key", () => {
  assert.equal(
    getProjectKey({ source: "redmine", comments: "HPE-12: x", project: { name: "Payments" } }),
    "HPE",
  );
});

test("junk input gives Other", () => {
  assert.equal(getProjectKey(null), "Other");
  assert.equal(getProjectKey({}), "Other");
  assert.equal(getProjectKey({ source: "clickup", description: 42 }), "Other");
  assert.equal(getProjectKey({ source: "redmine", comments: "x" }), "Other");
});

test("summarizes by project, biggest first, and filters days", () => {
  const a = {
    "01-10-2026": [
      { source: "clickup", description: "HPE-1: a", hours: 2 },
      { source: "clickup", description: "CP-2: b", hours: 1 },
    ],
    "02-10-2026": [{ source: "clickup", description: "CP-3: c", hours: 1 }],
  };
  const b = { "01-10-2026": [{ source: "redmine", comments: "HPE-1: a", hours: 3 }] };
  assert.deepEqual(summarizeByProject(a, b), [
    { project: "HPE", hours1: 2, hours2: 3 },
    { project: "CP", hours1: 2, hours2: 0 },
  ]);
  assert.deepEqual(Object.keys(filterByProject(a, "CP")), ["01-10-2026", "02-10-2026"]);
  assert.deepEqual(Object.keys(filterByProject(a, "HPE")), ["01-10-2026"]);
  assert.equal(filterByProject(a, null), a);
});
