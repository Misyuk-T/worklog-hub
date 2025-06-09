const express = require("express");
const path = require("path");
const axios = require("axios");
const Bottleneck = require("bottleneck");

const { multer } = require("../middlewares");
const { parseText, parseXMLS } = require("../scripts");

const router = express.Router();

// Create a Bottleneck instance to throttle requests (200ms minimum delay between each request)
const limiter = new Bottleneck({
  minTime: 333,
});

router.post("/submit-form", multer.single("file"), async (req, res) => {
  const formData = req.body;
  const fileType = formData.type;
  const file = req.file;
  const fileExtension = path.extname(file.originalname);
  const isXLSXFile = fileExtension === ".xlsx";
  const isTextFile = fileExtension === ".txt";
  const isJiraFile = fileType === "jira";

  try {
    if ((isJiraFile && isXLSXFile) || (!isJiraFile && isTextFile)) {
      const data = isXLSXFile ? file.buffer : file.buffer.toString("utf8");
      const parsedResponse = isJiraFile ? parseXMLS(data) : parseText(data);
      res.send(parsedResponse);
    } else {
      throw new Error(
          "Invalid file extension. Only .txt for custom and .xlsx for jira files are supported."
      );
    }
  } catch (error) {
    console.error("Error: ", JSON.stringify(error));
    res.status(500).send("Error while parsing file on server.");
  }
});

router.all("/redmine/*", async (req, res) => {
  try {
    const { redmineApiKey, redmineUrl } = req.query;
    const redmineURL = `https://redmine.${redmineUrl}.com`;
    const url = `${redmineURL}${req.originalUrl.replace("/redmine", "")}`;

    const response = await axios({
      method: req.method,
      url,
      data: req.body,
      params: {
        key: redmineApiKey,
      }
    });

    res.send(response.data);
  } catch (error) {
    console.error("Error while connecting to Redmine: ", JSON.stringify(error));
    res.status(500).send("Error while connecting to Redmine");
  }
});

router.all("/jira/*", async (req, res) => {
  try {
    const { jiraUrl, jiraApiKey, jiraEmail } = req.query;
    const url = `https://${jiraUrl}${req.originalUrl.replace("/jira", "")}`;

    const axiosConfig = {
      method: req.method,
      url,
      headers: {
        Authorization: `Basic ${Buffer.from(
            `${jiraEmail}:${jiraApiKey}`
        ).toString("base64")}`,
      },
    };

    if (req.method !== "GET") {
      axiosConfig.data = req.body;
    }

    const response = await limiter.schedule(() => axios(axiosConfig));
    res.send(response.data);
  } catch (error) {
    console.error("Error while connecting to JIRA: ", JSON.stringify(error));
    res.status(500).send("Error while connecting to JIRA");
  }
});

module.exports = router;
