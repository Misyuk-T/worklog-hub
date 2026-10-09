const express = require("express");
const path = require("path");
const axios = require("axios");
const Bottleneck = require("bottleneck");

const { multer } = require("../middlewares");
const { parseText, parseXMLS, resolveRedmineBaseUrl, assertSafeTarget } = require("../scripts");
const { AppError, sendError, upstreamError } = require("../errors");

const defaultLimiter = new Bottleneck({ minTime: 333 });

const requireValues = (values) => {
  const missing = Object.entries(values)
    .filter(([, value]) => typeof value !== "string" || !value.trim())
    .map(([field]) => ({ field, message: `${field} is required.` }));
  if (missing.length) throw new AppError(400, "MISSING_CREDENTIALS", "Required connection settings are missing.", missing);
};

const forwardedQuery = (query, credentialFields) => Object.fromEntries(
  Object.entries(query).filter(([field]) => !credentialFields.includes(field))
);

// Credentials travel in headers; the query string is still read so an older frontend keeps working.
const CREDENTIAL_SOURCES = {
  redmineApiKey: "x-redmine-api-key",
  redmineUrl: "x-redmine-url",
  jiraApiKey: "x-jira-api-key",
  jiraEmail: "x-jira-email",
  clickupApiKey: "x-clickup-api-key",
};

const readCredentials = (req, fields) => Object.fromEntries(
  fields.map((field) => [field, req.get(CREDENTIAL_SOURCES[field]) || req.query[field]])
);

const redmineBaseUrl = (redmineUrl) => {
  const isLegacySlug = !redmineUrl.includes(".") && !redmineUrl.includes("://");
  if (isLegacySlug && !/^[a-z0-9-]+$/i.test(redmineUrl.trim())) {
    throw new AppError(400, "BLOCKED_TARGET", "This server address is not allowed.", [
      { field: "redmineUrl", message: "Use a Redmine host such as redmine.example.com." },
    ]);
  }
  return resolveRedmineBaseUrl(redmineUrl);
};

const createRouter = ({ axiosClient = axios, limiter = defaultLimiter } = {}) => {
  const router = express.Router();

  router.post("/submit-form", (req, res) => {
    multer.single("file")(req, res, (uploadError) => {
      if (uploadError) return sendError(res, new AppError(400, "INVALID_UPLOAD", "The file could not be uploaded.", [uploadError.message]));
      try {
        const fileType = req.body?.type;
        const file = req.file;
        if (!file) {
          throw new AppError(400, "MISSING_FILE", "Choose a worklog file to import.", [
            { field: "file", message: "A .txt or .xlsx file is required." },
          ]);
        }
        if (!['custom', 'jira'].includes(fileType)) {
          throw new AppError(400, "INVALID_IMPORT_TYPE", "Choose a valid worklog import type.", [
            { field: "type", message: 'Expected "custom" for TXT or "jira" for XLSX.' },
          ]);
        }
        const extension = path.extname(file.originalname || "").toLowerCase();
        const isJiraFile = fileType === "jira";
        const expectedExtension = isJiraFile ? ".xlsx" : ".txt";
        if (extension !== expectedExtension) {
          throw new AppError(400, "UNSUPPORTED_FILE_TYPE", `This import requires a ${expectedExtension} file.`, [
            { field: "file", message: `Received ${extension || "a file without an extension"}.` },
          ]);
        }
        const data = isJiraFile ? file.buffer : file.buffer.toString("utf8");
        return res.send(isJiraFile ? parseXMLS(data) : parseText(data));
      } catch (error) {
        return sendError(res, error);
      }
    });
  });

  router.all("/redmine/*", async (req, res) => {
    try {
      const { redmineApiKey, redmineUrl } = readCredentials(req, ["redmineApiKey", "redmineUrl"]);
      requireValues({ redmineApiKey, redmineUrl });
      const url = assertSafeTarget(`${redmineBaseUrl(redmineUrl)}${req.path.replace("/redmine", "")}`, "redmineUrl").href;
      const params = { ...forwardedQuery(req.query, ["redmineApiKey", "redmineUrl"]), key: redmineApiKey };
      const response = await axiosClient({ method: req.method, url, data: req.body, params });
      return res.send(response.data);
    } catch (error) {
      const { redmineApiKey } = readCredentials(req, ["redmineApiKey"]);
      return sendError(res, error instanceof AppError ? error : upstreamError("Redmine", error, req.body, [redmineApiKey]));
    }
  });

  router.all("/jira/*", async (req, res) => {
    try {
      const { jiraApiKey, jiraEmail } = readCredentials(req, ["jiraApiKey", "jiraEmail"]);
      const { jiraUrl } = req.query;
      requireValues({ jiraUrl, jiraApiKey, jiraEmail });
      const config = {
        method: req.method,
        url: assertSafeTarget(`https://${jiraUrl}${req.path.replace("/jira", "")}`, "jiraUrl").href,
        headers: { Authorization: `Basic ${Buffer.from(`${jiraEmail}:${jiraApiKey}`).toString("base64")}` },
        params: forwardedQuery(req.query, ["jiraUrl", "jiraApiKey", "jiraEmail"]),
      };
      if (req.method !== "GET") config.data = req.body;
      const response = await limiter.schedule(() => axiosClient(config));
      return res.send(response.data);
    } catch (error) {
      const { jiraApiKey, jiraEmail } = readCredentials(req, ["jiraApiKey", "jiraEmail"]);
      const basicCredential = jiraApiKey && jiraEmail
        ? Buffer.from(`${jiraEmail}:${jiraApiKey}`).toString("base64")
        : undefined;
      return sendError(res, error instanceof AppError ? error : upstreamError("Jira", error, req.body, [jiraApiKey, jiraEmail, basicCredential]));
    }
  });

  router.all("/clickup/*", async (req, res) => {
    try {
      const { clickupApiKey } = readCredentials(req, ["clickupApiKey"]);
      requireValues({ clickupApiKey });
      const config = {
        method: req.method,
        url: `https://api.clickup.com/api/v2${req.path.replace("/clickup", "")}`,
        headers: { Authorization: clickupApiKey, "Content-Type": "application/json" },
        params: forwardedQuery(req.query, ["clickupApiKey"]),
      };
      if (req.method !== "GET") config.data = req.body;
      const response = await limiter.schedule(() => axiosClient(config));
      return res.send(response.data);
    } catch (error) {
      const { clickupApiKey } = readCredentials(req, ["clickupApiKey"]);
      return sendError(res, error instanceof AppError ? error : upstreamError("ClickUp", error, req.body, [clickupApiKey]));
    }
  });

  return router;
};

const router = createRouter();
module.exports = router;
module.exports.createRouter = createRouter;
