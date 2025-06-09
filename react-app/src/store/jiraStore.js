import { create } from "zustand";

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
