const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

const { createRouter } = require("../routes/routes");
const { resolveRedmineBaseUrl } = require("../scripts/helpers/redmineUrl");
const { assertSafeTarget } = require("../scripts/helpers/targetGuard");
const cors = require("../middlewares/cors");

const request = async (router, path, { method = "GET", headers, middleware } = {}) => {
  const app = express();
  app.use(express.json());
  if (middleware) app.use(middleware);
  app.use(router);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers });
    const text = await response.text();
    return { status: response.status, headers: response.headers, text, body: text ? JSON.parse(text) : null };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

const recordingRouter = () => {
  const calls = [];
  const axiosClient = async (config) => {
    calls.push(config);
    return { data: { ok: true } };
  };
  const limiter = { schedule: (task) => task() };
  return { calls, router: createRouter({ axiosClient, limiter }) };
};

const redmineHeaders = (url = "acme") => ({ "X-Redmine-Api-Key": "red-secret", "X-Redmine-Url": url });
const jiraHeaders = { "X-Jira-Api-Key": "jira-secret", "X-Jira-Email": "user@example.test" };

test("Redmine credentials in headers are used and never forwarded upstream", async () => {
  const { calls, router } = recordingRouter();
  const result = await request(router, "/redmine/time_entries.json?from=2026-10-01", { headers: redmineHeaders() });

  assert.equal(result.status, 200);
  assert.equal(calls[0].url, "https://redmine.acme.com/time_entries.json");
  assert.deepEqual(calls[0].params, { from: "2026-10-01", key: "red-secret" });
  assert.equal(calls[0].headers, undefined);
  assert.doesNotMatch(JSON.stringify(calls[0]), /X-Redmine|acme\b.*redmineUrl/i);
});

test("Jira credentials in headers build Basic auth and keep jiraUrl out of upstream params", async () => {
  const { calls, router } = recordingRouter();
  const result = await request(router, "/jira/rest/api/2/search?jiraUrl=acme.atlassian.net&jql=project%3DOPS", { headers: jiraHeaders });

  assert.equal(result.status, 200);
  assert.equal(calls[0].url, "https://acme.atlassian.net/rest/api/2/search");
  assert.deepEqual(calls[0].params, { jql: "project=OPS" });
  assert.equal(
    calls[0].headers.Authorization,
    `Basic ${Buffer.from("user@example.test:jira-secret").toString("base64")}`
  );
  assert.deepEqual(Object.keys(calls[0].headers), ["Authorization"]);
});

test("ClickUp key in a header goes only into the Authorization header", async () => {
  const { calls, router } = recordingRouter();
  const result = await request(router, "/clickup/team/1/task?page=2", { headers: { "X-ClickUp-Api-Key": "click-secret" } });

  assert.equal(result.status, 200);
  assert.equal(calls[0].url, "https://api.clickup.com/api/v2/team/1/task");
  assert.deepEqual(calls[0].params, { page: "2" });
  assert.equal(calls[0].headers.Authorization, "click-secret");
});

test("header credentials win over query credentials", async () => {
  const { calls, router } = recordingRouter();
  await request(router, "/clickup/team?clickupApiKey=old-key", { headers: { "X-ClickUp-Api-Key": "new-key" } });
  assert.equal(calls[0].headers.Authorization, "new-key");
  assert.deepEqual(calls[0].params, {});
});

test("query-string credentials still work for an older frontend and are not forwarded", async () => {
  const { calls, router } = recordingRouter();
  await request(router, "/redmine/issues.json?redmineUrl=acme&redmineApiKey=red-secret&limit=5");
  await request(router, "/jira/rest/api/2/myself?jiraUrl=acme.atlassian.net&jiraApiKey=jira-secret&jiraEmail=u%40e.test");
  await request(router, "/clickup/user?clickupApiKey=click-secret");

  assert.deepEqual(calls[0].params, { limit: "5", key: "red-secret" });
  assert.deepEqual(calls[1].params, {});
  assert.deepEqual(calls[2].params, {});
  assert.doesNotMatch(JSON.stringify(calls.map(({ params }) => params)), /jira-secret|click-secret|redmineUrl|jiraEmail/);
});

test("missing credentials are a 400 listing the missing fields", async () => {
  const { calls, router } = recordingRouter();
  const result = await request(router, "/redmine/issues.json", { headers: { "X-Redmine-Api-Key": "red-secret" } });
  assert.equal(result.status, 400);
  assert.equal(result.body.error.code, "MISSING_CREDENTIALS");
  assert.deepEqual(result.body.error.details.map(({ field }) => field), ["redmineUrl"]);
  assert.equal(calls.length, 0);
});

test("header-sourced secrets are redacted from upstream error responses", async () => {
  const axiosClient = async () => {
    const error = new Error("boom");
    error.response = { status: 422, data: { message: "Bad key red-secret and user jira-user@example.test" } };
    throw error;
  };
  const router = createRouter({ axiosClient, limiter: { schedule: (task) => task() } });
  const redmine = await request(router, "/redmine/time_entries.json", { headers: redmineHeaders() });
  assert.equal(redmine.status, 422);
  assert.doesNotMatch(redmine.text, /red-secret/);
  assert.match(redmine.text, /REDACTED/);

  const jira = await request(router, "/jira/rest/api/2/myself?jiraUrl=acme.atlassian.net", {
    headers: { "X-Jira-Api-Key": "jira-secret", "X-Jira-Email": "jira-user@example.test" },
  });
  assert.doesNotMatch(jira.text, /jira-user@example\.test|jira-secret/);
});

test("Redmine base URL: legacy slug versus full host", () => {
  assert.equal(resolveRedmineBaseUrl("acme"), "https://redmine.acme.com");
  assert.equal(resolveRedmineBaseUrl("redmine.example.org"), "https://redmine.example.org");
  assert.equal(resolveRedmineBaseUrl("https://tracker.example.com/redmine/"), "https://tracker.example.com/redmine");
  assert.equal(resolveRedmineBaseUrl(""), "");
});

test("proxy builds Redmine URLs from a legacy slug, a bare host and a host with a path", async () => {
  const { calls, router } = recordingRouter();
  await request(router, "/redmine/issues.json", { headers: redmineHeaders("acme") });
  await request(router, "/redmine/issues.json", { headers: redmineHeaders("redmine.example.org") });
  await request(router, "/redmine/issues.json", { headers: redmineHeaders("https://tracker.example.com/redmine/") });
  assert.deepEqual(calls.map(({ url }) => url), [
    "https://redmine.acme.com/issues.json",
    "https://redmine.example.org/issues.json",
    "https://tracker.example.com/redmine/issues.json",
  ]);
});

const blockedTargets = [
  ["localhost", "localhost", { jiraOnly: true }], // for Redmine a bare word is a legacy slug
  ["subdomain of localhost", "app.localhost"],
  [".local", "redmine.corp.local"],
  [".internal", "jira.internal"],
  ["loopback", "127.0.0.1"],
  ["loopback range", "127.8.8.8"],
  ["10/8", "10.0.0.5"],
  ["172.16/12", "172.20.1.1"],
  ["192.168/16", "192.168.0.10"],
  ["link-local metadata", "169.254.169.254"],
  ["decimal loopback", "2130706433", { jiraOnly: true }],
  ["localhost with a dot", "localhost."],
  ["IPv6 loopback", "[::1]"],
  ["IPv6 unique local", "[fd12:3456::1]"],
  ["IPv6 link-local", "[fe80::1]"],
  ["IPv4-mapped IPv6", "[::ffff:127.0.0.1]"],
  ["credentials in URL", "user:pass@example.com"],
  ["single-label host", "intranet", { jiraOnly: true }],
];

for (const [label, host, { jiraOnly = false } = {}] of blockedTargets) {
  test(`SSRF guard rejects ${label} for ${jiraOnly ? "Jira" : "Redmine and Jira"}`, async () => {
    const { calls, router } = recordingRouter();
    const jira = await request(router, `/jira/rest/api/2/myself?jiraUrl=${encodeURIComponent(host)}`, { headers: jiraHeaders });
    const results = [jira];
    if (!jiraOnly) results.push(await request(router, "/redmine/issues.json", { headers: redmineHeaders(host) }));
    for (const result of results) {
      assert.equal(result.status, 400, `${host} -> ${result.text}`);
      assert.equal(result.body.error.code, "BLOCKED_TARGET");
    }
    assert.equal(calls.length, 0);
  });
}

test("SSRF guard rejects non-https Redmine URLs and odd legacy slugs", async () => {
  const { calls, router } = recordingRouter();
  const http = await request(router, "/redmine/issues.json", { headers: redmineHeaders("http://redmine.example.com") });
  const slug = await request(router, "/redmine/issues.json", { headers: redmineHeaders("evil/path") });
  assert.equal(http.status, 400);
  assert.equal(slug.status, 400);
  assert.equal(calls.length, 0);
});

test("SSRF guard allows public hosts and addresses next to private ranges", () => {
  for (const url of [
    "https://redmine.example.com/issues.json",
    "https://acme.atlassian.net/rest/api/3/myself",
    "https://172.32.0.1/",
    "https://8.8.8.8/",
    "https://[2001:db8::1]/",
  ]) {
    assert.doesNotThrow(() => assertSafeTarget(url, "x"), url);
  }
});

test("CORS preflight allows the credential headers", async () => {
  const { router } = recordingRouter();
  const requested = "x-redmine-api-key,x-redmine-url,x-jira-api-key,x-jira-email,x-clickup-api-key,content-type";
  const result = await request(router, "/redmine/issues.json", {
    method: "OPTIONS",
    middleware: cors,
    headers: {
      Origin: "https://app.example.com",
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": requested,
    },
  }).catch((error) => ({ error }));
  assert.equal(result.error, undefined);
  assert.equal(result.status, 200);
  const allowed = result.headers.get("access-control-allow-headers").toLowerCase().split(",").map((h) => h.trim());
  for (const header of requested.split(",")) assert.ok(allowed.includes(header), header);
});
