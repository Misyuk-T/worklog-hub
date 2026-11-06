import test from "node:test";
import assert from "node:assert/strict";
import { buildDemoWorkspace } from "../demo/demoData.js";
import {
  classifyCandidates,
  clickUpMemberToCandidate,
  isAccountId,
  namesMatch,
  namesLikelyMatch,
  normalizeName,
  resolveCandidates,
  resolveClickUpMembers,
  sanitizeAccountIdInput,
} from "./personMatching.js";

const person = { name: "Olena Koval", mail: "Olena.Koval@acme.com" };

test("names match ignoring case, diacritics, punctuation and word order", () => {
  assert.equal(normalizeName("  Koval,  Olena "), "koval olena");
  assert.ok(namesMatch("Olena Koval", "koval olena"));
  assert.ok(namesMatch("Zoë Müller", "Zoe Muller"));
  assert.ok(!namesMatch("Olena Koval", "Olena Kovalenko"));
  assert.ok(!namesMatch("", ""));
  assert.ok(!namesMatch(null, "Olena"));
});

test("a unique exact email match is the only one selected without the user", () => {
  const tagged = classifyCandidates(
    [
      { id: "a", name: "Someone Else", email: "olena.koval@ACME.com" },
      { id: "b", name: "Olena Koval", email: "" },
    ],
    person,
  );
  assert.deepEqual(tagged.map((c) => c.kind), ["exact", "suggested"]);
  const row = resolveCandidates(tagged);
  assert.equal(row.status, "matched");
  assert.equal(row.selectedId, "a");
  assert.equal(row.confirmed, true);
  assert.deepEqual(row.candidates.map((c) => c.id), ["a"]);
});

test("a single name-only candidate needs confirmation", () => {
  const row = resolveCandidates(
    classifyCandidates([{ id: "b", name: "koval olena", email: "" }], person),
  );
  assert.equal(row.status, "suggest");
  assert.equal(row.selectedId, "b");
  assert.equal(row.confirmed, false);
});

test("a candidate with a different visible email is a conflict and never auto-selected", () => {
  const tagged = classifyCandidates(
    [{ id: "c", name: "Olena Koval", email: "olena@other.org" }],
    person,
  );
  assert.equal(tagged[0].kind, "conflict");
  const row = resolveCandidates(tagged);
  assert.equal(row.status, "suggest");
  assert.equal(row.confirmed, false);
});

test("two exact matches ask to choose; unrelated names are dropped", () => {
  const two = resolveCandidates(
    classifyCandidates(
      [
        { id: "a", name: "A", email: "olena.koval@acme.com" },
        { id: "b", name: "B", email: "OLENA.KOVAL@acme.com" },
      ],
      person,
    ),
  );
  assert.equal(two.status, "choose");
  assert.equal(two.confirmed, false);

  const none = resolveCandidates(
    classifyCandidates([{ id: "x", name: "Petro Shevchenko", email: "p@acme.com" }], person),
  );
  assert.equal(none.status, "notFound");
});

test("results of an email query with hidden email are suggestions, not matches", () => {
  const tagged = classifyCandidates(
    [{ id: "h", name: "Different Display", email: "" }],
    person,
    { foundByEmail: true },
  );
  assert.equal(tagged[0].kind, "suggested");
  assert.equal(resolveCandidates(tagged).confirmed, false);
});

test("without a known Redmine email nothing can be exact", () => {
  const tagged = classifyCandidates(
    [{ id: "a", name: "Olena Koval", email: "olena.koval@acme.com" }],
    { name: "Olena Koval", mail: "" },
  );
  assert.equal(tagged[0].kind, "conflict");
});

test("ClickUp members map to candidates with string ids", () => {
  assert.deepEqual(
    clickUpMemberToCandidate({ user: { id: 5001, username: "Olena Koval", email: "o@a.com" } }),
    { id: "5001", name: "Olena Koval", email: "o@a.com" },
  );
});

test("account ids accept only the Atlassian format while typing and on validation", () => {
  assert.ok(isAccountId("5b10ac8d82e05b22cc7d4ef5"));
  assert.ok(isAccountId("712020:7f1c0000-0000-4000-8000-0000000000a1"));
  assert.ok(!isAccountId("olena@acme.com"));
  assert.ok(!isAccountId('x" OR 1=1'));
  assert.ok(!isAccountId("short"));
  assert.equal(sanitizeAccountIdInput(' 5b10 "ac8d@\n82e05b '), "5b10ac8d82e05b");
});

test("ClickUp members: exact email selects, name-only waits, nobody is not found", () => {
  const members = [
    { user: { id: 1, username: "Olena K.", email: "OLENA.KOVAL@acme.com" } },
    { user: { id: 2, username: "Olena Koval", email: "" } },
  ];
  const exact = resolveClickUpMembers(members, person);
  assert.equal(exact.status, "matched");
  assert.equal(exact.selectedId, "1");

  const nameOnly = resolveClickUpMembers([members[1]], person);
  assert.equal(nameOnly.status, "suggest");
  assert.equal(nameOnly.confirmed, false);

  assert.equal(resolveClickUpMembers([], person).status, "notFound");
});


test("surname hints tolerate Cyrillic transliteration and initials, but exclude unrelated names", () => {
  assert.ok(namesLikelyMatch("Любов Кудрявцева", "Liubov Kudriavtseva"));
  assert.ok(namesLikelyMatch("Olena Koval", "Koval O."));
  assert.ok(!namesLikelyMatch("Olena Koval", "Marek Dudek"));
  assert.ok(!namesLikelyMatch("Li A.", "Li B."));
  assert.ok(!namesLikelyMatch("", ""));
  for (const [cyrillic, latin] of [
    ["Яценко", "Iatsenko"], ["Юрченко", "Iurchenko"], ["Йосипенко", "Iosipenko"],
    ["Хоменко", "Homenko"], ["Щербак", "Shcherbak"], ["Гнатюк", "Gnatiuk"],
    ["Євченко", "Ievchenko"], ["Їжакевич", "Izhakevich"], ["Коваль", "Koval"],
  ]) assert.ok(namesLikelyMatch(cyrillic, latin), `${cyrillic} / ${latin}`);
});

test("likely names with different visible emails are never confirmed", () => {
  const row = resolveCandidates(classifyCandidates([
    { id: "a", name: "Liubov Kudriavtseva", email: "other@example.com" },
  ], { name: "Любов Кудрявцева", mail: "liubov@example.com" }));
  assert.equal(row.candidates[0].kind, "conflict");
  assert.equal(row.status, "suggest");
  assert.equal(row.confirmed, false);
});

test("all ClickUp members remain available, sorted by likelihood then name", () => {
  const members = [
    { user: { id: 1, username: "Zed Unrelated", email: "z@example.com" } },
    { user: { id: 2, username: "Koval O.", email: "other@example.com" } },
    { user: { id: 3, username: "A Unrelated", email: "a@example.com" } },
    { user: { id: 4, username: "Olena Koval", email: "" } },
    { user: { id: 5, username: "Z Exact", email: person.mail } },
  ];
  const exact = resolveClickUpMembers(members, person);
  assert.equal(exact.confirmed, true);
  assert.deepEqual(exact.candidates.map((candidate) => candidate.id), ["5", "2", "4", "3", "1"]);
  const likely = resolveClickUpMembers(members.slice(0, 4), person);
  assert.equal(likely.status, "choose");
  assert.equal(likely.confirmed, false);
  const none = resolveClickUpMembers(members, { name: "Iryna Bondar", mail: "iryna@example.com" });
  assert.equal(none.status, "notFound");
  assert.equal(none.selectedId, null);
  assert.equal(none.confirmed, false);
  assert.equal(none.candidates.length, members.length);
  assert.ok(none.candidates.every((candidate) => candidate.kind === "other"));
});


test("demo includes an unconfirmed identity and an unrelated person with the full directory", () => {
  const demo = buildDemoWorkspace(new Date(2026, 10, 6));
  const yuliia = demo.people.find((person) => person.key === "yuliia");
  const iryna = demo.people.find((person) => person.key === "iryna");
  const members = demo.people.filter((person) => person.clickUp).map((person) => ({ user: person.clickUp }));
  for (const person of [yuliia, iryna]) {
    const row = resolveClickUpMembers(members, person);
    assert.equal(row.status, person === yuliia ? "suggest" : "notFound");
    assert.equal(row.confirmed, false);
    assert.equal(row.candidates.length, members.length);
  }
  assert.equal(yuliia.jira, null);
  assert.deepEqual(yuliia.logs.jira, {});
  assert.ok(yuliia.logs.redmine.length > 0);
  assert.ok(Object.keys(yuliia.logs.clickup).length > 0);
});
