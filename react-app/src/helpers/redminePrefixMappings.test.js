import test from "node:test";
import assert from "node:assert/strict";
import useWorkLogsStore from "../store/worklogsStore.js";

import {
  applyRedminePrefixMappings,
  detectRedminePrefixes,
  getRedmineDescriptionPrefix,
} from "./redminePrefixMappings.js";

test("extracts an exact task prefix only from the start of a description", () => {
  assert.equal(getRedmineDescriptionPrefix("  ce-608: work"), "CE");
  assert.equal(getRedmineDescriptionPrefix("CE-609 work"), "CE");
  assert.equal(getRedmineDescriptionPrefix("CEV-1: work"), "CEV");
  assert.equal(getRedmineDescriptionPrefix("CE-1work"), null);
  assert.equal(getRedmineDescriptionPrefix("note CE-1: work"), null);
  assert.equal(getRedmineDescriptionPrefix("86abc123: ClickUp"), null);
});

test("collects sorted, case-insensitive prefix counts", () => {
  assert.deepEqual(
    detectRedminePrefixes({
      later: [
        { description: "ze-1: work" },
        { description: "CE-609 more" },
      ],
      earlier: [
        { description: " ce-608: work" },
        { description: "not a task" },
      ],
    }),
    [
      { prefix: "CE", count: 2 },
      { prefix: "ZE", count: 1 },
    ]
  );
});

test("applies multiple mappings across dates while preserving other fields", () => {
  const logs = {
    "2026-10-01": [
      { id: "one", description: "CE-608: work", project: 9, hours: 2 },
      { id: "two", description: "cev-1 follow-up", project: "", note: "keep" },
    ],
    "2026-10-02": [
      { id: "three", description: "CE-609: work", project: 101 },
      { id: "four", description: "XX-1: unmatched", project: 7 },
    ],
  };

  const result = applyRedminePrefixMappings(
    logs,
    { ce: 101, CEV: 202 },
    [101, 202]
  );

  assert.equal(result.matchedCount, 3);
  assert.equal(result.updatedCount, 2);
  assert.equal(result.unchangedCount, 1);
  assert.equal(result.skippedCount, 1);
  assert.equal(result.invalidMappingCount, 0);
  assert.deepEqual(result.workLogs["2026-10-01"][0], {
    id: "one",
    description: "CE-608: work",
    project: 101,
    hours: 2,
  });
  assert.equal(result.workLogs["2026-10-01"][1].project, 202);
  assert.strictEqual(result.workLogs["2026-10-02"][1], logs["2026-10-02"][1]);
});

test("rejects stale and type-mismatched target ids without changing cards", () => {
  const logs = { day: [{ description: "CE-1: work", project: 5 }] };
  const stale = applyRedminePrefixMappings(logs, { CE: 999 }, [101]);
  const wrongType = applyRedminePrefixMappings(logs, { CE: "101" }, [101]);

  assert.strictEqual(stale.workLogs, logs);
  assert.equal(stale.matchedCount, 0);
  assert.equal(stale.updatedCount, 0);
  assert.equal(stale.invalidMappingCount, 1);
  assert.strictEqual(wrongType.workLogs, logs);
  assert.equal(wrongType.invalidMappingCount, 1);
});

test("onlyEmpty preserves populated projects and updates null or empty projects", () => {
  const logs = {
    day: [
      { id: "filled", description: "CE-1: work", project: 8 },
      { id: "empty", description: "CE-2: work", project: "" },
      { id: "null", description: "CE-3: work", project: null },
    ],
  };
  const result = applyRedminePrefixMappings(logs, { CE: 101 }, [101], {
    onlyEmpty: true,
  });

  assert.equal(result.matchedCount, 3);
  assert.equal(result.updatedCount, 2);
  assert.equal(result.workLogs.day[0].project, 8);
  assert.equal(result.workLogs.day[1].project, 101);
  assert.equal(result.workLogs.day[2].project, 101);
});

test("is failure-safe for missing worklogs, malformed mappings, and unmatched cards", () => {
  assert.deepEqual(applyRedminePrefixMappings(null, null, null), {
    workLogs: null,
    totalCount: 0,
    matchedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    unchangedCount: 0,
    invalidMappingCount: 0,
  });

  const logs = { day: [{ description: "meeting", project: 7 }] };
  const result = applyRedminePrefixMappings(logs, [], [101]);
  assert.strictEqual(result.workLogs, logs);
  assert.equal(result.updatedCount, 0);
});

test("store action reads latest worklogs and reports only actual changes", () => {
  useWorkLogsStore.setState({
    workLogs: { day: [{ id: "one", description: "CE-1: work", project: "" }] },
  });
  const action = useWorkLogsStore.getState().applyRedminePrefixMappings;

  useWorkLogsStore.setState({
    workLogs: { day: [{ id: "two", description: "ce-2: latest", project: "" }] },
  });
  const first = action({ CE: 101 }, [{ id: 101 }]);
  const second = action({ CE: 101 }, [{ id: 101 }]);

  assert.equal(first.updatedCount, 1);
  assert.equal(second.updatedCount, 0);
  assert.equal(second.unchangedCount, 1);
  assert.deepEqual(useWorkLogsStore.getState().workLogs.day[0], {
    id: "two",
    description: "ce-2: latest",
    project: 101,
  });
  useWorkLogsStore.getState().resetAll();
});
