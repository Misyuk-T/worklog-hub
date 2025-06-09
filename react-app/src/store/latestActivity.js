import { create } from "zustand";

const initialState = {
  activeTab: "redmine",
  panelSize: "partial",
};

const useLatestActivityStore = create((set) => ({
  activeTab: "redmine",
  panelSize: "partial",
  setActiveTab: (tab) => set({ activeTab: tab }),
  setPanelSize: (size) => set({ panelSize: size }),
  cyclePanelSize: () =>
    set((state) => {
      let newSize;
      if (state.panelSize === "collapsed") newSize = "partial";
      else if (state.panelSize === "partial") newSize = "full";
      else if (state.panelSize === "full") newSize = "collapsed";
      return { panelSize: newSize };
    }),
  reset: () => set(initialState),
}));

export default useLatestActivityStore;
