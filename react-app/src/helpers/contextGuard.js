// An async callback (a search, a permission check, a mail lookup) captures the
// context it started in; if person, preset or generation moved on by the time
// it resolves, its result is dropped instead of applied to the new context.

export const contextKey = ({ personId, presetId, generation } = {}) =>
  JSON.stringify([personId ?? "me", presetId ?? "", generation ?? 0]);

// `read` returns the live context; the returned function answers "still the
// same context as when capture happened?".
export const captureContext = (read) => {
  const started = contextKey(read());
  return () => contextKey(read()) === started;
};

// Results are editable only when they were fetched for "me", and the context
// they were fetched in is still the live one (same person, preset, generation).
export const canEditResults = (resultsContext, live) =>
  !!resultsContext &&
  (live?.personId ?? "me") === "me" &&
  (resultsContext.personId ?? "me") === (live?.personId ?? "me") &&
  (resultsContext.presetId ?? "") === (live?.presetId ?? "") &&
  (resultsContext.generation ?? 0) === (live?.generation ?? 0);
