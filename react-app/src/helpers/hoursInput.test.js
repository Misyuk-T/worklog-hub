import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedHoursInput, isHoursCharacter } from "./hoursInput.js";

test("accepts empty, partial and valid hours up to 24", () => {
  for (const value of ["", ".", "0", "0.", ".5", "1", "1.5", "7.25", "12", "24", "24.", "24.00", "0.01"]) {
    assert.equal(isAllowedHoursInput(value), true, value);
  }
  assert.equal(isAllowedHoursInput(8), true);
});

test("rejects values that could never become valid hours", () => {
  for (const value of ["25", "99", "24.5", "1.234", "abc", "-1", "1e3", "1..5", "1.2.3", "100", "1,5", " 1", "+1"]) {
    assert.equal(isAllowedHoursInput(value), false, value);
  }
});

test("only digits and a dot are valid characters", () => {
  assert.equal(isHoursCharacter("7"), true);
  assert.equal(isHoursCharacter("."), true);
  for (const character of ["-", "+", "e", "E", ",", " ", "a"]) {
    assert.equal(isHoursCharacter(character), false, character);
  }
});
