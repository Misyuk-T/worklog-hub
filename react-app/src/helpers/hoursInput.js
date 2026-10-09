export const MAX_HOURS = 24;

// Digits and one "." only; the regex below enforces the rest.
export const isHoursCharacter = (character) => /^[0-9.]$/.test(character);

// True when `text` is an acceptable intermediate or final value for an hours field:
// empty, up to two integer digits, at most two decimals, and not above 24.
export const isAllowedHoursInput = (text) => {
  const value = String(text ?? "");
  if (!/^\d{0,2}(\.\d{0,2})?$/.test(value)) return false;
  return !(Number.parseFloat(value) > MAX_HOURS);
};
