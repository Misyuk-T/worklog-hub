const readableText = (value) =>
  typeof value === "string" && !/<(?:!doctype|html|body)\b/i.test(value)
    ? value.trim()
    : "";

const formatDetail = (detail) => {
  if (typeof detail === "string") return readableText(detail);
  if (!detail || typeof detail !== "object") return "";
  const location = [
    detail.sheet && `Sheet "${detail.sheet}"`,
    detail.line != null && `Line ${detail.line}`,
    detail.row != null && `row ${detail.row}`,
    detail.field && `field ${detail.field}`,
  ]
    .filter(Boolean)
    .join(", ");
  const message = readableText(detail.message);
  const context = [detail.date, detail.hours != null && `${detail.hours}h`,
    (detail.task || detail.issue) && `task ${detail.task || detail.issue}`,
    detail.description].filter(Boolean).join(", ");
  return message ? `${location ? `${location}: ` : ""}${message}${context ? `: ${context}` : ""}` : "";
};

export const getApiErrorMessage = (error) => {
  const data = error?.response?.data;
  const structured =
    data?.error && typeof data.error === "object" ? data.error : data;
  const message = readableText(structured?.message) || readableText(data);
  const details = Array.isArray(structured?.details)
    ? structured.details.map(formatDetail).filter(Boolean)
    : [];
  const parts = [...new Set([message, ...details].filter(Boolean))];
  if (parts.length) return parts.join("\n");
  if (error?.code === "ERR_NETWORK")
    return "Cannot reach the server. Check your connection. If submitting a worklog, check whether it was saved before retrying.";
  if (["ECONNABORTED", "ETIMEDOUT"].includes(error?.code))
    return "The request timed out. Check whether the worklog was saved before retrying.";
  return (
    readableText(error?.message) || "The request failed. Please try again."
  );
};

export const describeWorklog = ({ date, hours, task, description }) =>
  `${date}, ${hours}h${task ? `, task ${task}` : ""}${
    description ? ` — ${description.slice(0, 100)}` : ""
  }`;

// Wait for every response so partial success is reported accurately.
export const submitWorklogRequests = async (requests, service) => {
  const results = await Promise.allSettled(
    requests.map(({ send }) => Promise.resolve().then(send))
  );
  const failures = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [`${requests[index].context}: ${getApiErrorMessage(result.reason)}`]
      : []
  );
  const successfulCount = results.length - failures.length;
  if (failures.length) {
    const error = new Error(
      [
        `${service}: ${successfulCount} of ${results.length} worklogs saved; ${failures.length} failed.`,
        ...failures,
        ...(successfulCount
          ? [
              "Do not resubmit the whole batch: successful worklogs are already saved.",
            ]
          : []),
      ].join("\n\n")
    );
    error.successfulCount = successfulCount;
    throw error;
  }
  return { successfulCount };
};
