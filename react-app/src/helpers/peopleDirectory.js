import { normalizeEmail, normalizeName } from "./personMatching.js";

export const redmineUserName = (user) =>
  [user?.firstname, user?.lastname].filter(Boolean).join(" ") ||
  user?.name ||
  user?.login ||
  `User ${user?.id}`;

// Collapses project memberships into unique people, ignoring groups.
export const uniquePeopleFromMemberships = (memberships) => {
  const people = new Map();
  (memberships || []).forEach((membership) => {
    const user = membership?.user;
    if (user?.id != null && !people.has(user.id)) {
      people.set(user.id, { id: user.id, name: user.name });
    }
  });
  return people;
};

// Client-side filter of the member directory. mailById holds the mails that are
// already known; a query with "@" is matched against them too.
export const filterPeople = (people, query, mailById = new Map(), limit = 25) => {
  const text = String(query ?? "").trim();
  if (!text) return [];
  const needle = text.includes("@") ? normalizeEmail(text) : null;
  const words = normalizeName(text).split(" ").filter(Boolean);

  const matches = [];
  for (const person of people) {
    const mail = mailById.get(person.id) || person.mail || "";
    const haystack = normalizeName(person.name).split(" ");
    const hit = needle
      ? normalizeEmail(mail).includes(needle)
      : words.every((word) => haystack.some((part) => part.startsWith(word)));
    if (hit) matches.push({ ...person, mail });
    if (matches.length >= limit) break;
  }
  return matches;
};

// Runs fn over items with at most `limit` calls in flight; results keep order.
export const mapLimit = async (items, limit, fn) => {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
};
