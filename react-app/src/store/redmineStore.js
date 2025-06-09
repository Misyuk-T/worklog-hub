import { create } from "zustand";

const initialState = {
  user: null,
  projects: [],
  organizationURL: "",
  latestActivity: [],
};

const useRedmineStore = create((set) => ({
  user: null,
  projects: [],
  organizationURL: "",
  latestActivity: [],
  addProjects: (projects) => set({ projects: projects }),
  resetProjects: () => set({ projects: [] }),
  addUser: (user) => set({ user }),
  resetUser: () => set({ user: null }),
  addLatestActivity: (latestActivity) => set({ latestActivity }),
  resetLatestActivity: () => set({ latestActivity: [] }),
  addOrganizationURL: (organizationURL) => set({ organizationURL }),
  resetOrganizationURL: () => set({ organizationURL: "" }),
  resetAll: () => set({ ...initialState }),
}));

export default useRedmineStore;
