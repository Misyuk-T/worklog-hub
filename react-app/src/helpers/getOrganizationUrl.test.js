import test from "node:test";
import assert from "node:assert/strict";
import {
  getOrganizationUrls,
  getRedmineHostForDisplay,
  resolveRedmineBaseUrl,
} from "./getOrganizationUrl.js";

test("legacy slug expands to the redmine.<slug>.com host", () => {
  assert.equal(resolveRedmineBaseUrl("acme"), "https://redmine.acme.com");
  assert.equal(resolveRedmineBaseUrl("  acme  "), "https://redmine.acme.com");
});

test("a host or URL is used as is, with https added and trailing slash removed", () => {
  assert.equal(resolveRedmineBaseUrl("redmine.example.org"), "https://redmine.example.org");
  assert.equal(resolveRedmineBaseUrl("https://tracker.example.com/redmine/"), "https://tracker.example.com/redmine");
  assert.equal(resolveRedmineBaseUrl("tracker.example.com/redmine"), "https://tracker.example.com/redmine");
  assert.equal(resolveRedmineBaseUrl("http://intranet.example.com"), "http://intranet.example.com");
});

test("empty or non-string values resolve to an empty string", () => {
  for (const value of ["", "   ", undefined, null, 5]) {
    assert.equal(resolveRedmineBaseUrl(value), "");
  }
});

test("getOrganizationUrls keeps legacy behavior and supports hosts", () => {
  assert.deepEqual(getOrganizationUrls("acme.atlassian.net", "acme"), {
    redmineUrl: "https://redmine.acme.com",
    jiraUrl: "https://acme.atlassian.net",
  });
  assert.deepEqual(getOrganizationUrls("", "redmine.example.org"), {
    redmineUrl: "https://redmine.example.org",
    jiraUrl: "",
  });
  assert.deepEqual(getOrganizationUrls(undefined, undefined), { redmineUrl: "", jiraUrl: "" });
});

test("settings field shows the real host for legacy slugs", () => {
  assert.equal(getRedmineHostForDisplay("acme"), "redmine.acme.com");
  assert.equal(getRedmineHostForDisplay("redmine.example.org"), "redmine.example.org");
  assert.equal(getRedmineHostForDisplay("https://tracker.example.com/redmine/"), "tracker.example.com/redmine");
  assert.equal(getRedmineHostForDisplay(undefined), "");
});
