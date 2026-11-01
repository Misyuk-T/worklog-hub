import test from "node:test";
import assert from "node:assert/strict";
import { format } from "date-fns";
import { formatRange, getRangePresets } from "./dateRangePresets.js";

const day = (date) => format(date, "yyyy-MM-dd");

test("presets use Monday-based weeks", () => {
  const presets = getRangePresets(new Date(2026, 10, 1)); // Sunday 1 Nov 2026
  assert.equal(day(presets.thisWeek.from), "2026-10-26");
  assert.equal(day(presets.thisWeek.to), "2026-11-01");
  assert.equal(day(presets.lastWeek.from), "2026-10-19");
  assert.equal(day(presets.lastWeek.to), "2026-10-25");
  assert.equal(day(presets.thisMonth.from), "2026-11-01");
  assert.equal(day(presets.thisMonth.to), "2026-11-30");
});

test("ranges are shown compactly", () => {
  assert.equal(formatRange({ from: new Date(2026, 9, 27), to: new Date(2026, 9, 31) }), "27 Oct – 31 Oct 2026");
  assert.equal(formatRange({ from: new Date(2026, 9, 27) }), "27 Oct 2026");
  assert.equal(
    formatRange({ from: new Date(2026, 11, 30), to: new Date(2027, 0, 3) }),
    "30 Dec 2026 – 3 Jan 2027",
  );
  assert.equal(formatRange(undefined), "Select dates");
});
