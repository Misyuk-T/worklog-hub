import { ensureWorkLogIds } from "./ensureWorkLogIds.js";
import {
  cardsKey,
  clearCards,
  hasCards,
  loadCards,
  parseCards,
  saveCards,
} from "./cardsStorage.js";

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

  const apply = (snapshot) => {
    applying = true;
    try {
      store.setState(
        snapshot
          ? {
              workLogs: ensureWorkLogIds(snapshot.workLogs),
              isJiraExport: snapshot.isJiraExport,
              isClickUpExport: snapshot.isClickUpExport,
            }
          : EMPTY
      );
    } finally {
      applying = false;
    }
  };

  const persist = (state) => {
    if (hasCards(state.workLogs)) saveCards(storage, owner, state);
    else clearCards(storage, owner);
  };

  const setOwner = (next) => {
    if (next === owner) return;
    owner = next;
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
      apply(loadCards(storage, owner));
      return;
    }
    if (event.newValue === null) {
      apply(null);
      return;
    }
    const snapshot = parseCards(event.newValue);
    if (snapshot) apply(snapshot);
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
          persist(state);
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
    getOwnerId: () => owner,
    dispose() {
      stops.forEach((stop) => stop());
      stops = [];
      owner = null;
    },
  };
};
