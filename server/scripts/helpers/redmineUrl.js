// A stored Redmine value is either a legacy slug ("acme" -> https://redmine.acme.com)
// or a host/URL ("redmine.example.org", "https://tracker.example.com/redmine").
// Keep this rule identical to react-app/src/helpers/getOrganizationUrl.js.
const resolveRedmineBaseUrl = (value) => {
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

module.exports = { resolveRedmineBaseUrl };
