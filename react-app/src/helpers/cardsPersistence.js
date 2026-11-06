import { ensureWorkLogIds } from "./ensureWorkLogIds.js";
import { applyMarkEntries, diffMarks, mergeMarks } from "./sentMarks.js";
import {
  cardsKey,
  clearCards,
  hasCards,
  loadCards,
  parseCards,
  saveCards,
} from "./cardsStorage.js";

// How long a tab insists on a "sent" mark it made, when another tab's snapshot
// lacks it. Long enough for a racing write, short enough that another tab's
// deliberate "Send again" is not undone.
export const OWN_MARK_TTL_MS = 3000;

const markKey = ({ id, service }) => `${id}:${service}`;

const EMPTY = { workLogs: null, isJiraExport: false, isClickUpExport: false };

// The signed-in account that owns the saved cards. Unknown until auth has
// resolved, so nothing is read or written before that.
export const getCardsOwnerId = (authState) =>
  authState?.isAuthResolved && typeof authState.user?.ownerId === "string"
    ? authState.user.ownerId || null
    : null;

// Remembers who owned the cards when an async job started. `isCurrent()` is
// false once another account (or nobody) is signed in, so a late result never
// lands in someone else's cards. With no owner at all (demo, no Firebase) the
// owner is null at both ends and stays current.
export const captureOwner = (readOwnerId) => {
  const startedFor = readOwnerId();
  return () => readOwnerId() === startedFor;
};

// Keeps the worklogs store and the browser storage in step for one account.
//  - store: the worklogs store; authStore: the auth store; storage: localStorage
//  - eventTarget: the window, for `storage` events from other tabs
//  - isCurrentOwner(user): true when `user` is the one the identity provider
//    reports right now; a stale user (late login callback) is ignored
export const createCardsPersistence = ({
  store,
  authStore,
  storage,
  eventTarget,
  isCurrentOwner = () => true,
  now = Date.now,
}) => {
  let owner = null;
  let lastOwner = null;
  // Set by `unbind`: ignore this owner until auth reports a different one, so
  // a logout reset is not saved and a late auth update does not rebind early.
  let suspendedFor = null;
  // True while cards are being put into the store from storage; they must not
  // be written straight back.
  let applying = false;
  let stops = [];
  // "Sent" marks this tab made itself, kept until a snapshot from storage
  // shows them: another tab writing at the same moment may have replaced the
  // snapshot without them.
  const ownMarks = new Map();

  const setSilently = (partial) => {
    applying = true;
    try {
      store.setState(partial);
    } finally {
      applying = false;
    }
  };

  // Returns true when this tab's own marks had to be put back on the snapshot.
  const apply = (snapshot) => {
    if (!snapshot) {
      ownMarks.clear();
      setSilently(EMPTY);
      return false;
    }
    const cutoff = now() - OWN_MARK_TTL_MS;
    const live = [...ownMarks.values()].filter((entry) => entry.at >= cutoff);
    const { workLogs, remaining } = applyMarkEntries(
      ensureWorkLogIds(snapshot.workLogs),
      live
    );
    ownMarks.clear();
    for (const entry of remaining) ownMarks.set(markKey(entry), entry);
    setSilently({
      workLogs,
      isJiraExport: snapshot.isJiraExport,
      isClickUpExport: snapshot.isClickUpExport,
    });
    return remaining.length > 0;
  };

  const persist = (state) => {
    if (hasCards(state.workLogs)) saveCards(storage, owner, state);
    else clearCards(storage, owner);
  };

  const setOwner = (next) => {
    if (next === owner) return;
    owner = next;
    ownMarks.clear();
    if (!next) return;
    const previous = lastOwner;
    lastOwner = next;

    const saved = loadCards(storage, next);
    if (saved) {
      apply(saved);
    } else if (hasCards(store.getState().workLogs)) {
      // Another account's cards must never be saved under this one.
      if (previous && previous !== next) apply(null);
      else persist(store.getState());
    }
  };

  const evaluate = () => {
    const { user } = authStore.getState();
    if (user && !isCurrentOwner(user)) return;
    const derived = getCardsOwnerId(authStore.getState());
    if (derived !== null && derived === suspendedFor) return;
    suspendedFor = null;
    setOwner(derived);
  };

  const onStorage = (event) => {
    if (!owner) return;
    if (event.key !== null && event.key !== cardsKey(owner)) return;
    if (event.storageArea && event.storageArea !== storage) return;
    if (event.key === null) {
      if (apply(loadCards(storage, owner))) persist(store.getState());
      return;
    }
    if (event.newValue === null) {
      apply(null);
      return;
    }
    const snapshot = parseCards(event.newValue);
    if (snapshot && apply(snapshot)) persist(store.getState());
  };

  // The marks other tabs have saved, added to the cards on this page.
  const syncMarks = () => {
    if (!owner) return;
    const saved = loadCards(storage, owner);
    if (!saved) return;
    const { workLogs } = store.getState();
    const merged = mergeMarks(workLogs, saved.workLogs);
    if (merged !== workLogs) setSilently({ workLogs: merged });
  };

  // Tracks the marks this change added or cleared. A save caused by marking
  // also takes in the marks already saved by another tab, so two tabs marking
  // different trackers of one card do not overwrite each other.
  const handleMarks = (state, previous) => {
    const { added, removed } = diffMarks(previous.workLogs, state.workLogs);
    for (const entry of removed) ownMarks.delete(markKey(entry));
    for (const entry of added) ownMarks.set(markKey(entry), { ...entry, at: now() });
    if (!added.length) return state;
    const saved = loadCards(storage, owner);
    const merged = saved ? mergeMarks(state.workLogs, saved.workLogs) : state.workLogs;
    if (merged === state.workLogs) return state;
    setSilently({ workLogs: merged });
    return store.getState();
  };

  return {
    start() {
      if (stops.length) return;
      evaluate();
      stops.push(authStore.subscribe(evaluate));
      stops.push(
        store.subscribe((state, previous) => {
          if (applying || !owner) return;
          if (
            state.workLogs === previous.workLogs &&
            state.isJiraExport === previous.isJiraExport &&
            state.isClickUpExport === previous.isClickUpExport
          ) {
            return;
          }
          persist(handleMarks(state, previous));
        })
      );
      if (eventTarget) {
        eventTarget.addEventListener("storage", onStorage);
        stops.push(() => eventTarget.removeEventListener("storage", onStorage));
      }
    },
    // Stop saving until auth reports another account. Call before resetting
    // the stores on logout, so the reset does not erase the saved cards.
    unbind() {
      suspendedFor = owner;
      setOwner(null);
    },
    syncMarks,
    getOwnerId: () => owner,
    dispose() {
      stops.forEach((stop) => stop());
      stops = [];
      owner = null;
    },
  };
};
