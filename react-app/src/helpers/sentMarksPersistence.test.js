import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "zustand/vanilla";
import { OWN_MARK_TTL_MS, createCardsPersistence } from "./cardsPersistence.js";
import { cardsKey, saveCards } from "./cardsStorage.js";
import { clearSent, isSentTo, markSent, sentServices } from "./sentMarks.js";

const D = "02-11-2026";
const cards = () => ({
  [D]: [{ id: "a", date: D, description: "a", hours: 1, project: 1, task: "X-1", clickupTask: "t" }],
});
const key = cardsKey("U");

const fakeStorage = () => {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
};

// One browser tab: its own store, window and clock, sharing the storage.
const openTab = (storage, clock) => {
  const store = createStore(() => ({
    workLogs: null,
    isJiraExport: false,
    isClickUpExport: false,
  }));
  let listener = null;
  const win = {
    addEventListener: (_, fn) => { listener = fn; },
    removeEventListener: () => { listener = null; },
  };
  const authStore = {
    getState: () => ({ isAuthResolved: true, user: { ownerId: "U" } }),
    subscribe: () => () => {},
  };
  const persistence = createCardsPersistence({
    store, authStore, storage, eventTarget: win, now: () => clock.t,
  });
  persistence.start();
  return {
    store,
    persistence,
    // Delivers what is in storage now, as the browser would after another tab's write.
    receive: () => listener({ key, newValue: storage.getItem(key), storageArea: storage }),
    mark: (service, id = "a") =>
      store.setState((s) => ({ workLogs: markSent(s.workLogs, service, [id]) })),
    unmark: (service, id = "a") =>
      store.setState((s) => ({ workLogs: clearSent(s.workLogs, service, id) })),
    card: () => store.getState().workLogs[D][0],
  };
};

const setup = () => {
  const storage = fakeStorage();
  const clock = { t: 1000 };
  saveCards(storage, "U", { workLogs: cards() });
  return { storage, clock, tab1: openTab(storage, clock), tab2: openTab(storage, clock) };
};

const stored = (storage) => JSON.parse(storage.map.get(key)).workLogs[D][0];

test("marking is saved at once", () => {
  const { storage, tab1 } = setup();
  tab1.mark("redmine");
  assert.deepEqual(stored(storage).sentTo, { redmine: true });
});

test("two tabs marking different trackers of one card in a race both survive", () => {
  const { storage, tab1, tab2 } = setup();
  tab1.mark("redmine"); // tab 2 has not heard about it yet
  tab2.mark("clickup");
  assert.deepEqual(sentServices(stored(storage)), ["redmine", "clickup"]);
  assert.deepEqual(sentServices(tab2.card()), ["redmine", "clickup"]);
  tab1.receive();
  assert.deepEqual(sentServices(tab1.card()), ["redmine", "clickup"]);
});

test("a snapshot written without a tab's own mark does not lose it", () => {
  const { storage, clock, tab1 } = setup();
  tab1.mark("redmine");
  // Another tab, working from stale cards, replaces the snapshot without it.
  saveCards(storage, "U", { workLogs: cards() });
  clock.t += 1000;
  tab1.receive();
  assert.equal(isSentTo(tab1.card(), "redmine"), true);
  assert.equal(isSentTo(stored(storage), "redmine"), true, "and it is saved again");
});

test("own memory forgets a mark once a snapshot shows it", () => {
  const { storage, tab1 } = setup();
  tab1.mark("redmine");
  tab1.receive(); // storage has the mark: nothing to re-apply, memory is released
  saveCards(storage, "U", { workLogs: cards() });
  tab1.receive();
  assert.equal(isSentTo(tab1.card(), "redmine"), false);
});

test("Send again in one tab is not undone by its own memory", () => {
  const { storage, tab1 } = setup();
  tab1.mark("redmine");
  tab1.unmark("redmine");
  assert.equal("sentTo" in stored(storage), false);
  saveCards(storage, "U", { workLogs: cards() }); // a snapshot without the mark arrives
  tab1.receive();
  assert.equal(isSentTo(tab1.card(), "redmine"), false);
});

test("a mark older than the memory window is not forced back", () => {
  const { storage, clock, tab1 } = setup();
  tab1.mark("redmine");
  clock.t += OWN_MARK_TTL_MS + 1;
  saveCards(storage, "U", { workLogs: cards() }); // e.g. another tab's Send again
  tab1.receive();
  assert.equal(isSentTo(tab1.card(), "redmine"), false);
});

test("syncMarks pulls in marks saved by another tab", () => {
  const { tab1, tab2 } = setup();
  tab2.mark("jira");
  assert.equal(isSentTo(tab1.card(), "jira"), false, "event not delivered yet");
  tab1.persistence.syncMarks();
  assert.equal(isSentTo(tab1.card(), "jira"), true);
});

test("an empty store marks and syncs without error", () => {
  const storage = fakeStorage();
  const tab = openTab(storage, { t: 0 });
  tab.persistence.syncMarks();
  assert.equal(tab.store.getState().workLogs, null);
});
