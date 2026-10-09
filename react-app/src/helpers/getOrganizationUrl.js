// A stored Redmine value is either a legacy slug ("acme" -> https://redmine.acme.com)
// or a host/URL ("redmine.example.org", "https://tracker.example.com/redmine").
// Keep this rule identical to server/scripts/helpers/redmineUrl.js.
export const resolveRedmineBaseUrl = (value) => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";

  const isLegacySlug = !raw.includes(".") && !raw.includes("://");
  const withScheme = isLegacySlug
    ? `https://redmine.${raw}.com`
    : /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
      ? raw
      : `https://${raw}`;

  return withScheme.replace(/\/+$/, "");
};

// Host shown in the settings field: legacy slugs are expanded to the real host.
export const getRedmineHostForDisplay = (value) =>
  resolveRedmineBaseUrl(value).replace(/^https:\/\//i, "");

export const getOrganizationUrls = (jiraOrganization, redmineOrganization) => {
  const redmineUrl = resolveRedmineBaseUrl(redmineOrganization);
  const jiraUrl = jiraOrganization ? `https://${jiraOrganization}` : "";

  return { redmineUrl, jiraUrl };
};
