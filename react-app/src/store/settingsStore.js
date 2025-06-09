import { create } from "zustand";

const initialState = {
  settings: null,
  currentSettings: null,
};

const useSettingsStore = create((set) => ({
  settings: null,
  currentSettings: null,
  addSettings: (settings) => set({ settings }),
  resetSettings: () => set({ settings: null }),
  updateSettings: (settingData) => {
    set((state) => {
      const existingSettings = state.settings?.[settingData?.id];
      let settings = { ...state.settings };

      if (existingSettings) {
        settings[settingData.id] = {
          ...settings[settingData.id],
          ...settingData,
        };
      } else {
        settings = { ...state.settings, [settingData.id]: settingData };
      }

      return { settings };
    });
  },
  deleteSetting: (id) => {
    set((state) => {
      const settings = { ...state.settings };
      delete settings[id];
      return { settings };
    });
  },
  addCurrentSettings: (currentSettings) => set({ currentSettings }),
  resetCurrentSettings: () => set({ currentSettings: null }),
  resetAll: () => set({ ...initialState }),
}));

export default useSettingsStore;
