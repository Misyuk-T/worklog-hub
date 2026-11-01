import test from "node:test";
import assert from "node:assert/strict";

import {
  declaredJiraHosts,
  isJiraHostAllowed,
} from "./credentialHost.js";

const preset = {
  id: "a",
  jiraUrl: "acme.atlassian.net",
  additionalJiraUrls: [{ url: "https://other.atlassian.net/" }, { url: "" }],
};

test("main host is allowed", () => {
  assert.equal(isJiraHostAllowed(preset, "acme.atlassian.net"), true);
});

test("additional host is allowed", () => {
  assert.equal(isJiraHostAllowed(preset, "other.atlassian.net"), true);
});

test("foreign host is rejected", () => {
  assert.equal(isJiraHostAllowed(preset, "evil.atlassian.net"), false);
  assert.equal(isJiraHostAllowed(preset, "acme.atlassian.net.evil.com"), false);
});

test("missing host or credentials is rejected", () => {
  assert.equal(isJiraHostAllowed(preset, undefined), false);
  assert.equal(isJiraHostAllowed(preset, ""), false);
  assert.equal(isJiraHostAllowed(null, "acme.atlassian.net"), false);
  assert.equal(isJiraHostAllowed({}, "acme.atlassian.net"), false);
});

test("http, https, trailing slash and case variants match", () => {
  for (const variant of [
    "http://acme.atlassian.net",
    "https://acme.atlassian.net",
    "https://acme.atlassian.net/",
    "ACME.atlassian.net",
    " acme.atlassian.net ",
  ]) {
    assert.equal(isJiraHostAllowed(preset, variant), true, variant);
  }
  assert.equal(
    isJiraHostAllowed({ jiraUrl: "https://acme.atlassian.net/" }, "acme.atlassian.net"),
    true,
  );
});

test("blank declared hosts are ignored", () => {
  assert.deepEqual(declaredJiraHosts(preset), [
    "acme.atlassian.net",
    "other.atlassian.net",
  ]);
  assert.equal(isJiraHostAllowed({ jiraUrl: "", additionalJiraUrls: [{ url: "" }] }, ""), false);
});
