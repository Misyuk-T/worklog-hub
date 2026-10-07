import test from "node:test";
import assert from "node:assert/strict";
import { getMappingStorageKey, readSavedMappings } from "./useRedminePrefixMappings.js";

test("saved mappings are isolated by profile, Redmine server and user", () => {
  const scope = { profileId: "work", redmineUrl: "company", userId: 42 };
  const key = getMappingStorageKey(scope);
  for (const changed of [
    { profileId: "personal" },
    { redmineUrl: "other-company" },
    { userId: 43 },
  ]) {
    assert.notEqual(key, getMappingStorageKey({ ...scope, ...changed }));
  }
  assert.equal(getMappingStorageKey({ profileId: "work" }), null);
  const storage = { getItem: (requested) => requested === key ? '{"CE":101}' : null };
  assert.deepEqual(readSavedMappings(storage, key), { CE: 101 });
  assert.deepEqual(readSavedMappings(storage, getMappingStorageKey({ ...scope, profileId: "personal" })), {});
});

test("restores only valid prefix-to-id mappings without changing ID types", () => {
  const storage = { getItem: () => '{"CE":101,"CP":"202","bad key":3,"BAD":{},"NO":0,"NAN":null}' };
  assert.deepEqual(readSavedMappings(storage, "fixture"), { CE: 101, CP: "202" });
  assert.deepEqual(readSavedMappings({getItem: () => '[]'}, "fixture"), {});
  assert.deepEqual(readSavedMappings({getItem: () => null}, "fixture"), {});
});
