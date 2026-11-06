import test from "node:test";
import assert from "node:assert/strict";
import { submitWorklogRequests } from "./apiErrors.js";
import { isSentTo, markSent } from "./sentMarks.js";

const tick = () => new Promise((resolve) => setImmediate(resolve));

test("a fulfilled request is reported at once, while another is still pending", async () => {
  const D = "02-11-2026";
  let workLogs = { [D]: [{ id: "a" }, { id: "b" }] };
  let finishB;
  const requests = [
    { cardId: "a", context: "a", send: () => Promise.resolve("ok") },
    { cardId: "b", context: "b", send: () => new Promise((resolve) => { finishB = resolve; }) },
  ];
  const batch = submitWorklogRequests(requests, "Redmine", {
    onSuccess: (request) => { workLogs = markSent(workLogs, "redmine", [request.cardId]); },
  });
  await tick();
  assert.equal(isSentTo(workLogs[D][0], "redmine"), true, "marked before the batch ends");
  assert.equal(isSentTo(workLogs[D][1], "redmine"), false);
  finishB("ok");
  assert.deepEqual(await batch, { successfulCount: 2 });
  assert.equal(isSentTo(workLogs[D][1], "redmine"), true);
});

test("partial failure marks only the cards whose own request succeeded", async () => {
  const sent = [];
  const requests = ["a", "b", "c", "d", "e"].map((cardId, index) => ({
    cardId,
    context: cardId,
    send: () => (index % 2 === 0 ? Promise.resolve() : Promise.reject(new Error("nope"))),
  }));
  await assert.rejects(
    submitWorklogRequests(requests, "Jira", { onSuccess: (r) => sent.push(r.cardId) }),
    (error) => {
      assert.equal(error.successfulCount, 3);
      assert.match(error.message, /Jira: 3 of 5 worklogs saved; 2 failed\./);
      assert.match(error.message, /Do not resubmit the whole batch/);
      return true;
    }
  );
  assert.deepEqual(sent.sort(), ["a", "c", "e"]);
});

test("a throwing onSuccess does not turn a saved worklog into a failure", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const result = await submitWorklogRequests(
      [{ cardId: "a", context: "a", send: () => Promise.resolve() }],
      "ClickUp",
      { onSuccess: () => { throw new Error("storage"); } }
    );
    assert.deepEqual(result, { successfulCount: 1 });
  } finally {
    console.error = original;
  }
});

test("works without a callback", async () => {
  assert.deepEqual(
    await submitWorklogRequests([{ context: "a", send: () => Promise.resolve() }], "Jira"),
    { successfulCount: 1 }
  );
});
