class AppError extends Error {
  constructor(status, code, message, details = []) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const errorBody = (code, message, details = []) => ({
  error: { code, message, details },
});

const redactSecrets = (value, secrets = []) => {
  if (typeof value !== "string") return value;

  let redacted = value
    .replace(/([?&](?:key|api[_-]?key|token|password|redmineApiKey|jiraApiKey|clickupApiKey)=)[^&#\s]*/gi, "$1[REDACTED]")
    .replace(/(["']?(?:api[_-]?key|token|password|redmineApiKey|jiraApiKey|clickupApiKey)["']?\s*[:=]\s*["']?)[^"',;&\s}]+/gi, "$1[REDACTED]")
    .replace(/(authorization\s*[:=]\s*)(?:basic|bearer)?\s*[^,;\s}]+/gi, "$1[REDACTED]")
    .replace(/\b(?:Basic|Bearer)\s+[A-Za-z0-9+/=._-]+/gi, "[REDACTED]");
  for (const secret of secrets) {
    if (typeof secret === "string" && secret) redacted = redacted.split(secret).join("[REDACTED]");
  }
  return redacted;
};

const isHtml = (value) =>
  typeof value === "string" && /<!doctype html|<html[\s>]|<body[\s>]/i.test(value);

const collectMessages = (data) => {
  if (typeof data === "string") return isHtml(data) ? [] : [data];
  if (!data || typeof data !== "object") return [];

  const candidates = [data.message, data.error, data.err, data.errorMessages, data.errors];
  const messages = [];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && !isHtml(candidate)) messages.push(candidate);
    else if (Array.isArray(candidate)) messages.push(...candidate.filter((item) => typeof item === "string" && !isHtml(item)));
    else if (candidate && typeof candidate === "object") {
      messages.push(
        ...Object.entries(candidate)
          .filter(([, message]) => typeof message !== "string" || !isHtml(message))
          .map(([field, message]) => `${field}: ${typeof message === "string" ? message : "Invalid value."}`)
      );
    }
  }
  return messages;
};

const safeRequestContext = (body, secrets = []) => {
  const source = body && typeof body === "object" ? body.time_entry || body : null;
  if (!source || typeof source !== "object" || Array.isArray(source)) return [];

  const aliases = {
    spent_on: "date",
    date: "date",
    hours: "hours",
    issue_id: "issue",
    issue: "issue",
    task: "task",
    description: "description",
    comments: "description",
  };
  const detail = {};
  for (const [key, label] of Object.entries(aliases)) {
    const value = source[key];
    if (value === undefined || value === null || value === "") continue;
    if (!["string", "number", "boolean"].includes(typeof value)) continue;
    detail[label] = typeof value === "string" ? redactSecrets(value, secrets).slice(0, 160) : value;
  }
  return Object.keys(detail).length ? [{ message: "Request context", ...detail }] : [];
};

const upstreamError = (service, error, body, secrets = []) => {
  const upstreamStatus = Number(error?.response?.status);
  const status = upstreamStatus >= 400 && upstreamStatus < 500 ? upstreamStatus : 502;
  const messages = collectMessages(error?.response?.data)
    .map((message) => redactSecrets(message, secrets))
    .map((message) => message.trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, 5);
  const context = safeRequestContext(body, secrets);
  const fallback = ({
    401: `${service} authentication failed. Check the API token and account settings.`,
    403: `${service} denied access. Check your permissions for this task or worklog.`,
    404: `${service} could not find the requested task or worklog.`,
    429: `${service} rate limit reached. Wait before trying again.`,
    502: `${service} is unavailable or returned an invalid response.`,
  })[status] || `${service} rejected the request (HTTP ${status}).`;

  return new AppError(
    status,
    `UPSTREAM_${service.toUpperCase()}_ERROR`,
    messages[0] || fallback,
    [...messages.slice(1), ...context]
  );
};

const sendError = (res, error) => {
  const appError = error instanceof AppError
    ? error
    : new AppError(500, "INTERNAL_ERROR", "The server could not complete the request.");
  console.error(`${appError.code}: ${appError.message}`);
  return res.status(appError.status).json(errorBody(appError.code, appError.message, appError.details));
};

module.exports = {
  AppError,
  errorBody,
  redactSecrets,
  sendError,
  upstreamError,
};
