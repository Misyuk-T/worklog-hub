import test from "node:test";
import assert from "node:assert/strict";
import { runWithSubmitLock, submitLockKey } from "./submitLock.js";
import { dropSent, markSent } from "./sentMarks.js";

// Grants a lock only when it is free, like `ifAvailable: true`.
const fakeLocks = () => {
  const held = new Set();
  return {
    held,
    request: async (name, options, callback) => {
      assert.equal(options.ifAvailable, true);
      if (held.has(name)) return callback(null);
      held.add(name);
      try {
        return await callback({ name });
      } finally {
        held.delete(name);
      }
    },
  };
};

test("submitLockKey names owner and tracker", () => {
  assert.equal(submitLockKey("u1", "jira"), "worklog-hub:submit:u1:jira");
});

test("a taken lock sends nothing and reports busy", async () => {
  const locks = fakeLocks();
  const key = submitLockKey("u1", "redmine");
  let release;
  const first = runWithSubmitLock({
    locks,
    key,
    run: () => new Promise((resolve) => { release = resolve; }),
  });
  let ran = false;
  const second = await runWithSubmitLock({ locks, key, run: () => { ran = true; } });
  assert.deepEqual(second, { busy: true });
  assert.equal(ran, false);
  release();
  assert.deepEqual(await first, { busy: false });
  assert.equal(locks.held.size, 0, "released afterwards");
});

test("other trackers and owners do not block each other", async () => {
  const locks = fakeLocks();
  let release;
  const first = runWithSubmitLock({
    locks,
    key: submitLockKey("u1", "redmine"),
    run: () => new Promise((resolve) => { release = resolve; }),
  });
  let ran = 0;
  await runWithSubmitLock({ locks, key: submitLockKey("u1", "jira"), run: () => { ran += 1; } });
  await runWithSubmitLock({ locks, key: submitLockKey("u2", "redmine"), run: () => { ran += 1; } });
  assert.equal(ran, 2);
  release();
  await first;
});

test("without navigator.locks the job just runs", async () => {
  let ran = false;
  assert.deepEqual(await runWithSubmitLock({ locks: undefined, key: "k", run: () => { ran = true; } }), { busy: false });
  assert.equal(ran, true);
});

test("the lock is released when the job throws", async () => {
  const locks = fakeLocks();
  await assert.rejects(
    runWithSubmitLock({ locks, key: "k", run: () => { throw new Error("boom"); } }),
    /boom/
  );
  assert.equal(locks.held.size, 0);
});

test("a second tab confirming after the first finished sends only unsent cards", () => {
  const D = "02-11-2026";
  const cards = { [D]: [{ id: "a" }, { id: "b" }, { id: "c" }] };
  // Tab 2's dialog showed all three; tab 1 has since sent a and b.
  const latest = markSent(cards, "redmine", ["a", "b"]);
  assert.deepEqual(dropSent(cards, latest, "redmine"), { [D]: [{ id: "c" }] });
  const allSent = markSent(cards, "redmine", ["a", "b", "c"]);
  assert.deepEqual(dropSent(cards, allSent, "redmine"), {});
  assert.deepEqual(dropSent(cards, cards, "redmine"), cards, "unchanged marks -> the same set");
});
