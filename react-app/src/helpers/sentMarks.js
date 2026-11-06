// A card remembers which trackers it was already sent to: `sentTo: { redmine: true }`.
// Absent means nothing was sent. Everything here is pure and null-safe, because
// `workLogs` is null until cards are generated.
export const SENT_SERVICES = ["redmine", "jira", "clickup"];

export const SERVICE_LABELS = {
  redmine: "Redmine",
  jira: "Jira",
  clickup: "ClickUp",
};

export const isSentTo = (card, service) => card?.sentTo?.[service] === true;

export const sentServices = (card) =>
  SENT_SERVICES.filter((service) => isSentTo(card, service));

const isMap = (workLogs) => workLogs !== null && typeof workLogs === "object";

const hasId = (card) => card?.id !== undefined && card?.id !== null;

const forEachCard = (workLogs, visit) => {
  if (!isMap(workLogs)) return;
  for (const cards of Object.values(workLogs)) {
    if (!Array.isArray(cards)) continue;
    for (const card of cards) visit(card);
  }
};

// Maps every card; returns the same object when no card changed, so stores do
// not re-render and persistence does not rewrite for nothing.
const mapCards = (workLogs, change) => {
  if (!isMap(workLogs)) return workLogs;
  let changed = false;
  const next = {};
  for (const [date, cards] of Object.entries(workLogs)) {
    if (!Array.isArray(cards)) {
      next[date] = cards;
      continue;
    }
    const mapped = cards.map(change);
    const dayChanged = mapped.some((card, index) => card !== cards[index]);
    changed = changed || dayChanged;
    next[date] = dayChanged ? mapped : cards;
  }
  return changed ? next : workLogs;
};

const withMark = (card, service) =>
  !card || typeof card !== "object" || isSentTo(card, service)
    ? card
    : { ...card, sentTo: { ...card.sentTo, [service]: true } };

const withoutMark = (card, service) => {
  if (!isSentTo(card, service)) return card;
  const rest = { ...card.sentTo };
  delete rest[service];
  const next = { ...card };
  if (Object.keys(rest).length) next.sentTo = rest;
  else delete next.sentTo;
  return next;
};

export const markSent = (workLogs, service, cardIds) => {
  const ids = new Set([...(cardIds ?? [])].map(String));
  if (!ids.size) return workLogs;
  return mapCards(workLogs, (card) =>
    hasId(card) && ids.has(String(card.id)) ? withMark(card, service) : card
  );
};

export const clearSent = (workLogs, service, cardId) =>
  mapCards(workLogs, (card) =>
    hasId(card) && String(card.id) === String(cardId)
      ? withoutMark(card, service)
      : card
  );

// Cards generated from a tracker already exist in it.
export const markAllSent = (workLogs, service) =>
  mapCards(workLogs, (card) => withMark(card, service));

// Adds the marks `source` has for the same card ids; never removes one.
export const mergeMarks = (workLogs, source) => {
  const known = new Map();
  forEachCard(source, (card) => {
    if (hasId(card) && sentServices(card).length) {
      known.set(String(card.id), card);
    }
  });
  if (!known.size) return workLogs;
  return mapCards(workLogs, (card) => {
    const other = hasId(card) ? known.get(String(card.id)) : null;
    if (!other) return card;
    return sentServices(other).reduce(
      (next, service) => withMark(next, service),
      card
    );
  });
};

// Marks added or cleared between two states, by card id. A card missing from
// `previous` (new, or moved to another day) is not a change of marks.
export const diffMarks = (previous, next) => {
  const before = new Map();
  forEachCard(previous, (card) => {
    if (hasId(card)) before.set(String(card.id), card);
  });
  const added = [];
  const removed = [];
  forEachCard(next, (card) => {
    if (!hasId(card)) return;
    const old = before.get(String(card.id));
    if (!old) return;
    for (const service of SENT_SERVICES) {
      const was = isSentTo(old, service);
      const is = isSentTo(card, service);
      if (!was && is) added.push({ id: String(card.id), service });
      if (was && !is) removed.push({ id: String(card.id), service });
    }
  });
  return { added, removed };
};

// Puts remembered `{ id, service }` marks back on `workLogs`. `remaining` keeps
// the ones still needed: a mark already present, or a card that no longer
// exists, needs no further remembering.
export const applyMarkEntries = (workLogs, entries) => {
  const cards = new Map();
  forEachCard(workLogs, (card) => {
    if (hasId(card)) cards.set(String(card.id), card);
  });
  const remaining = [];
  let next = workLogs;
  for (const entry of entries) {
    const card = cards.get(entry.id);
    if (!card || isSentTo(card, entry.service)) continue;
    remaining.push(entry);
    next = markSent(next, entry.service, [entry.id]);
  }
  return { workLogs: next, remaining };
};

// How many cards could go to a tracker, and how many of those already did.
export const sentSummary = (workLogs, service, qualifies) => {
  let qualifying = 0;
  let sent = 0;
  forEachCard(workLogs, (card) => {
    if (!card || !qualifies(card)) return;
    qualifying += 1;
    if (isSentTo(card, service)) sent += 1;
  });
  return { qualifying, sent };
};

// From the cards about to be sent, drop those `latest` shows as sent since.
export const dropSent = (shown, latest, service) => {
  const sent = new Set();
  forEachCard(latest, (card) => {
    if (hasId(card) && isSentTo(card, service)) sent.add(String(card.id));
  });
  const next = {};
  if (!isMap(shown)) return next;
  for (const [date, cards] of Object.entries(shown)) {
    if (!Array.isArray(cards)) continue;
    const kept = cards.filter((card) => !(hasId(card) && sent.has(String(card.id))));
    if (kept.length) next[date] = kept;
  }
  return next;
};
