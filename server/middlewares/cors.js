const cors = require("cors");

const corsOptions = {
  optionsSuccessStatus: 200,
  allowedHeaders: [
    "Content-Type",
    "X-Redmine-Api-Key",
    "X-Redmine-Url",
    "X-Jira-Api-Key",
    "X-Jira-Email",
    "X-ClickUp-Api-Key",
  ],
};

module.exports = cors(corsOptions);
