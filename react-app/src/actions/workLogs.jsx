import { instance } from "./axios";
import { getAssignedIssues, getLatestJiraWorkLogs, jiraLogin } from "./jira";
import {
  getLatestRedmineWorkLogs,
  getRedmineProjects,
  redmineLogin,
} from "./redmine";

export const sendWorkLogs = (formData) => {
  return instance
    .post("/submit-form", formData)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.error(error);
    });
};

export const fetchAllData = async ({
  currentSettings,
  addJiraUser,
  addAssignedIssues,
  resetAdditionalAssignedIssues,
  addAdditionalAssignedIssues,
  addUser,
  addProjects,
  addLatestActivity,
  saveOrganizationUrls,
}) => {
  if (!currentSettings) return;

  const { jiraUrl, redmineUrl, additionalJiraUrls } = currentSettings;

  // 1) Save org URLs in Zustand stores.
  saveOrganizationUrls(jiraUrl, redmineUrl);

  // 2) Fetch main JIRA
  if (jiraUrl) {
    const jiraUser = await jiraLogin(jiraUrl);
    if (jiraUser && jiraUser.accountId) {
      addJiraUser(jiraUser);
      const assignedIssues = await getAssignedIssues(
        jiraUrl,
        jiraUser.accountId
      );
      addAssignedIssues(assignedIssues);
    }
  }

  // 3) Fetch additional JIRA URLs
  resetAdditionalAssignedIssues();
  if (additionalJiraUrls && Array.isArray(additionalJiraUrls)) {
    for (const { url } of additionalJiraUrls) {
      if (url?.length) {
        const userForAdditional = await jiraLogin(url);
        if (userForAdditional && userForAdditional.accountId) {
          const assignedIssues = await getAssignedIssues(
            url,
            userForAdditional.accountId
          );
          addAdditionalAssignedIssues(url, assignedIssues);
        }
      }
    }
  }
  await getLatestJiraWorkLogs("all data");

  // 4) Fetch Redmine
  if (redmineUrl) {
    const redmineUser = await redmineLogin();
    if (redmineUser) {
      addUser(redmineUser);
      const projects = await getRedmineProjects(redmineUser.id);
      addProjects(projects);

      const latestActivity = await getLatestRedmineWorkLogs(redmineUser.id);
      addLatestActivity(latestActivity);
    }
  }
};
