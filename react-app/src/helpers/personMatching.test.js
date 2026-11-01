import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyCandidates,
  clickUpMemberToCandidate,
  isAccountId,
  namesMatch,
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
