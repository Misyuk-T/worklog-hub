import test from "node:test";
import assert from "node:assert/strict";
import { filterPeople, mapLimit, redmineUserName, uniquePeopleFromMemberships } from "./peopleDirectory.js";

test("memberships collapse into unique people; groups without a user are ignored", () => {
  const people = uniquePeopleFromMemberships([
    { user: { id: 1, name: "Olena Koval" } },
    { user: { id: 2, name: "Marek Dudek" } },
    { user: { id: 1, name: "Olena Koval" } },
    { group: { id: 9, name: "Devs" } },
  ]);
  assert.deepEqual([...people.values()].map((p) => p.id), [1, 2]);
});

test("filtering matches name words by prefix, any order, no diacritics", () => {
  const people = [
    { id: 1, name: "Olena Koval" },
    { id: 2, name: "Marek Dudek" },
    { id: 3, name: "Zoë Müller" },
  ];
  assert.deepEqual(filterPeople(people, "kov ol").map((p) => p.id), [1]);
  assert.deepEqual(filterPeople(people, "zoe").map((p) => p.id), [3]);
  assert.deepEqual(filterPeople(people, "  "), []);
});

test("a query with @ matches only mails that are already known", () => {
  const people = [{ id: 1, name: "Olena Koval" }, { id: 2, name: "Marek Dudek" }];
  const mails = new Map([[1, "Olena@acme.com"]]);
  assert.deepEqual(filterPeople(people, "olena@acme", mails).map((p) => p.id), [1]);
  assert.deepEqual(filterPeople(people, "marek@acme", mails), []);
});

test("the result list is capped", () => {
  const people = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Person ${i}` }));
  assert.equal(filterPeople(people, "person", new Map(), 25).length, 25);
});

test("mapLimit never exceeds the limit and keeps order", async () => {
  let inFlight = 0;
  let peak = 0;
  const result = await mapLimit([1, 2, 3, 4, 5, 6, 7, 8, 9], 4, async (n) => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    return n * 2;
  });
  assert.equal(peak, 4);
  assert.deepEqual(result, [2, 4, 6, 8, 10, 12, 14, 16, 18]);
});

test("user names fall back from first/last to name to login", () => {
  assert.equal(redmineUserName({ firstname: "Olena", lastname: "Koval" }), "Olena Koval");
  assert.equal(redmineUserName({ name: "Marek D." }), "Marek D.");
  assert.equal(redmineUserName({ id: 5, login: "m" }), "m");
});
