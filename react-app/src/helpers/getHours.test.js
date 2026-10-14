import test from "node:test";
import assert from "node:assert/strict";
import { msToHours, roundWorklogsHours } from "./getHours.js";
import { isAllowedHoursInput } from "./hoursInput.js";

test("msToHours rounds ClickUp durations to two decimals", () => {
  assert.equal(msToHours("4444000"), 1.23);
  assert.equal(msToHours(3600000), 1);
  assert.equal(msToHours("5400000"), 1.5);
  assert.equal(msToHours("1800000"), 0.5);
});

test("rounded ClickUp hours are accepted by the hours input", () => {
  assert.equal(isAllowedHoursInput(msToHours("4444000")), true);
  assert.equal(isAllowedHoursInput(msToHours("1200000")), true);
});

test("roundWorklogsHours rounds numeric hours and leaves the rest alone", () => {
  const result = roundWorklogsHours({
    "01-01-2026": [
      { id: "a", hours: 1.2347222 },
      { id: "b", hours: "0.3333" },
      { id: "c", hours: null },
      { id: "d", hours: "abc" },
    ],
  });
  assert.deepEqual(
    result["01-01-2026"].map((log) => log.hours),
    [1.23, 0.33, null, "abc"],
  );
  assert.equal(roundWorklogsHours(null), null);
});
