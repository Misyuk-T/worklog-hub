import { create } from "zustand";
import { normalizeServiceScope as normalizeJiraUrl } from "../helpers/matchWorklogTasks.js";

const mergeFetchedIssue = (issues, issue) => {
  const existing = issues.find((item) => item.key === issue.key);
  if (!existing) return [...issues, issue];
  return issues.map((item) =>
    item === existing
      ? {
          ...item,
          ...issue,
          lookupAliases: [
            ...new Set([
              ...(item.lookupAliases || []),
              ...(issue.lookupAliases || []),
            ]),
          ],
        }
      : item
  );
};

const initialState = {
  user: null,
  allJiraWorklogs: null,
  assignedIssues: [],
  additionalAssignedIssues: {},
  organizationURL: "",
};

const useJiraStore = create((set) => ({
  user: null,
  allJiraWorklogs: null,
  assignedIssues: [],
  additionalAssignedIssues: {},
  organizationURL: "",
  addUser: (user) => set({ user }),
  resetUser: () => set({ user: null }),

  addAllJiraWorklogs: (allJiraWorklogs) => set({ allJiraWorklogs }),
  resetAllJiraWorklogs: () => set({ allJiraWorklogs: null }),
  addAssignedIssues: (assignedIssues) => set({ assignedIssues }),
  addFetchedIssue: (jiraUrl, issue) =>
    set((state) => {
      const normalizedJiraUrl = normalizeJiraUrl(jiraUrl);
      const mainUrl = normalizeJiraUrl(state.organizationURL);
      if (normalizedJiraUrl === mainUrl) {
        return {
          assignedIssues: mergeFetchedIssue(state.assignedIssues, issue),
        };
      }

      const storeUrl =
        Object.keys(state.additionalAssignedIssues).find(
          (url) => normalizeJiraUrl(url) === normalizedJiraUrl
        ) || normalizedJiraUrl;
      const issues = state.additionalAssignedIssues[storeUrl] || [];
      return {
        additionalAssignedIssues: {
          ...state.additionalAssignedIssues,
          [storeUrl]: mergeFetchedIssue(issues, issue),
        },
      };
    }),
  resetAssignedIssues: () => set({ assignedIssues: [] }),

  addAdditionalAssignedIssues: (jiraUrl, issues) =>
    set((state) => ({
      additionalAssignedIssues: {
        ...state.additionalAssignedIssues,
        [jiraUrl]: issues,
      },
    })),

  addOrganizationURL: (organizationURL) => set({ organizationURL }),
  resetOrganizationURL: () => set({ organizationURL: "" }),
  resetAdditionalAssignedIssues: () => set({ additionalAssignedIssues: {} }),
  resetAll: () => set({ ...initialState }),
}));

export default useJiraStore;
