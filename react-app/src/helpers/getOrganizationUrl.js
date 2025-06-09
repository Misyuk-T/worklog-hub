export const getOrganizationUrls = (jiraOrganization, redmineOrganization) => {
  const redmineUrl = redmineOrganization
    ? `https://redmine.${redmineOrganization}.com`
    : "";
  const jiraUrl = jiraOrganization ? `https://${jiraOrganization}` : "";

  return { redmineUrl, jiraUrl };
};
