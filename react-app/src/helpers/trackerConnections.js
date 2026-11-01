// Which Jira sites and ClickUp workspaces can be reached with the keys in the
// presets. A connection always carries the preset that declared it, so a key is
// never sent to a host it was not saved for.

const normalizeHost = (value) =>
  String(value ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "")
    .toLowerCase();

const filled = (value) => String(value ?? "").trim() !== "";

// Active preset first, then the others in stored order.
export const orderPresets = (settings, activePresetId) => {
  const presets = Object.values(settings || {}).filter(Boolean);
  return [
    ...presets.filter((preset) => preset.id === activePresetId),
    ...presets.filter((preset) => preset.id !== activePresetId),
  ];
};

export const buildJiraConnections = (settings, activePresetId) => {
  const connections = new Map();

  orderPresets(settings, activePresetId).forEach((preset) => {
    if (!filled(preset.jiraEmail) || !filled(preset.jiraApiKey)) return;
    const hosts = [
      preset.jiraUrl,
      ...(preset.additionalJiraUrls || []).map((item) => item?.url),
    ]
      .map(normalizeHost)
      .filter(Boolean);

    hosts.forEach((host) => {
      if (connections.has(host)) return;
      connections.set(host, {
        id: `jira:${host}`,
        service: "jira",
        host,
        presetId: preset.id,
        presetName: preset.presetName || preset.id,
        credentials: preset,
      });
    });
  });

  return [...connections.values()];
};

// One entry per distinct ClickUp key, active preset first.
export const listClickUpKeys = (settings, activePresetId) => {
  const seen = new Set();
  return orderPresets(settings, activePresetId).filter((preset) => {
    const key = String(preset.clickupApiKey ?? "").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// keyResults: [{ preset, teams }] in the order of listClickUpKeys. One
// connection per workspace id; the first (active) preset's key wins.
export const buildClickUpConnections = (keyResults) => {
  const connections = new Map();
  (keyResults || []).forEach(({ preset, teams }) => {
    (teams || []).forEach((team) => {
      const teamId = String(team.id);
      if (connections.has(teamId)) return;
      connections.set(teamId, {
        id: `clickup:${teamId}`,
        service: "clickup",
        teamId,
        name: team.name || teamId,
        members: team.members || [],
        presetId: preset.id,
        presetName: preset.presetName || preset.id,
        credentials: preset,
      });
    });
  });
  return [...connections.values()];
};

export const connectionLabel = (connection) => {
  if (connection.service === "jira") {
    return `Jira · ${connection.host} (preset ${connection.presetName})`;
  }
  return `ClickUp · ${connection.name} (preset ${connection.presetName})`;
};

// Changes whenever the active preset or anything it authenticates with changes.
export const credentialsSignature = (preset) =>
  preset
    ? JSON.stringify([
        preset.id,
        preset.redmineUrl,
        preset.redmineApiKey,
        preset.jiraUrl,
        preset.jiraEmail,
        preset.jiraApiKey,
        (preset.additionalJiraUrls || []).map((item) => item?.url),
        preset.clickupApiKey,
      ])
    : "";
