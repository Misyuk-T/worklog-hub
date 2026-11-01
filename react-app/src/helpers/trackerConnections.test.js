import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClickUpConnections,
  buildJiraConnections,
  credentialsSignature,
  listClickUpKeys,
} from "./trackerConnections.js";

const work = {
  id: "work",
  presetName: "Work",
  jiraUrl: "https://Acme.atlassian.net/",
  jiraEmail: "me@acme.com",
  jiraApiKey: "work-jira-key",
  additionalJiraUrls: [{ url: "client.atlassian.net" }],
  clickupApiKey: "cu-shared",
};
const side = {
  id: "side",
  presetName: "Side",
  jiraUrl: "acme.atlassian.net",
  jiraEmail: "me@side.com",
  jiraApiKey: "side-jira-key",
  additionalJiraUrls: [{ url: "other.atlassian.net" }, { url: "" }],
  clickupApiKey: "cu-shared",
};
const noJira = { id: "bare", presetName: "Bare", jiraUrl: "x.atlassian.net", clickupApiKey: "cu-bare" };
const settings = { side, work, bare: noJira };

test("one Jira connection per host; the active preset's credentials win", () => {
  const forWork = buildJiraConnections(settings, "work");
  assert.deepEqual(forWork.map((c) => c.host), [
    "acme.atlassian.net",
    "client.atlassian.net",
    "other.atlassian.net",
  ]);
  assert.equal(forWork[0].credentials.jiraApiKey, "work-jira-key");

  const forSide = buildJiraConnections(settings, "side");
  assert.equal(forSide.find((c) => c.host === "acme.atlassian.net").presetId, "side");
});

test("without an active match the first preset wins and presets without a Jira login are skipped", () => {
  const connections = buildJiraConnections(settings, "bare");
  assert.ok(!connections.some((c) => c.host === "x.atlassian.net"));
  assert.equal(connections.find((c) => c.host === "acme.atlassian.net").presetId, "side");
});

test("a key is only ever paired with hosts of its own preset", () => {
  for (const activeId of ["work", "side", "bare", undefined]) {
    for (const connection of buildJiraConnections(settings, activeId)) {
      const owner = settings[connection.presetId];
      const hosts = [owner.jiraUrl, ...owner.additionalJiraUrls.map((u) => u.url)].map((h) =>
        h.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase(),
      );
      assert.ok(hosts.includes(connection.host));
      assert.equal(connection.credentials, owner);
    }
  }
});

test("ClickUp keys are deduplicated and the active preset comes first", () => {
  assert.deepEqual(listClickUpKeys(settings, "bare").map((p) => p.id), ["bare", "side"]);
  assert.deepEqual(listClickUpKeys(settings, "work").map((p) => p.id), ["work", "bare"]);
});

test("one ClickUp connection per workspace, first key wins", () => {
  const connections = buildClickUpConnections([
    { preset: work, teams: [{ id: 1, name: "Acme", members: [] }] },
    { preset: noJira, teams: [{ id: "1", name: "Acme" }, { id: 2, name: "Bare" }] },
  ]);
  assert.deepEqual(connections.map((c) => [c.teamId, c.presetId]), [["1", "work"], ["2", "bare"]]);
});

test("the credentials signature changes with any key but not with other fields", () => {
  const base = credentialsSignature(work);
  assert.notEqual(base, credentialsSignature({ ...work, clickupApiKey: "new" }));
  assert.notEqual(base, credentialsSignature({ ...work, id: "other" }));
  assert.notEqual(base, credentialsSignature({ ...work, additionalJiraUrls: [] }));
  assert.equal(base, credentialsSignature({ ...work, presetName: "Renamed" }));
  assert.equal(credentialsSignature(null), "");
});
