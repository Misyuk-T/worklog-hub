import { create } from "zustand";

const initialState = {
  user: null,
  isLoading: false,
  isAuthObserve: false,
  // True once Firebase has reported the initial sign-in state (or immediately
  // when Firebase is not in use), so the UI can avoid flashing the welcome screen.
  isAuthResolved: false,
};

const useAuthStore = create((set) => ({
  ...initialState,
  setUser: (user) =>
    set(() => ({
      user,
    })),
  logout: async () => {
    set({ ...initialState, isAuthResolved: true });
  },
  setIsLoading: (isLoading) =>
    set(() => ({
      isLoading,
    })),
  setIsAuthObserve: (isAuthObserve) =>
    set(() => ({
      isAuthObserve,
    })),
}));

export default useAuthStore;
