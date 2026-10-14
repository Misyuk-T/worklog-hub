import test from "node:test";
import assert from "node:assert/strict";
import {
  isJiraConfigured,
  validateJiraField,
} from "./jiraSettings.js";

const empty = { jiraEmail: "", jiraApiKey: "", jiraUrl: "" };

test("all Jira fields empty is valid", () => {
  for (const id of Object.keys(empty)) {
    assert.equal(validateJiraField(empty[id], empty), true);
  }
  assert.equal(
    validateJiraField("  ", { jiraEmail: " ", jiraApiKey: "", jiraUrl: "" }),
    true
  );
  assert.equal(isJiraConfigured(empty), false);
});

test("one filled Jira field makes the other two required", () => {
  const values = { ...empty, jiraEmail: "me@example.com" };
  assert.equal(validateJiraField(values.jiraEmail, values), true);
  assert.equal(validateJiraField(values.jiraApiKey, values), false);
  assert.equal(validateJiraField(values.jiraUrl, values), false);
  assert.equal(isJiraConfigured(values), false);
});

test("fully filled Jira fields are valid and configured", () => {
  const values = {
    jiraEmail: "me@example.com",
    jiraApiKey: "key",
    jiraUrl: "acme.atlassian.net",
  };
  for (const id of Object.keys(values)) {
    assert.equal(validateJiraField(values[id], values), true);
  }
  assert.equal(isJiraConfigured(values), true);
});
