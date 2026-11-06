import useAuthStore from "./userStore";
import useWorkLogsStore from "./worklogsStore";
import {
  captureOwner,
  createCardsPersistence,
  getCardsOwnerId,
} from "../helpers/cardsPersistence";
import { DEMO_BUILD } from "../demo/demoMode";
import { auth, isFirebaseConfigured } from "../firebase";

const getStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

// The demo always opens on its own data, so it never reads or saves cards.
// Builds without Firebase never learn an owner, so they save nothing either.
const storage = DEMO_BUILD ? null : getStorage();

const persistence = createCardsPersistence({
  store: useWorkLogsStore,
  authStore: useAuthStore,
  storage,
  eventTarget: storage ? window : null,
  isCurrentOwner: (user) =>
    !isFirebaseConfigured || auth?.currentUser?.uid === user?.uid,
});

export const startCardsPersistence = () => {
  if (storage) persistence.start();
};

// Call at the start of an async job that writes cards after an await; check
// the returned function right before writing.
export const captureCardsOwner = () =>
  captureOwner(() => getCardsOwnerId(useAuthStore.getState()));

export const unbindCardsOwner = () => persistence.unbind();
