import test from "node:test";
import assert from "node:assert/strict";
import { fetchAllIssueWorklogs, filterWorklogs, startedToMs } from "./jiraWorklogs.js";

const makePages = (total, pageSize) => {
  const all = Array.from({ length: total }, (_, i) => ({ id: String(i) }));
  const calls = [];
  const fetchPage = async ({ startAt, maxResults }) => {
    calls.push({ startAt, maxResults });
    return { worklogs: all.slice(startAt, startAt + Math.min(maxResults, pageSize)), total };
  };
  return { fetchPage, calls };
};

test("every page of an issue's worklogs is read", async () => {
  const { fetchPage, calls } = makePages(2500, 1000);
  const result = await fetchAllIssueWorklogs(fetchPage, 1000);
  assert.equal(result.length, 2500);
  assert.deepEqual(calls.map((c) => c.startAt), [0, 1000, 2000]);
});

test("a server that returns fewer than asked still gets fully read", async () => {
  const { fetchPage, calls } = makePages(25, 10);
  const result = await fetchAllIssueWorklogs(fetchPage, 1000);
  assert.equal(result.length, 25);
  assert.deepEqual(calls.map((c) => c.startAt), [0, 10, 20]);
});

test("an empty issue is one request and an empty page stops the loop", async () => {
  const { fetchPage, calls } = makePages(0, 1000);
  assert.deepEqual(await fetchAllIssueWorklogs(fetchPage), []);
  assert.equal(calls.length, 1);

  let n = 0;
  const lying = async () => ({ worklogs: n++ === 0 ? [{ id: "a" }] : [], total: 99 });
  assert.equal((await fetchAllIssueWorklogs(lying)).length, 1);
});

test("a response without a total is treated as the last page", async () => {
  let n = 0;
  const noTotal = async () => ({ worklogs: n++ === 0 ? [{ id: "a" }] : [] });
  assert.equal((await fetchAllIssueWorklogs(noTotal)).length, 1);
  assert.equal(n, 1);
});

test("worklogs are filtered by author accountId and by date range", () => {
  const fromMs = startedToMs("2026-10-27T00:00:00.000+0000");
  const toMs = startedToMs("2026-10-27T23:59:59.999+0000");
  const worklogs = [
    { id: "1", author: { accountId: "me-1", emailAddress: "other@x.com" }, started: "2026-10-27T10:00:00.000+0000" },
    { id: "2", author: { accountId: "them-2", emailAddress: "me@x.com" }, started: "2026-10-27T10:00:00.000+0000" },
    { id: "3", author: { accountId: "me-1" }, started: "2026-10-26T23:59:59.000+0000" },
    { id: "4", author: { accountId: "me-1" }, started: "2026-10-28T00:00:01.000+0000" },
    { id: "5", author: {}, started: "2026-10-27T10:00:00.000+0000" },
  ];
  assert.deepEqual(
    filterWorklogs(worklogs, { accountId: "me-1", fromMs, toMs }).map((w) => w.id),
    ["1"],
  );
  assert.deepEqual(filterWorklogs(worklogs, { accountId: "", fromMs, toMs }), []);
});

test("the +0200 offset style is understood", () => {
  assert.equal(
    startedToMs("2026-10-27T10:00:00.000+0200"),
    Date.parse("2026-10-27T08:00:00.000Z"),
  );
});
