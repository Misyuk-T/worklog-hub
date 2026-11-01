import { create } from "zustand";
import { toast } from "react-toastify";
import { createElement } from "react";

import { instance } from "../actions/axios";
import useRedmineStore from "../store/redmineStore";
import useJiraStore from "../store/jiraStore";
import useClickUpStore from "../store/clickupStore";
import useWorkLogsStore from "../store/worklogsStore";
import { buildDemoWorkspace } from "./demoData";
import { filterPeople } from "../helpers/peopleDirectory";
import { normalizeEmail, normalizeName } from "../helpers/personMatching";

// The demo exists only in builds made with VITE_DEMO=true (the public demo
// site). The flag is a compile-time constant, so in every other build the
// branches guarded by it are dropped, along with the demo data.
export const DEMO_BUILD = import.meta.env.VITE_DEMO === "true";

export const useDemoStore = create(() => ({ isDemo: DEMO_BUILD }));

export const DEMO_BLOCKED_CODE = "DEMO_MODE";

let demoGenerated = {};
let demoPeople = [];
let demoClickUpTeam = null;
let demoJiraHost = "";

if (DEMO_BUILD) {
  // The demo never talks to a tracker. Reads and writes stop here with a short
  // explanation instead of an auth error.
  instance.interceptors.request.use((config) => {
    toast.info(
      "Demo: nothing is sent to Redmine, Jira or ClickUp. The real app does this with your own API keys.",
      { toastId: "demo-blocked", position: "bottom-center", autoClose: 4000 },
    );
    const error = new Error("Demo: requests to trackers are disabled.");
    error.code = DEMO_BLOCKED_CODE;
    error.config = { ...config, skipErrorToast: true };
    return Promise.reject(error);
  });

  // Fill the stores before the first render: the demo opens on the workspace.
  const demo = buildDemoWorkspace();
  useRedmineStore.setState(demo.redmine);
  useJiraStore.setState(demo.jira);
  useClickUpStore.setState(demo.clickUp);
  useWorkLogsStore.setState({ workLogs: demo.workLogs });
  demoGenerated = demo.generated;
  demoPeople = demo.people;
  demoClickUpTeam = demo.clickUpTeam;
  demoJiraHost = demo.jiraHost;
}

// Compare reads date ranges through the action layer. In demo mode the
// actions answer from the demo stores instead of the network.
const inRange = (isoDate, startDate, endDate) =>
  (!startDate || isoDate >= startDate) && (!endDate || isoDate <= endDate);

const dmyToIso = (dmy) => dmy.split("-").reverse().join("-");

const filterGrouped = (grouped, startDate, endDate) =>
  Object.fromEntries(
    Object.entries(grouped || {}).filter(([date]) =>
      inRange(dmyToIso(date), startDate, endDate),
    ),
  );

export const isDemoActive = () => DEMO_BUILD;

export const getDemoRedmineLogs = (startDate, endDate) =>
  useRedmineStore
    .getState()
    .latestActivity.filter((entry) => inRange(entry.spent_on, startDate, endDate));

export const getDemoJiraLogs = (startDate, endDate) =>
  filterGrouped(useJiraStore.getState().allJiraWorklogs, startDate, endDate);

export const getDemoClickUpLogs = (startDate, endDate) =>
  filterGrouped(useClickUpStore.getState().allClickUpTimeEntries, startDate, endDate);

// Generate in the demo hands out cards made from the demo data, with no request.
// Days inside the chosen range are used; when none fall inside it (the dialogs
// open on today), the two most recent demo days stand in.
const recentDates = (dates, count) =>
  [...dates].sort((a, b) => (a < b ? 1 : -1)).slice(0, count);

export const getDemoCards = (startDate, endDate) => {
  const inside = filterGrouped(demoGenerated, startDate, endDate);
  const picked = Object.keys(inside).length
    ? inside
    : Object.fromEntries(
        recentDates(Object.keys(demoGenerated), 2).map((date) => [
          date,
          demoGenerated[date],
        ]),
      );
  return Object.fromEntries(
    Object.entries(picked).map(([date, list]) => [
      date,
      list.map((card) => ({ ...card })),
    ]),
  );
};

export const getDemoRedmineLogsForCards = (startDate, endDate) => {
  const all = useRedmineStore.getState().latestActivity;
  const inside = all.filter((entry) => inRange(entry.spent_on, startDate, endDate));
  if (inside.length) return inside;
  const latest = recentDates(new Set(all.map((entry) => entry.spent_on)), 2);
  return all.filter((entry) => latest.includes(entry.spent_on));
};

// Submitting in the demo succeeds without sending anything.
export const toastDemoSubmit = (count, trackerName) =>
  toast.success(
    createElement(
      "strong",
      null,
      `Demo: ${count} worklog${count === 1 ? "" : "s"} would be saved to ${trackerName}. Nothing was sent.`,
    ),
    {
      position: "bottom-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      theme: "light",
    },
  );

// Compare "Whose logs": colleagues answered from demo data, no request.
export const DEMO_PRESET = { id: "demo", presetName: "Demo" };

export const searchDemoRedmineUsers = (query) =>
  filterPeople(
    demoPeople.map((person) => ({ id: person.redmineId, name: person.name, mail: person.mail })),
    query,
    new Map(),
  );

export const getDemoRedmineUser = (id) => {
  const person = demoPeople.find((item) => item.redmineId === Number(id));
  return person ? { id: person.redmineId, name: person.name, mail: person.mail } : null;
};

// Like Jira Cloud: an email query matches the real address even when the
// result hides it; a name query matches the display name.
export const searchDemoJiraUsers = (query) => {
  const text = String(query ?? "").trim();
  const byEmail = text.includes("@");
  return demoPeople
    .filter((person) =>
      byEmail
        ? normalizeEmail(person.mail) === normalizeEmail(text)
        : normalizeName(person.jira.displayName)
            .split(" ")
            .some((part) => normalizeName(text).split(" ").includes(part)),
    )
    .map((person) => ({
      accountId: person.jira.accountId,
      displayName: person.jira.displayName,
      ...(person.jira.email ? { emailAddress: person.jira.email } : {}),
      active: true,
      accountType: "atlassian",
    }));
};

export const getDemoJiraUserById = (accountId) =>
  searchDemoJiraUsers(
    demoPeople.find((person) => person.jira.accountId === accountId)?.mail || "",
  )[0] || null;

export const getDemoJiraHost = () => demoJiraHost;

export const getDemoClickUpTeams = () =>
  demoClickUpTeam
    ? [
        {
          ...demoClickUpTeam,
          members: demoPeople
            .filter((person) => person.clickUp)
            .map((person) => ({ user: person.clickUp })),
        },
      ]
    : [];

export const getDemoPersonLogs = (tracker, key, startDate, endDate) => {
  const person = demoPeople.find((item) =>
    tracker === "redmine"
      ? item.redmineId === Number(key)
      : tracker === "jira"
        ? item.jira.accountId === key
        : item.clickUp?.id === String(key),
  );
  if (!person) return tracker === "redmine" ? [] : {};
  if (tracker === "redmine") {
    return person.logs.redmine.filter((entry) => inRange(entry.spent_on, startDate, endDate));
  }
  return filterGrouped(person.logs[tracker], startDate, endDate);
};
