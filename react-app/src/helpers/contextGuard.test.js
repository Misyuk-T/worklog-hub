import test from "node:test";
import assert from "node:assert/strict";

import { canEditResults, captureContext, contextKey } from "./contextGuard.js";

test("an unchanged context stays current", () => {
  const live = { personId: "redmine:1", presetId: "a", generation: 3 };
  const isCurrent = captureContext(() => live);
  assert.equal(isCurrent(), true);
});

test("a changed person, preset or generation is no longer current", () => {
  for (const patch of [
    { personId: "redmine:2" },
    { presetId: "b" },
    { generation: 4 },
  ]) {
    const live = { personId: "redmine:1", presetId: "a", generation: 3 };
    const isCurrent = captureContext(() => live);
    Object.assign(live, patch);
    assert.equal(isCurrent(), false, JSON.stringify(patch));
  }
});

test("checking A, switching to B, then A answering is dropped", () => {
  const live = { personId: "redmine:A", presetId: "p", generation: 1 };
  const checkA = captureContext(() => live);
  Object.assign(live, { personId: "redmine:B", generation: 2 });
  const checkB = captureContext(() => live);
  assert.equal(checkA(), false);
  assert.equal(checkB(), true);
});

test("missing person means me", () => {
  assert.equal(contextKey({ presetId: "a" }), contextKey({ personId: "me", presetId: "a", generation: 0 }));
});

test("results are editable only for me in the same preset and generation", () => {
  const ctx = { personId: "me", presetId: "a", generation: 2 };
  assert.equal(canEditResults(ctx, { personId: "me", presetId: "a", generation: 2 }), true);
  assert.equal(canEditResults(ctx, { personId: "redmine:7", presetId: "a", generation: 2 }), false);
  assert.equal(canEditResults(ctx, { personId: "me", presetId: "b", generation: 2 }), false);
  assert.equal(canEditResults(ctx, { personId: "me", presetId: "a", generation: 3 }), false);
  assert.equal(canEditResults(null, { personId: "me", presetId: "a", generation: 2 }), false);
});

test("stale me results never become editable under another person", () => {
  const stale = { personId: "me", presetId: "a", generation: 5 };
  const other = { personId: "redmine:7", presetId: "a", generation: 5 };
  assert.equal(canEditResults(stale, other), false);
  // Results fetched for a person are never editable, even if live is that person.
  const forPerson = { personId: "redmine:7", presetId: "a", generation: 5 };
  assert.equal(canEditResults(forPerson, other), false);
});

test("a mutation captured before a person switch is no longer current", () => {
  const live = { personId: "me", presetId: "a", generation: 5 };
  const stillCurrent = captureContext(() => live);
  Object.assign(live, { personId: "redmine:7", generation: 6 });
  assert.equal(stillCurrent(), false);
});
