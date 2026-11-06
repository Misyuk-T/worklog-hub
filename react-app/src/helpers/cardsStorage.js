// Saved cards live in the browser, one entry per signed-in account.
// The storage object is injected (localStorage in the app, a fake in tests).
// Nothing here throws: blocked or full storage just means "not saved".
export const CARDS_VERSION = 1;

export const cardsKey = (ownerId) => `worklog-hub:cards:${ownerId}`;

const isOwnerId = (ownerId) => typeof ownerId === "string" && ownerId !== "";

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// A real calendar day written dd-MM-yyyy (31-02-2026 is not one).
const isCardDate = (value) => {
  if (typeof value !== "string") return false;
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) return false;
  const [day, month, year] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

// Optional fields the UI reads as text (a Redmine project may be a number).
// An object or array here would crash rendering.
const SCALAR_FIELDS = [
  "jiraUrl",
  "project",
  "task",
  "clickupTask",
  "clickupTeamId",
  "blb",
  "taskKey",
  "taskName",
];
const isScalarOrNullish = (value) =>
  value === null ||
  value === undefined ||
  typeof value === "string" ||
  typeof value === "number";

// Cards from every source (Jira, ClickUp, Redmine, file import, "+") carry a
// date string, hours as a number or numeric string, and a description that may
// be empty. The UI cannot render a card without them.
const isCard = (card) =>
  isPlainObject(card) &&
  isCardDate(card.date) &&
  typeof card.description === "string" &&
  (typeof card.hours === "number" ||
    (typeof card.hours === "string" && card.hours.trim() !== "")) &&
  Number.isFinite(Number(card.hours)) &&
  SCALAR_FIELDS.every((field) => isScalarOrNullish(card[field]));

export const isCardsMap = (value) =>
  isPlainObject(value) &&
  Object.entries(value).every(
    ([day, cards]) =>
      isCardDate(day) &&
      Array.isArray(cards) &&
      cards.length > 0 &&
      cards.every(isCard)
  );

export const hasCards = (workLogs) =>
  isPlainObject(workLogs) && Object.keys(workLogs).length > 0;

// Raw string -> { workLogs, isJiraExport, isClickUpExport }, or null when the
// text is not a usable snapshot (corrupt, wrong version, wrong shape, empty).
export const parseCards = (raw) => {
  if (typeof raw !== "string") return null;
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isPlainObject(payload) || payload.v !== CARDS_VERSION) return null;
  if (!isCardsMap(payload.workLogs) || !hasCards(payload.workLogs)) return null;
  return {
    workLogs: payload.workLogs,
    isJiraExport: payload.isJiraExport === true,
    isClickUpExport: payload.isClickUpExport === true,
  };
};

export const clearCards = (storage, ownerId) => {
  if (!storage || !isOwnerId(ownerId)) return false;
  try {
    storage.removeItem(cardsKey(ownerId));
    return true;
  } catch {
    return false;
  }
};

export const loadCards = (storage, ownerId) => {
  if (!storage || !isOwnerId(ownerId)) return null;
  let raw;
  try {
    raw = storage.getItem(cardsKey(ownerId));
  } catch {
    return null;
  }
  if (raw === null || raw === undefined) return null;
  const snapshot = parseCards(raw);
  if (!snapshot) clearCards(storage, ownerId);
  return snapshot;
};

// No cards (null or an empty map) means no key. Returns true when saved.
export const saveCards = (storage, ownerId, snapshot) => {
  if (!storage || !isOwnerId(ownerId)) return false;
  if (!snapshot || !hasCards(snapshot.workLogs)) {
    clearCards(storage, ownerId);
    return false;
  }
  try {
    storage.setItem(
      cardsKey(ownerId),
      JSON.stringify({
        v: CARDS_VERSION,
        workLogs: snapshot.workLogs,
        isJiraExport: snapshot.isJiraExport === true,
        isClickUpExport: snapshot.isClickUpExport === true,
      })
    );
    return true;
  } catch {
    // A full disk must not leave the previous snapshot to come back later as
    // cards the user has since changed or deleted.
    clearCards(storage, ownerId);
    return false;
  }
};
