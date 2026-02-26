import { create } from "zustand";

const initialState = {
  user: null,
  teams: [],
  selectedTeamId: null,
  allClickUpTimeEntries: null,
  assignedTasks: [],
  additionalAssignedTasks: {},
};

const useClickUpStore = create((set) => ({
  user: null,
  teams: [],
  selectedTeamId: null,
  allClickUpTimeEntries: null,
  assignedTasks: [],
  additionalAssignedTasks: {},
  
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
  resetAll: () => set({ ...initialState }),
}));

export default useClickUpStore;
