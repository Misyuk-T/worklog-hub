// Checks react-app/database.rules.json against the Realtime Database
// emulator. Run from this folder: `npm install && npm test`.
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  equalTo,
  get,
  orderByChild,
  push,
  query,
  ref,
  set,
  update,
  remove,
} from "firebase/database";

const testEnv = await initializeTestEnvironment({
  projectId: "demo-worklog-hub",
  database: {
    host: "127.0.0.1",
    port: 9000,
    rules: readFileSync(new URL("../database.rules.json", import.meta.url), "utf8"),
  },
});

const results = [];
const check = async (name, expect, fn) => {
  try {
    await (expect === "allow" ? assertSucceeds(fn()) : assertFails(fn()));
    results.push(["PASS", expect, name]);
  } catch (e) {
    results.push(["FAIL", expect, name, e.message]);
  }
};

// Seed: two users shaped like the live client writes them (push key,
// uid/name/email/photo/currentSettings/ownerId, settings/<id>).
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.database();
  await set(ref(db, "users/-keyA"), {
    uid: "uidA", name: "A", email: "a@example.com", photo: "", currentSettings: "s1", ownerId: "-keyA",
    settings: { s1: { id: "s1", redmineApiKey: "secretA" } },
  });
  await set(ref(db, "users/-keyB"), {
    uid: "uidB", name: "B", email: "b@example.com", photo: "", currentSettings: "s1", ownerId: "-keyB",
    settings: { s1: { id: "s1", redmineApiKey: "secretB" } },
  });
});

const anon = testEnv.unauthenticatedContext().database();
const a = testEnv.authenticatedContext("uidA").database();
const c = testEnv.authenticatedContext("uidC").database(); // first-time user

// (a) unauthenticated
await check("anon: read /users", "deny", () => get(ref(anon, "users")));
await check("anon: query uid == uidA", "deny", () => get(query(ref(anon, "users"), orderByChild("uid"), equalTo("uidA"))));
await check("anon: read /", "deny", () => get(ref(anon, "/")));

// (b) signed-in user A
await check("A: read whole /users", "deny", () => get(ref(a, "users")));
await check("A: read /", "deny", () => get(ref(a, "/")));
await check("A: query users uid == uidA (login lookup)", "allow", () => get(query(ref(a, "users"), orderByChild("uid"), equalTo("uidA"))));
await check("A: query users uid == uidB", "deny", () => get(query(ref(a, "users"), orderByChild("uid"), equalTo("uidB"))));
await check("A: query users orderByChild email", "deny", () => get(query(ref(a, "users"), orderByChild("email"), equalTo("b@example.com"))));
await check("A: read own record users/-keyA (getCurrentSettings)", "allow", () => get(ref(a, "users/-keyA")));
await check("A: read own settings list (getSettings)", "allow", () => get(ref(a, "users/-keyA/settings")));
await check("A: read own settings/s1", "allow", () => get(ref(a, "users/-keyA/settings/s1")));
await check("A: read B record", "deny", () => get(ref(a, "users/-keyB")));
await check("A: read B settings", "deny", () => get(ref(a, "users/-keyB/settings")));
await check("A: overwrite B record", "deny", () => set(ref(a, "users/-keyB"), { uid: "uidA" }));
await check("A: update B currentSettings", "deny", () => update(ref(a, "users/-keyB"), { currentSettings: "x" }));
await check("A: write B settings/s2", "deny", () => set(ref(a, "users/-keyB/settings/s2"), { id: "s2" }));
await check("A: delete B settings/s1", "deny", () => remove(ref(a, "users/-keyB/settings/s1")));
await check("A: write at root", "deny", () => set(ref(a, "other/x"), 1));
await check("A: update own currentSettings (sendCurrentSettings)", "allow", () => update(ref(a, "users/-keyA"), { currentSettings: "s2" }));
await check("A: save own settings/s2 (sendSettings)", "allow", () => set(ref(a, "users/-keyA/settings/s2"), { id: "s2", redmineApiKey: "k" }));
await check("A: delete own settings/s2 (deleteSettings)", "allow", () => remove(ref(a, "users/-keyA/settings/s2")));
await check("A: change own uid to uidB", "deny", () => update(ref(a, "users/-keyA"), { uid: "uidB" }));
await check("A: create record with someone else's uid", "deny", () => set(push(ref(a, "users")), { uid: "uidB" }));

// first-time user C: login lookup returns nothing, then push creates own record
await check("C: query users uid == uidC (empty)", "allow", () => get(query(ref(c, "users"), orderByChild("uid"), equalTo("uidC"))));
const cRef = push(ref(c, "users"));
await check("C: create own record via push (loginUser)", "allow", () =>
  set(cRef, { name: "C", email: "c@example.com", photo: "", uid: "uidC", currentSettings: "", ownerId: cRef.key }));
await check("C: query finds own new record", "allow", async () => {
  const snap = await get(query(ref(c, "users"), orderByChild("uid"), equalTo("uidC")));
  if (!snap.exists() || !snap.child(cRef.key).exists()) throw new Error("own record not returned");
  return snap;
});
await check("C: overwrite existing A record via set", "deny", () => set(ref(c, "users/-keyA"), { uid: "uidC" }));

// End-to-end: the real login lookup returns exactly the owner's record.
const snap = await get(query(ref(a, "users"), orderByChild("uid"), equalTo("uidA")));
const keys = [];
snap.forEach((s) => { keys.push(s.key); });
results.push([JSON.stringify(keys) === '["-keyA"]' ? "PASS" : "FAIL", "allow", `A: lookup returns only own key (${JSON.stringify(keys)})`]);

await testEnv.cleanup();

for (const r of results) console.log(r.join("  "));
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
