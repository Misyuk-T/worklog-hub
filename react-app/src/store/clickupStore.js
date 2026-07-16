import { create } from "zustand";

const initialState = {
  user: null,
  teams: [],
  selectedTeamId: null,
  allClickUpTimeEntries: null,
  assignedTasks: [],
  additionalAssignedTasks: {},
  manualTasks: {},
};

const useClickUpStore = create((set) => ({
  user: null,
  teams: [],
  selectedTeamId: null,
  allClickUpTimeEntries: null,
  assignedTasks: [],
  additionalAssignedTasks: {},
  // Tasks pulled in by id because they aren't assigned to the user, keyed by
  // teamId. Kept next to the assigned ones so every task select can offer them.
  manualTasks: {},

  addUser: (user) => set({ user }),
  resetUser: () => set({ user: null }),
  
  addTeams: (teams) => set({ teams }),
  resetTeams: () => set({ teams: [] }),
  
  setSelectedTeamId: (teamId) => set({ selectedTeamId: teamId }),
  
  addAllClickUpTimeEntries: (allClickUpTimeEntries) => set({ allClickUpTimeEntries }),
  resetAllClickUpTimeEntries: () => set({ allClickUpTimeEntries: null }),
  
  addAssignedTasks: (assignedTasks) => set({ assignedTasks }),
  resetAssignedTasks: () => set({ assignedTasks: [] }),
  
  addAdditionalAssignedTasks: (teamId, tasks) =>
    set((state) => ({
      additionalAssignedTasks: {
        ...state.additionalAssignedTasks,
        [teamId]: tasks,
      },
    })),
  
  resetAdditionalAssignedTasks: () => set({ additionalAssignedTasks: {} }),

  addManualTask: (teamId, task) =>
    set((state) => {
      const existingTasks = state.manualTasks[teamId] || [];
      if (existingTasks.some((item) => item.id === task.id)) {
        return state;
      }

      return {
        manualTasks: {
          ...state.manualTasks,
          [teamId]: [...existingTasks, task],
        },
      };
    }),

  resetManualTasks: () => set({ manualTasks: {} }),
  resetAll: () => set({ ...initialState }),
}));

export default useClickUpStore;
