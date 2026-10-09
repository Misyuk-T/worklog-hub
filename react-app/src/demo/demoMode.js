import { create } from "zustand";
import { toast } from "react-toastify";

import { instance } from "../actions/axios";
import useRedmineStore from "../store/redmineStore";
import useJiraStore from "../store/jiraStore";
import useClickUpStore from "../store/clickupStore";
import useWorkLogsStore from "../store/worklogsStore";
import { buildDemoWorkspace } from "./demoData";

export const useDemoStore = create(() => ({ isDemo: false }));

export const DEMO_BLOCKED_CODE = "DEMO_MODE";

// While the demo runs, no request leaves the browser. Reads and writes to the
// trackers stop here with a short explanation instead of an auth error.
instance.interceptors.request.use((config) => {
  if (!useDemoStore.getState().isDemo) return config;

  toast.info(
    "Demo mode: nothing is sent to Redmine, Jira or ClickUp. Sign in and add your API keys to do this for real.",
    { toastId: "demo-blocked", position: "bottom-center", autoClose: 4000 },
  );
  const error = new Error("Demo mode: requests to trackers are disabled.");
  error.code = DEMO_BLOCKED_CODE;
  error.config = { ...config, skipErrorToast: true };
  return Promise.reject(error);
});

export const startDemo = () => {
  const demo = buildDemoWorkspace();

  useRedmineStore.setState(demo.redmine);
  useJiraStore.setState(demo.jira);
  useClickUpStore.setState(demo.clickUp);
  useWorkLogsStore.setState({ workLogs: demo.workLogs });
  useDemoStore.setState({ isDemo: true });
};

export const exitDemo = () => {
  useRedmineStore.getState().resetAll();
  useJiraStore.getState().resetAll();
  useClickUpStore.getState().resetAll();
  useWorkLogsStore.getState().resetAll();
  useDemoStore.setState({ isDemo: false });
};

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

export const isDemoActive = () => useDemoStore.getState().isDemo;

export const getDemoRedmineLogs = (startDate, endDate) =>
  useRedmineStore
    .getState()
    .latestActivity.filter((entry) => inRange(entry.spent_on, startDate, endDate));

export const getDemoJiraLogs = (startDate, endDate) =>
  filterGrouped(useJiraStore.getState().allJiraWorklogs, startDate, endDate);

export const getDemoClickUpLogs = (startDate, endDate) =>
  filterGrouped(useClickUpStore.getState().allClickUpTimeEntries, startDate, endDate);
