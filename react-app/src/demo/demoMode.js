import { create } from "zustand";
import { toast } from "react-toastify";

import { instance } from "../actions/axios";
import useRedmineStore from "../store/redmineStore";
import useJiraStore from "../store/jiraStore";
import useClickUpStore from "../store/clickupStore";
import useWorkLogsStore from "../store/worklogsStore";
import { buildDemoWorkspace } from "./demoData";

// The demo exists only in builds made with VITE_DEMO=true (the public demo
// site). The flag is a compile-time constant, so in every other build the
// branches guarded by it are dropped, along with the demo data.
export const DEMO_BUILD = import.meta.env.VITE_DEMO === "true";

export const useDemoStore = create(() => ({ isDemo: DEMO_BUILD }));

export const DEMO_BLOCKED_CODE = "DEMO_MODE";

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
