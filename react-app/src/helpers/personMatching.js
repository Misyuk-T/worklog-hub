// Matching one person across trackers. Only a unique, exact email match may be
// selected without the user: everything based on names, hidden emails or a
// different visible email waits for an explicit confirmation.

export const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

// Lowercase, diacritics stripped, punctuation dropped, word order ignored.
export const normalizeName = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");

export const namesMatch = (a, b) => {
  const left = normalizeName(a);
  return left !== "" && left === normalizeName(b);
};

// Atlassian account ids: "5b10ac8d82e05b22cc7d4ef5" or "712020:uuid".
const ACCOUNT_ID_PATTERN = /^[A-Za-z0-9:_-]{10,128}$/;
export const isAccountId = (value) => ACCOUNT_ID_PATTERN.test(String(value ?? ""));
// Keeps impossible characters out of the field while typing.
export const sanitizeAccountIdInput = (value) =>
  String(value ?? "").replace(/[^A-Za-z0-9:_-]/g, "").slice(0, 128);

// kind:
//   exact     - visible email equals the person's email
//   suggested - same name (or found by email query) but the email is hidden
//   conflict  - same name but a different visible email
export const classifyCandidate = (candidate, person, { foundByEmail = false } = {}) => {
  const personMail = normalizeEmail(person?.mail);
  const candidateMail = normalizeEmail(candidate.email);

  if (candidateMail) {
    if (personMail && candidateMail === personMail) return "exact";
    return namesMatch(candidate.name, person?.name) || foundByEmail
      ? "conflict"
      : null;
  }
  return namesMatch(candidate.name, person?.name) || foundByEmail
    ? "suggested"
    : null;
};

// candidates: [{ id, name, email? }]. Drops unrelated ones and tags the rest.
export const classifyCandidates = (candidates, person, options) =>
  (candidates || []).flatMap((candidate) => {
    const kind = classifyCandidate(candidate, person, options);
    return kind ? [{ ...candidate, kind }] : [];
  });

// Turns tagged candidates into a row state.
//   matched - exactly one exact email match, selected and confirmed
//   choose  - several exact matches, or several candidates to pick from
//   suggest - one candidate that is not an exact email match: needs a click
//   notFound
export const resolveCandidates = (tagged) => {
  const exact = tagged.filter((candidate) => candidate.kind === "exact");
  if (exact.length === 1) {
    return { status: "matched", candidates: exact, selectedId: exact[0].id, confirmed: true };
  }
  if (exact.length > 1) {
    return { status: "choose", candidates: exact, selectedId: null, confirmed: false };
  }
  if (tagged.length === 1) {
    return { status: "suggest", candidates: tagged, selectedId: tagged[0].id, confirmed: false };
  }
  if (tagged.length > 1) {
    return { status: "choose", candidates: tagged, selectedId: null, confirmed: false };
  }
  return { status: "notFound", candidates: [], selectedId: null, confirmed: false };
};

export const jiraUserToCandidate = (user) => ({
  id: user.accountId,
  name: user.displayName || user.accountId,
  email: user.emailAddress || "",
});

export const clickUpMemberToCandidate = (member) => ({
  id: String(member.user?.id),
  name: member.user?.username || "",
  email: member.user?.email || "",
});

export const shortId = (id) => {
  const text = String(id ?? "");
  return text.length > 10 ? `${text.slice(0, 4)}…${text.slice(-4)}` : text;
};

export const describeCandidate = (candidate) =>
  [candidate.name, candidate.email || "email hidden"].join(" · ") +
  ` · ${shortId(candidate.id)}`;

// ClickUp lists every workspace member with an email, so matching is local.
export const resolveClickUpMembers = (members, person) =>
  resolveCandidates(
    classifyCandidates((members || []).map(clickUpMemberToCandidate), person),
  );
