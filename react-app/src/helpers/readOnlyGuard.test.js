import test from "node:test";
import assert from "node:assert/strict";
import { shouldBlockRequest } from "./readOnlyGuard.js";

test("ordinary requests are never blocked", () => {
  for (const method of ["get", "post", "put", "delete"]) {
    assert.equal(shouldBlockRequest({ method, url: "/redmine/time_entries.json" }), false);
  }
  assert.equal(
    shouldBlockRequest({ method: "put", url: "/x", credentialsPresetId: "a", activePresetId: "a" }),
    false,
  );
});

test("read-only requests may only GET", () => {
  for (const method of ["post", "put", "delete", "PATCH"]) {
    assert.equal(shouldBlockRequest({ method, url: "/redmine/time_entries.json", readOnly: true }), true);
  }
  assert.equal(shouldBlockRequest({ method: "get", url: "/redmine/users.json", readOnly: true }), false);
  assert.equal(shouldBlockRequest({ method: undefined, url: "/x", readOnly: true }), false);
});

test("Jira search is the only allowed read-only POST", () => {
  assert.equal(
    shouldBlockRequest({ method: "post", url: "/jira/rest/api/3/search/jql", readOnly: true }),
    false,
  );
  assert.equal(
    shouldBlockRequest({ method: "post", url: "/jira/rest/api/3/search/jql?x=1", readOnly: true }),
    false,
  );
  assert.equal(
    shouldBlockRequest({ method: "post", url: "/jira/rest/api/3/issue/A-1/worklog", readOnly: true }),
    true,
  );
  assert.equal(
    shouldBlockRequest({ method: "put", url: "/jira/rest/api/3/search/jql", readOnly: true }),
    true,
  );
  assert.equal(
    shouldBlockRequest({ method: "post", url: "/jira/rest/api/3/search/jql/evil", readOnly: true }),
    true,
  );
});

test("keys of a non-active preset are always read-only", () => {
  assert.equal(
    shouldBlockRequest({ method: "delete", url: "/clickup/x", credentialsPresetId: "old", activePresetId: "new" }),
    true,
  );
  assert.equal(
    shouldBlockRequest({ method: "get", url: "/clickup/team", credentialsPresetId: "old", activePresetId: "new" }),
    false,
  );
  assert.equal(
    shouldBlockRequest({ method: "post", url: "/jira/rest/api/3/search/jql", credentialsPresetId: "old", activePresetId: "new" }),
    false,
  );
});
