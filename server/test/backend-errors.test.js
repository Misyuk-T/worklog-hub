const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const XLSX = require("xlsx");

const parseText = require("../scripts/parseText");
const parseXMLS = require("../scripts/parseXMLS");
const { createRouter } = require("../routes/routes");
const { upstreamError } = require("../errors");

const request = async (router, path, { method = "GET", body, formData } = {}) => {
  const app = express();
  app.use(express.json());
  app.use(router);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: formData || (body ? JSON.stringify(body) : undefined),
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

test("TXT imports accept a single worklog longer than eight hours", () => {
  const result = parseText("07.10\n1. Release support 12.5h blb");
  assert.equal(result[`${"07-10"}-${new Date().getFullYear()}`][0].hours, 12.5);
});

test("TXT errors identify the malformed line and field", () => {
  assert.throws(
    () => parseText("07.10\n1. Missing duration"),
    (error) => error.status === 400 && error.code === "INVALID_TXT" &&
      error.details[0].line === 2 && error.details[0].field === "hours"
  );
});

test("TXT rejects empty and non-worklog files as client errors", () => {
  assert.throws(() => parseText("  \n"), (error) => error.code === "EMPTY_FILE");
  assert.throws(
    () => parseText("07.10\nnotes only"),
    (error) => error.code === "INVALID_TXT" && error.details[0].line === 2
  );
  assert.throws(
    () => parseText("99.99\n1. Impossible date 1h"),
    (error) => error.code === "INVALID_TXT" && error.details[0].field === "date"
  );
});

test("XLSX imports accept hours longer than eight and report sheet row errors", () => {
  const validWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(validWorkbook, XLSX.utils.aoa_to_sheet([["cover"]]), "Cover");
  XLSX.utils.book_append_sheet(validWorkbook, XLSX.utils.json_to_sheet([{
    "Log Date & Time": 45572,
    Comment: "Long migration",
    "Hr. Spent": 10,
    "Ticket No": "OPS-1",
  }]), "Worklogs");
  const valid = parseXMLS(XLSX.write(validWorkbook, { type: "buffer", bookType: "xlsx" }));
  assert.equal(Object.values(valid)[0][0].hours, 10);

  const invalidWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(invalidWorkbook, XLSX.utils.aoa_to_sheet([["cover"]]), "Cover");
  XLSX.utils.book_append_sheet(invalidWorkbook, XLSX.utils.json_to_sheet([{
    "Log Date & Time": 45572,
    Comment: "No hours",
  }]), "Worklogs");
  assert.throws(
    () => parseXMLS(XLSX.write(invalidWorkbook, { type: "buffer", bookType: "xlsx" })),
    (error) => error.code === "INVALID_XLSX" && error.details[0].sheet === "Worklogs" &&
      error.details[0].row === 2 && error.details[0].field === "Hr. Spent"
  );
});

test("XLSX reports the physical sheet row after blank rows and rejects out-of-range dates", () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["cover"]]), "Cover");
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Log Date & Time", "Comment", "Hr. Spent"],
    [],
    [99999999, "Bad date", 1],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Worklogs");
  assert.throws(
    () => parseXMLS(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })),
    (error) => error.details[0].row === 3 && error.details[0].field === "Log Date & Time"
  );
});

test("XLSX reports a missing second worklog sheet", () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["cover"]]), "Cover");
  assert.throws(
    () => parseXMLS(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })),
    (error) => error.status === 400 && error.code === "INVALID_XLSX" && error.details[0].field === "sheet"
  );
});

test("file endpoint returns a safe structured missing-file error instead of crashing", async () => {
  const result = await request(createRouter(), "/submit-form", { method: "POST", body: { type: "custom" } });
  assert.equal(result.status, 400);
  assert.deepEqual(result.body.error, {
    code: "MISSING_FILE",
    message: "Choose a worklog file to import.",
    details: [{ field: "file", message: "A .txt or .xlsx file is required." }],
  });
});

test("file endpoint rejects a missing or unknown import type", async () => {
  for (const type of [undefined, "other"]) {
    const formData = new FormData();
    if (type) formData.append("type", type);
    formData.append("file", new Blob(["07.10\n1. Task 1h"], { type: "text/plain" }), "worklog.txt");
    const result = await request(createRouter(), "/submit-form", { method: "POST", formData });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, "INVALID_IMPORT_TYPE");
    assert.equal(result.body.error.details[0].field, "type");
  }
});

test("upstream validation status and message survive while credentials are redacted", async () => {
  const fakeAxios = async () => {
    const error = new Error("request failed");
    error.response = {
      status: 422,
      data: {
        err: "Invalid issue; exact token topsecret; user@example.test; Basic dXNlckBleGFtcGxlLnRlc3Q6dG9wc2VjcmV0",
        errors: { '"token"': "topsecret", nested: "<html>topsecret</html>" },
      },
    };
    throw error;
  };
  const limiter = { schedule: (fn) => fn() };
  const result = await request(
    createRouter({ axiosClient: fakeAxios, limiter }),
    "/jira/rest/api/2/worklog?jiraUrl=example.test&jiraApiKey=topsecret&jiraEmail=user%40example.test",
    { method: "POST", body: { issue: "ABC-1", hours: 9, description: "Release" } }
  );
  assert.equal(result.status, 422);
  assert.equal(result.body.error.code, "UPSTREAM_JIRA_ERROR");
  assert.match(result.body.error.message, /Invalid issue/);
  assert.doesNotMatch(JSON.stringify(result.body), /topsecret|secret/);
  assert.deepEqual(result.body.error.details.at(-1), {
    message: "Request context", issue: "ABC-1", hours: 9, description: "Release",
  });
});

test("proxy success forwards noncredential query params and arrays for every service", async () => {
  const calls = [];
  const fakeAxios = async (config) => {
    calls.push(config);
    return { data: { ok: true } };
  };
  const limiter = { schedule: (fn) => fn() };
  const router = createRouter({ axiosClient: fakeAxios, limiter });

  await request(router, "/redmine/time_entries.json?redmineUrl=acme&redmineApiKey=red-secret&from=2026-10-01&status_id%5B%5D=1&status_id%5B%5D=2");
  await request(router, "/jira/rest/api/2/search?jiraUrl=acme.atlassian.net&jiraApiKey=jira-secret&jiraEmail=u%40e.test&jql=project%3DOPS&fields=key&fields=summary");
  await request(router, "/clickup/team/1/task?clickupApiKey=click-secret&custom_task_ids=true&team_id=77&page=3");

  assert.equal(calls[0].url, "https://redmine.acme.com/time_entries.json");
  assert.deepEqual(calls[0].params, { from: "2026-10-01", status_id: ["1", "2"], key: "red-secret" });
  assert.deepEqual(calls[1].params, { jql: "project=OPS", fields: ["key", "summary"] });
  assert.deepEqual(calls[2].params, { custom_task_ids: "true", team_id: "77", page: "3" });
  assert.doesNotMatch(JSON.stringify(calls.map(({ url, params }) => ({ url, params }))), /jira-secret|click-secret/);
});

test("TXT rejects an unrecognized nonempty line instead of partially importing", () => {
  assert.throws(
    () => parseText("07.10\n1. Valid task 2h\nthis would previously be skipped"),
    (error) => error.code === "INVALID_TXT" && error.details[0].line === 3 && error.details[0].field === "line"
  );
});

test("HTML and transport failures become a safe 502", () => {
  const error = upstreamError("Redmine", {
    response: { status: 503, data: "<html><body>proxy Authorization: Bearer secret</body></html>" },
  });
  assert.equal(error.status, 502);
  assert.equal(error.details.length, 0);
  assert.doesNotMatch(error.message, /html|secret/i);
});

test("empty upstream auth errors give an actionable reason", () => {
  assert.match(upstreamError("Jira",{response:{status:401,data:""}}).message,/authentication failed/);
  assert.match(upstreamError("Redmine",{response:{status:403,data:{}}}).message,/permissions/);
});

test("multipart uploads retain detailed errors and accept more than eight hours", async () => {
  const upload = (name, text, type = "custom") => {
    const formData = new FormData();
    formData.append("file", new Blob([text]), name);
    if (type) formData.append("type", type);
    return request(createRouter(), "/submit-form", { method: "POST", formData });
  };
  const valid = await upload("logs.txt", "07.10\n1. Extended migration 12.5h blb");
  assert.equal(valid.status, 200);
  assert.equal(Object.values(valid.body)[0][0].hours, 12.5);
  const invalid = await upload("logs.txt", "07.10\n1. Missing hours");
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.details[0].line, 2);
  assert.equal(invalid.body.error.details[0].field, "hours");
  assert.equal((await upload("logs.csv", "anything")).body.error.code, "UNSUPPORTED_FILE_TYPE");
  assert.equal((await upload("logs.txt", "")).body.error.code, "EMPTY_FILE");
});
