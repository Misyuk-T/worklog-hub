import test from "node:test";
import assert from "node:assert/strict";
import { captureOwner, createCardsPersistence } from "./cardsPersistence.js";
import { cardsKey, saveCards } from "./cardsStorage.js";
import useWorkLogsStore from "../store/worklogsStore.js";
import useAuthStore from "../store/userStore.js";

const fakeStorage = (initial = {}) => {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
  };
};

// A minimal window: records the listener so a test can fire a storage event.
const fakeWindow = () => {
  let listener = null;
  return {
    addEventListener: (_, fn) => { listener = fn; },
    removeEventListener: () => { listener = null; },
    fire: (event) => listener?.(event),
    hasListener: () => listener !== null,
  };
};

const D1 = "02-11-2026";
const cardsA = { [D1]: [{ id: "a1", date: D1, description: "a", hours: 2, project: 101 }] };
const cardsB = { [D1]: [{ id: "b1", date: D1, description: "b", hours: 3, project: 202 }] };
const keyA = cardsKey("A");
const keyB = cardsKey("B");
const saved = (storage, key) => JSON.parse(storage.map.get(key) ?? "null");

const setup = ({ storage = fakeStorage(), auth } = {}) => {
  useWorkLogsStore.setState({ workLogs: null, isJiraExport: false, isClickUpExport: false });
  useAuthStore.setState({ user: null, isAuthResolved: false });
  if (auth) useAuthStore.setState(auth);
  const win = fakeWindow();
  const persistence = createCardsPersistence({
    store: useWorkLogsStore,
    authStore: useAuthStore,
    storage,
    eventTarget: win,
  });
  persistence.start();
  return { storage, win, persistence };
};

const signIn = (ownerId) =>
  useAuthStore.setState({ user: ownerId ? { ownerId } : null, isAuthResolved: true });

test("captureOwner: current for the same account, not after another signs in or out", () => {
  let owner = "A";
  const isCurrent = captureOwner(() => owner);
  assert.equal(isCurrent(), true);
  owner = null;
  assert.equal(isCurrent(), false, "logged out");
  owner = "B";
  assert.equal(isCurrent(), false, "B signed in");
  owner = "A";
  assert.equal(isCurrent(), true, "A is back");
});

test("captureOwner: with no owner at either end (demo, no Firebase) stays current", () => {
  let owner = null;
  const isCurrent = captureOwner(() => owner);
  assert.equal(isCurrent(), true);
  owner = "B";
  assert.equal(isCurrent(), false, "an owner appeared");
});

test("nothing is read or written before auth resolves", () => {
  const storage = fakeStorage({ [keyA]: JSON.stringify({ v: 1, workLogs: cardsA }) });
  const { persistence } = setup({ storage });
  useWorkLogsStore.getState().addWorkLogs(cardsB);
  // a user record without a resolved auth state is still "unknown"
  useAuthStore.setState({ user: { ownerId: "A" } });
  assert.equal(persistence.getOwnerId(), null);
  assert.equal(storage.map.size, 1);
  assert.equal(saved(storage, keyA).workLogs[D1][0].id, "a1");
  persistence.dispose();
});

test("restores after auth resolves, runs ids through ensureWorkLogIds, and does not write back", () => {
  const noId = { [D1]: [{ date: D1, description: "", hours: 1 }] };
  const storage = fakeStorage({ [keyA]: JSON.stringify({ v: 1, workLogs: noId, isClickUpExport: true }) });
  const { persistence } = setup({ storage });
  const before = storage.map.get(keyA);
  signIn("A");
  const state = useWorkLogsStore.getState();
  assert.ok(state.workLogs[D1][0].id, "id was generated");
  assert.equal(state.isClickUpExport, true);
  assert.equal(storage.map.get(keyA), before, "restore did not rewrite the entry");
  persistence.dispose();
});

test("every mutation is saved; deleting the last card and clearing remove the key", () => {
  const { storage, persistence } = setup();
  signIn("A");
  const s = useWorkLogsStore.getState();
  s.addWorkLog(D1, { date: D1, hours: 1, description: "x" });
  const id = useWorkLogsStore.getState().workLogs[D1][0].id;
  assert.equal(saved(storage, keyA).workLogs[D1].length, 1);
  s.updateWorkLog(D1, id, { date: D1, hours: 4 });
  assert.equal(saved(storage, keyA).workLogs[D1][0].hours, 4);
  s.addBulkWorkLogProject(55);
  assert.equal(saved(storage, keyA).workLogs[D1][0].project, 55);
  s.moveDayWorkLogs(D1, "03-11-2026");
  assert.deepEqual(Object.keys(saved(storage, keyA).workLogs), ["03-11-2026"]);
  s.deleteWorkLog("03-11-2026", id);
  assert.equal(storage.map.has(keyA), false);
  s.addWorkLogs(cardsA);
  assert.equal(storage.map.has(keyA), true);
  s.resetWorkLogs();
  assert.equal(storage.map.has(keyA), false);
  s.addWorkLogs({});
  assert.equal(storage.map.has(keyA), false);
  persistence.dispose();
});

test("Generate (reset then add) leaves the new cards in storage", () => {
  const { storage, persistence } = setup();
  signIn("A");
  const s = useWorkLogsStore.getState();
  s.addWorkLogs(cardsA);
  s.resetWorkLogs();
  s.addWorkLogs(cardsB);
  assert.equal(saved(storage, keyA).workLogs[D1][0].id, "b1");
  persistence.dispose();
});

test("logout: unbind before the reset keeps the saved cards; login restores them", () => {
  const { storage, persistence } = setup();
  signIn("A");
  useWorkLogsStore.getState().addWorkLogs(cardsA);
  persistence.unbind();
  useWorkLogsStore.getState().resetAll();
  useAuthStore.setState({ user: null, isAuthResolved: true });
  assert.equal(saved(storage, keyA).workLogs[D1][0].id, "a1", "cards survive logout");
  assert.equal(useWorkLogsStore.getState().workLogs, null);
  signIn("A");
  assert.equal(useWorkLogsStore.getState().workLogs[D1][0].id, "a1");
  persistence.dispose();
});

test("a late auth update after unbind does not rebind the old owner early", () => {
  const { storage, persistence } = setup();
  signIn("A");
  useWorkLogsStore.getState().addWorkLogs(cardsA);
  persistence.unbind();
  useAuthStore.setState({ isLoading: true }); // unrelated auth change, user still A
  useWorkLogsStore.getState().resetAll();
  assert.equal(persistence.getOwnerId(), null);
  assert.equal(saved(storage, keyA).workLogs[D1][0].id, "a1");
  persistence.dispose();
});

test("switching accounts never saves A's cards under B", () => {
  const storage = fakeStorage();
  const { persistence } = setup({ storage });
  signIn("A");
  useWorkLogsStore.getState().addWorkLogs(cardsA);
  signIn("B");
  assert.equal(useWorkLogsStore.getState().workLogs, null, "A's cards are gone from the store");
  assert.equal(storage.map.has(keyB), false);
  assert.equal(saved(storage, keyA).workLogs[D1][0].id, "a1");
  useWorkLogsStore.getState().addWorkLogs(cardsB);
  assert.equal(saved(storage, keyB).workLogs[D1][0].id, "b1");
  assert.equal(saved(storage, keyA).workLogs[D1][0].id, "a1");
  signIn("A");
  assert.equal(useWorkLogsStore.getState().workLogs[D1][0].id, "a1");
  persistence.dispose();
});

test("another tab's change is applied without writing it back", () => {
  const { storage, win, persistence } = setup();
  signIn("A");
  useWorkLogsStore.getState().addWorkLogs(cardsA);
  let writes = 0;
  const original = storage.setItem;
  storage.setItem = (...args) => { writes += 1; original(...args); };
  const newValue = JSON.stringify({ v: 1, workLogs: cardsB, isJiraExport: true });
  win.fire({ key: keyA, newValue, storageArea: storage });
  assert.equal(useWorkLogsStore.getState().workLogs[D1][0].id, "b1");
  assert.equal(useWorkLogsStore.getState().isJiraExport, true);
  assert.equal(writes, 0, "no ping-pong");
  // other accounts' keys and garbage are ignored
  win.fire({ key: keyB, newValue, storageArea: storage });
  win.fire({ key: keyA, newValue: "{bad", storageArea: storage });
  assert.equal(useWorkLogsStore.getState().workLogs[D1][0].id, "b1");
  // the key removed in another tab empties this one, still without writing
  win.fire({ key: keyA, newValue: null, storageArea: storage });
  assert.equal(useWorkLogsStore.getState().workLogs, null);
  assert.equal(writes, 0);
  persistence.dispose();
  assert.equal(win.hasListener(), false);
});

test("a storage event before sign-in is ignored", () => {
  const { storage, win, persistence } = setup();
  win.fire({ key: keyA, newValue: JSON.stringify({ v: 1, workLogs: cardsA }), storageArea: storage });
  assert.equal(useWorkLogsStore.getState().workLogs, null);
  persistence.dispose();
});

test("an empty store (null cards) is handled and writes nothing", () => {
  const { storage, persistence } = setup();
  signIn("A");
  useWorkLogsStore.getState().setIsJiraExport(true);
  assert.equal(storage.map.size, 0);
  saveCards(storage, "A", { workLogs: cardsA });
  useWorkLogsStore.getState().resetAll();
  assert.equal(storage.map.has(keyA), false);
  persistence.dispose();
});

test("a late bind of a stale user after logout restores nothing and writes nothing", () => {
  const storage = fakeStorage();
  let current = "uidA";
  useWorkLogsStore.setState({ workLogs: null, isJiraExport: false, isClickUpExport: false });
  useAuthStore.setState({ user: null, isAuthResolved: false });
  const persistence = createCardsPersistence({
    store: useWorkLogsStore,
    authStore: useAuthStore,
    storage,
    eventTarget: fakeWindow(),
    isCurrentOwner: (user) => user.uid === current,
  });
  persistence.start();
  useAuthStore.setState({ user: { ownerId: "A", uid: "uidA" }, isAuthResolved: true });
  useWorkLogsStore.getState().addWorkLogs(cardsA);
  const before = storage.map.get(keyA);

  current = null; // logout
  persistence.unbind();
  useWorkLogsStore.getState().resetAll();
  useAuthStore.getState().logout();
  assert.equal(persistence.getOwnerId(), null);

  // the login callback for A finishes late
  useAuthStore.setState({ user: { ownerId: "A", uid: "uidA" } });
  assert.equal(persistence.getOwnerId(), null, "A is not rebound");
  assert.equal(useWorkLogsStore.getState().workLogs, null, "A's cards stay hidden");
  assert.equal(storage.map.get(keyA), before, "nothing was written");
  persistence.dispose();
});
