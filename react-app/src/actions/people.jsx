import { instance } from "./axios";
import {
  DEMO_PRESET,
  getDemoClickUpTeams,
  getDemoJiraHost,
  getDemoJiraUserById,
  getDemoRedmineUser,
  isDemoActive,
  searchDemoJiraUsers,
  searchDemoRedmineUsers,
} from "../demo/demoMode";
import {
  filterPeople,
  mapLimit,
  redmineUserName,
  uniquePeopleFromMemberships,
} from "../helpers/peopleDirectory";
import {
  classifyCandidates,
  jiraUserToCandidate,
  resolveCandidates,
} from "../helpers/personMatching";
import {
  buildClickUpConnections,
  buildJiraConnections,
  credentialsSignature,
  listClickUpKeys,
} from "../helpers/trackerConnections";

// Everything here only reads, and every call carries the credentials it was
// started with, so a preset switch mid-way cannot change whose keys are used.
const readOptions = (credentials) => ({
  credentials,
  readOnly: true,
  skipErrorToast: true,
});

export const isForbidden = (error) =>
  [401, 403].includes(error?.response?.status);

const MEMBER_PAGE = 100;
const MEMBER_CONCURRENCY = 4;
const MAIL_LOOKUPS = 8;

// ---- Redmine people -------------------------------------------------------

// One directory per Redmine host + preset, kept for the session.
const directories = new Map();

const getDirectory = (credentials) => {
  const key = `${credentials?.id}|${credentials?.redmineUrl}`;
  if (!directories.has(key)) {
    directories.set(key, {
      mode: null, // "admin" (users.json works) | "members" (built from projects)
      people: null,
      loading: null,
      mails: new Map(),
      onProgress: null,
    });
  }
  return directories.get(key);
};

const getPaged = async (url, listKey, credentials) => {
  const items = [];
  for (let offset = 0; ; offset += MEMBER_PAGE) {
    const { data } = await instance.get(url, {
      params: { limit: MEMBER_PAGE, offset },
      ...readOptions(credentials),
    });
    const page = data?.[listKey] || [];
    items.push(...page);
    if (!page.length || offset + MEMBER_PAGE >= (data?.total_count ?? 0)) break;
  }
  return items;
};

const loadMemberDirectory = async (directory, credentials) => {
  const projects = await getPaged("/redmine/projects.json", "projects", credentials);
  const report = (done) => directory.onProgress?.({ done, total: projects.length });
  report(0);

  const memberships = [];
  let done = 0;
  let failures = 0;
  await mapLimit(projects, MEMBER_CONCURRENCY, async (project) => {
    try {
      memberships.push(
        ...(await getPaged(
          `/redmine/projects/${project.id}/memberships.json`,
          "memberships",
          credentials,
        )),
      );
    } catch {
      failures += 1; // a project whose members are hidden is skipped
    }
    done += 1;
    report(done);
  });

  if (projects.length && failures === projects.length) {
    throw new Error("No project member lists are visible with this API key.");
  }
  return [...uniquePeopleFromMemberships(memberships).values()];
};

const ensureMemberDirectory = (directory, credentials) => {
  if (directory.people) return Promise.resolve(directory.people);
  if (!directory.loading) {
    directory.loading = loadMemberDirectory(directory, credentials)
      .then((people) => {
        directory.people = people;
        return people;
      })
      .finally(() => {
        directory.loading = null;
      });
  }
  return directory.loading;
};

export const getRedmineUserMail = async (id, credentials) => {
  if (isDemoActive()) return getDemoRedmineUser(id)?.mail || "";
  const directory = getDirectory(credentials);
  if (directory.mails.has(id)) return directory.mails.get(id);
  try {
    const { data } = await instance.get(`/redmine/users/${id}.json`, readOptions(credentials));
    const mail = data?.user?.mail || "";
    directory.mails.set(id, mail);
    return mail;
  } catch (error) {
    if (isForbidden(error) || error?.response?.status === 404) directory.mails.set(id, "");
    return "";
  }
};

// Options for the picker: { id, name, mail }. `onProgress({ done, total })`
// reports the member directory being built (non-admin keys only).
export const searchRedmineUsers = async (query, { credentials, onProgress }) => {
  if (isDemoActive()) return searchDemoRedmineUsers(query);
  const directory = getDirectory(credentials);
  directory.onProgress = onProgress;

  if (directory.mode !== "members") {
    try {
      const { data } = await instance.get("/redmine/users.json", {
        params: { name: query, status: 1, limit: 25 },
        ...readOptions(credentials),
      });
      directory.mode = "admin";
      return (data?.users || []).map((user) => ({
        id: user.id,
        name: redmineUserName(user),
        mail: user.mail || "",
      }));
    } catch (error) {
      if (!isForbidden(error)) throw error;
      directory.mode = "members";
    }
  }

  const people = await ensureMemberDirectory(directory, credentials);
  const nameQuery = query.includes("@")
    ? query.split("@")[0].replace(/[._-]+/g, " ")
    : query;
  const candidates = filterPeople(people, nameQuery, directory.mails, MAIL_LOOKUPS);
  await Promise.all(
    candidates
      .filter((person) => !directory.mails.has(person.id))
      .map((person) => getRedmineUserMail(person.id, credentials)),
  );
  return filterPeople(people, query.includes("@") ? query : nameQuery, directory.mails);
};

// ---- Jira -----------------------------------------------------------------

// "granted" | "denied" | "unknown" (the check itself failed)
export const checkJiraUserPicker = async (connection) => {
  if (isDemoActive()) return "granted";
  try {
    const { data } = await instance.get("/jira/rest/api/3/mypermissions", {
      params: { jiraUrl: connection.host, permissions: "USER_PICKER" },
      ...readOptions(connection.credentials),
    });
    return data?.permissions?.USER_PICKER?.havePermission === true ? "granted" : "denied";
  } catch {
    return "unknown";
  }
};

export const searchJiraUsers = async (connection, query) => {
  if (isDemoActive()) return searchDemoJiraUsers(query);
  const { data } = await instance.get("/jira/rest/api/3/user/search", {
    params: { jiraUrl: connection.host, query, maxResults: 20 },
    ...readOptions(connection.credentials),
  });
  return (Array.isArray(data) ? data : []).filter(
    (user) => user.accountType !== "app" && user.active !== false,
  );
};

export const getJiraUserByAccountId = async (connection, accountId) => {
  if (isDemoActive()) {
    const user = getDemoJiraUserById(accountId);
    if (!user) throw new Error("No Jira user with this account id.");
    return user;
  }
  const { data } = await instance.get("/jira/rest/api/3/user", {
    params: { jiraUrl: connection.host, accountId },
    ...readOptions(connection.credentials),
  });
  return data;
};

const pickerPermissions = new Map();

// Checked once per site and key; Jira answers a user search without the
// "Browse users and groups" permission with an empty list, not an error.
const getPickerPermission = async (connection) => {
  const key = `${connection.host}|${connection.presetId}|${connection.credentials?.jiraApiKey}`;
  if (!pickerPermissions.has(key)) {
    pickerPermissions.set(key, checkJiraUserPicker(connection));
  }
  const permission = await pickerPermissions.get(key);
  if (permission === "unknown") pickerPermissions.delete(key);
  return permission;
};

const NO_PICKER_PERMISSION = {
  status: "noPermission",
  candidates: [],
  selectedId: null,
  confirmed: false,
  note: "No permission to search users on this site.",
};

// Finds the person on one Jira site: by email first, then by name. Only a
// visible, equal email counts as exact; the rest waits for the user.
export const resolveJiraConnection = async (connection, person) => {
  const permission = await getPickerPermission(connection);
  if (permission === "denied") return NO_PICKER_PERMISSION;

  const find = async (query, options) =>
    classifyCandidates(
      (await searchJiraUsers(connection, query)).map(jiraUserToCandidate),
      person,
      options,
    );

  try {
    let tagged = person.mail ? await find(person.mail, { foundByEmail: true }) : [];
    if (!tagged.length) tagged = await find(person.name);
    const row = resolveCandidates(tagged);
    return row.status === "notFound" && permission === "unknown"
      ? { ...row, note: "Not found, or no permission to search users." }
      : row;
  } catch (error) {
    if (isForbidden(error)) return NO_PICKER_PERMISSION;
    return {
      status: "error",
      candidates: [],
      selectedId: null,
      confirmed: false,
      error: error.message,
    };
  }
};

// ---- Connections ----------------------------------------------------------

// Jira sites and ClickUp workspaces reachable with the keys of ALL presets.
export const loadConnections = async ({ settings, activePresetId }) => {
  if (isDemoActive()) {
    const clickup = getDemoClickUpTeams().map((team) => ({
      id: `clickup:${team.id}`,
      service: "clickup",
      teamId: String(team.id),
      name: team.name,
      members: team.members,
      presetId: DEMO_PRESET.id,
      presetName: DEMO_PRESET.presetName,
      credentials: DEMO_PRESET,
    }));
    const host = getDemoJiraHost();
    return {
      jira: [
        {
          id: `jira:${host}`,
          service: "jira",
          host,
          presetId: DEMO_PRESET.id,
          presetName: DEMO_PRESET.presetName,
          credentials: DEMO_PRESET,
        },
      ],
      clickup,
      failures: [],
    };
  }

  const jira = buildJiraConnections(settings, activePresetId);
  const results = await Promise.all(
    listClickUpKeys(settings, activePresetId).map(async (preset) => {
      try {
        const { data } = await instance.get("/clickup/team", readOptions(preset));
        return { preset, teams: data?.teams || [] };
      } catch (error) {
        return { preset, teams: [], error };
      }
    }),
  );
  return {
    jira,
    clickup: buildClickUpConnections(results),
    failures: results
      .filter((result) => result.error)
      .map((result) => ({
        presetName: result.preset.presetName || result.preset.id,
        message: result.error.message,
      })),
  };
};

// ---- "Me" for one preset ----------------------------------------------------

// The identity a preset's own key authenticates as, read from the tracker with
// that preset's credentials (never from the shared stores, which may still
// belong to another preset). Cached per credentials and host for the session.
const identities = new Map();

const cachedIdentity = (key, load) => {
  if (!identities.has(key)) {
    identities.set(
      key,
      load().catch((error) => {
        identities.delete(key);
        throw error;
      }),
    );
  }
  return identities.get(key);
};

export const getMeJiraAccountId = (credentials, host) =>
  cachedIdentity(`jira|${credentialsSignature(credentials)}|${host}`, async () => {
    const { data } = await instance.get("/jira/rest/api/3/myself", {
      params: { jiraUrl: host },
      ...readOptions(credentials),
    });
    if (!data?.accountId) throw new Error(`Jira at ${host} returned no account.`);
    return data.accountId;
  });

export const getMeRedmineId = (credentials) =>
  cachedIdentity(`redmine|${credentialsSignature(credentials)}`, async () => {
    const { data } = await instance.get("/redmine/users/current.json", readOptions(credentials));
    if (!data?.user?.id) throw new Error("Redmine returned no current user.");
    return data.user.id;
  });

// { userId, teams: [{ id, name }] } for the ClickUp key of the preset.
export const getMeClickUp = (credentials) =>
  cachedIdentity(`clickup|${credentialsSignature(credentials)}`, async () => {
    const [{ data: me }, { data: teams }] = await Promise.all([
      instance.get("/clickup/user", readOptions(credentials)),
      instance.get("/clickup/team", readOptions(credentials)),
    ]);
    if (!me?.user?.id) throw new Error("ClickUp returned no current user.");
    return {
      userId: me.user.id,
      teams: (teams?.teams || []).map((team) => ({ id: String(team.id), name: team.name })),
    };
  });
