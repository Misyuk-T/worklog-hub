import { create } from "zustand";

const initialState = {
  user: null,
  isLoading: false,
  isAuthObserve: false,
};

const useAuthStore = create((set) => ({
  ...initialState,
  setUser: (user) =>
    set(() => ({
      user,
    })),
  logout: async () => {
    set(initialState);
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
