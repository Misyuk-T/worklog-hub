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

// Suggestions only: fold common Ukrainian/Russian transliteration variants.
// Map before NFD so й and ї retain their sounds rather than losing their marks.
const CYRILLIC = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", ё: "yo",
  є: "ye", ж: "zh", з: "z", и: "y", і: "i", ї: "yi", й: "y", к: "k",
  л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

const suggestionTokens = (name) =>
  normalizeName(String(name ?? "").toLowerCase().replace(/[а-яёіїєґ]/g, (letter) => CYRILLIC[letter]))
    .split(" ")
    .map((token) => token
      .replace(/kh/g, "h")
      .replace(/g/g, "h")
      .replace(/yi/g, "i")
      .replace(/y/g, "i"));

// A shared surname-like token is a hint, never proof of identity.
export const namesLikelyMatch = (a, b) => {
  const right = new Set(suggestionTokens(b));
  return suggestionTokens(a).some((token) => token.length >= 4 && right.has(token));
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
//   conflict  - likely name but a different visible email
//   other     - workspace member offered for a manual pick
export const classifyCandidate = (candidate, person, { foundByEmail = false } = {}) => {
  const personMail = normalizeEmail(person?.mail);
  const candidateMail = normalizeEmail(candidate.email);

  if (candidateMail) {
    if (personMail && candidateMail === personMail) return "exact";
    return namesMatch(candidate.name, person?.name) || namesLikelyMatch(candidate.name, person?.name) || foundByEmail
      ? "conflict"
      : null;
  }
  return namesMatch(candidate.name, person?.name) || namesLikelyMatch(candidate.name, person?.name) || foundByEmail
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

// Resolve likely matches first, but retain the entire directory for manual picks.
export const resolveClickUpMembers = (members, person) => {
  const rank = { exact: 0, suggested: 1, conflict: 1, other: 2 };
  const candidates = (members || []).map(clickUpMemberToCandidate)
    .map((candidate) => ({ ...candidate, kind: classifyCandidate(candidate, person) || "other" }))
    .sort((a, b) => rank[a.kind] - rank[b.kind] || a.name.localeCompare(b.name));
  const resolved = resolveCandidates(candidates.filter((candidate) => candidate.kind !== "other"));
  return { ...resolved, candidates };
};
