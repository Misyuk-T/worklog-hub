import { instance } from "./axios";
import { getAssignedIssues, getLatestJiraWorkLogs, jiraLogin } from "./jira";
import {
  getLatestRedmineWorkLogs,
  getRedmineProjects,
  redmineLogin,
} from "./redmine";
import {
  clickupLogin,
  getClickUpTeams,
  getAssignedTasks,
  getLatestClickUpTimeEntries,
} from "./clickup";

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
  addClickUpUser,
  addClickUpTeams,
  addClickUpAssignedTasks,
  setSelectedTeamId,
}) => {
  if (!currentSettings) return;

  const { jiraUrl, redmineUrl, additionalJiraUrls, clickupApiKey } = currentSettings;
  const hasJiraCredentials = Boolean(
    currentSettings.jiraUrl &&
      currentSettings.jiraEmail &&
      currentSettings.jiraApiKey,
  );

  // 1) Save org URLs in Zustand stores.
  saveOrganizationUrls(jiraUrl, redmineUrl);

  // 2) Fetch main JIRA
  if (hasJiraCredentials) {
    const jiraUser = await jiraLogin(jiraUrl);
    if (jiraUser && jiraUser.accountId) {
      addJiraUser(jiraUser);
      const assignedIssues = await getAssignedIssues(
        jiraUrl,
        jiraUser.accountId,
        null,
        []
      );
      addAssignedIssues(assignedIssues);
    }
  }

  // 3) Fetch additional JIRA URLs
  resetAdditionalAssignedIssues();
  if (hasJiraCredentials && additionalJiraUrls && Array.isArray(additionalJiraUrls)) {
    for (const { url } of additionalJiraUrls) {
      if (url?.length) {
        const userForAdditional = await jiraLogin(url);
        if (userForAdditional && userForAdditional.accountId) {
          const assignedIssues = await getAssignedIssues(
            url,
            userForAdditional.accountId,
            null,
            []
          );
          addAdditionalAssignedIssues(url, assignedIssues);
        }
      }
    }
  }
  if (hasJiraCredentials) {
    await getLatestJiraWorkLogs("all data");
  }

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

  // 5) Fetch ClickUp
  if (clickupApiKey) {
    const clickupUser = await clickupLogin();
    if (clickupUser && clickupUser.id) {
      addClickUpUser(clickupUser);
      const teams = await getClickUpTeams();
      if (teams && teams.length > 0) {
        addClickUpTeams(teams);
        const firstTeamId = teams[0].id;
        setSelectedTeamId(firstTeamId);
        const assignedTasks = await getAssignedTasks(firstTeamId, clickupUser.id);
        addClickUpAssignedTasks(assignedTasks);
      }
      await getLatestClickUpTimeEntries();
    }
  }
};
