// Jira is optional: either all three Jira fields are empty (not configured),
// or all three must be filled.
export const JIRA_FIELD_IDS = ["jiraEmail", "jiraApiKey", "jiraUrl"];

const isFilled = (value) => String(value ?? "").trim() !== "";

export const isJiraAnyFilled = (values) =>
  JIRA_FIELD_IDS.some((id) => isFilled(values?.[id]));

export const isJiraConfigured = (settings) =>
  JIRA_FIELD_IDS.every((id) => isFilled(settings?.[id]));

// react-hook-form `validate` rule for one of the three Jira fields.
export const validateJiraField = (value, formValues) =>
  !isJiraAnyFilled(formValues) || isFilled(value);
