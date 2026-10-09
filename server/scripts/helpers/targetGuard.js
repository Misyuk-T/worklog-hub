const net = require("node:net");
const { AppError } = require("../../errors");

const blocked = (field, message) =>
  new AppError(400, "BLOCKED_TARGET", "This server address is not allowed.", [{ field, message }]);

const isPrivateIPv4 = (address) => {
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 || // "this" network
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
};

const expandIPv6 = (address) => {
  const [head, tail] = address.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail === undefined ? [] : tail ? tail.split(":") : [];
  const missing = tail === undefined ? 0 : 8 - headGroups.length - tailGroups.length;
  return [...headGroups, ...Array(missing).fill("0"), ...tailGroups].map((group) => parseInt(group || "0", 16));
};

const isPrivateIPv6 = (address) => {
  const groups = expandIPv6(address);
  if (groups.length !== 8 || groups.some(Number.isNaN)) return true;
  if (groups.slice(0, 7).every((group) => group === 0) && groups[7] <= 1) return true; // :: and ::1
  if ((groups[0] & 0xfe00) === 0xfc00) return true; // fc00::/7
  if ((groups[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  const isMappedV4 = groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff;
  if (isMappedV4) {
    const v4 = [groups[6] >> 8, groups[6] & 255, groups[7] >> 8, groups[7] & 255].join(".");
    return isPrivateIPv4(v4);
  }
  return false;
};

// Returns the normalized URL when it is a safe https target, otherwise throws AppError(400).
// `candidate` is the full URL string; `field` names the setting shown in the error.
const assertSafeTarget = (candidate, field) => {
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw blocked(field, `${field} is not a valid address.`);
  }
  if (url.protocol !== "https:") throw blocked(field, `${field} must use https.`);
  if (url.username || url.password) throw blocked(field, `${field} must not contain credentials.`);

  const host = url.hostname.replace(/\.$/, "").toLowerCase();
  if (!host) throw blocked(field, `${field} is not a valid address.`);

  if (host.startsWith("[")) {
    if (isPrivateIPv6(host.slice(1, -1))) throw blocked(field, `${field} points to a private network address.`);
    return url;
  }
  if (net.isIPv4(host)) {
    if (isPrivateIPv4(host)) throw blocked(field, `${field} points to a private network address.`);
    return url;
  }
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw blocked(field, `${field} points to a local or internal host.`);
  }
  if (!host.includes(".")) throw blocked(field, `${field} must be a full domain name.`);
  return url;
};

module.exports = { assertSafeTarget, isPrivateIPv4, isPrivateIPv6 };
