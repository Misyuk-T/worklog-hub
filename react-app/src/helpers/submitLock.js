export const submitLockKey = (ownerId, service) =>
  `worklog-hub:submit:${ownerId}:${service}`;

// Runs `run` while holding a Web Lock, so two tabs cannot send to the same
// tracker at once. `locks` is `navigator.locks`; without it (old browsers,
// tests) the job just runs. Resolves `{ busy: true }` when another tab holds
// the lock, and then `run` is never called.
export const runWithSubmitLock = async ({ locks, key, run }) => {
  if (!locks || typeof locks.request !== "function") {
    await run();
    return { busy: false };
  }
  return locks.request(key, { ifAvailable: true }, async (lock) => {
    if (!lock) return { busy: true };
    await run();
    return { busy: false };
  });
};
