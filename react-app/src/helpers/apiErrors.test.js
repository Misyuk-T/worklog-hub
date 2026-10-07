import test from "node:test";
import assert from "node:assert/strict";
import {
  getApiErrorMessage,
  describeWorklog,
  submitWorklogRequests,
} from "./apiErrors.js";
import {
  validateWorkLogsData,
  validateWorklogHours,
} from "./validateWorklogsData.js";

test("shows the backend reason and exact import location", () => {
  const error = {
    response: {
      data: {
        error: {
          message: "Cannot import worklogs.",
          details: [
            {
              line: 4,
              field: "hours",
              message: "Add a duration such as 9.5h.",
            },
            {
              sheet: "Worklogs",
              row: 7,
              field: "Hr. Spent",
              message: "Hours must be positive.",
            },
          ],
        },
      },
    },
  };
  assert.equal(
    getApiErrorMessage(error),
    'Cannot import worklogs.\nLine 4, field hours: Add a duration such as 9.5h.\nSheet "Worklogs", row 7, field Hr. Spent: Hours must be positive.'
  );
});

test("handles legacy, network, and HTML failures without rendering objects or HTML", () => {
  assert.equal(
    getApiErrorMessage({ response: { data: "Invalid file" } }),
    "Invalid file"
  );
  assert.match(getApiErrorMessage({ code: "ERR_NETWORK" }), /Cannot reach/);
  assert.match(
    getApiErrorMessage({ code: "ECONNABORTED" }),
    /Check whether the worklog was saved/
  );
  assert.equal(
    getApiErrorMessage({
      response: { data: "<!doctype html><body>Proxy error</body>" },
      message: "Request failed",
    }),
    "Request failed"
  );
});

test("waits for all submissions and reports partial success with card context", async () => {
  let completeSuccess;
  const success = new Promise((resolve) => {
    completeSuccess = resolve;
  });
  const operation = submitWorklogRequests(
    [
      { context: "07-10-2026, 9h, task 101", send: () => success },
      {
        context: "08-10-2026, 2h, task 202",
        send: () =>
          Promise.reject({
            response: {
              data: {
                error: {
                  message: "Redmine rejected the worklog.",
                  details: ["Issue is closed."],
                },
              },
            },
          }),
      },
    ],
    "Redmine"
  );
  completeSuccess({});
  await assert.rejects(operation, (error) => {
    assert.equal(error.successfulCount, 1);
    assert.match(error.message, /1 of 2 worklogs saved; 1 failed/);
    assert.match(error.message, /08-10-2026, 2h, task 202/);
    assert.match(error.message, /Issue is closed/);
    assert.match(error.message, /Do not resubmit the whole batch/);
    return true;
  });
  assert.deepEqual(
    await submitWorklogRequests(
      [{ context: "one", send: () => Promise.resolve() }],
      "Jira"
    ),
    { successfulCount: 1 }
  );
});

test("allows more than eight hours while rejecting invalid durations", () => {
  for (const hours of [8, 9, 12.5, 26, "9.5"]) {
    assert.equal(validateWorklogHours(hours), true);
    assert.equal(
      validateWorkLogsData(
        {
          "07-10-2026": [
            {
              date: "07-10-2026",
              description: "CE-608: Development",
              project: 101,
              task: "CE-608",
              hours,
            },
          ],
        },
        false
      ),
      true
    );
  }
  for (const hours of [0, -1, NaN, Infinity, "", undefined, "abc"])
    assert.notEqual(validateWorklogHours(hours), true);
  assert.throws(
    () => validateWorkLogsData(null, false),
    /There are no worklogs/
  );
  assert.throws(
    () =>
      validateWorkLogsData(
        {
          "07-10-2026": [
            {
              date: "07-10-2026",
              description: "CE-608: Development",
              hours: 9,
            },
          ],
        },
        false
      ),
    /CE-608: Development: select a Redmine task/
  );
  assert.match(
    describeWorklog({
      date: "07-10-2026",
      hours: 9,
      task: "CE-608",
      description: "Development",
    }),
    /9h, task CE-608/
  );
});
