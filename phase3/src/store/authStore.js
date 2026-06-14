import { create } from "zustand";

const savedToken = localStorage.getItem("access_token") || "";
const savedRefreshToken = localStorage.getItem("refresh_token") || "";

const useAuthStore = create((set) => ({
  accessToken: savedToken,
  refreshToken: savedRefreshToken,
  user: null,
  role: "",
  isAuthenticated: !!savedToken,
  isAuthChecked: !savedToken,

  setSession: ({ accessToken, refreshToken, user, role }) => {
    if (accessToken) localStorage.setItem("access_token", accessToken);
    if (refreshToken) localStorage.setItem("refresh_token", refreshToken);

    set({
      accessToken: accessToken || "",
      refreshToken: refreshToken || "",
      user: user || null,
      role: role || "",
      isAuthenticated: !!accessToken,
      isAuthChecked: true,
    });
  },

  clearSession: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    set({
      accessToken: "",
      refreshToken: "",
      user: null,
      role: "",
      isAuthenticated: false,
      isAuthChecked: true,
    });
  },

  setUserProfile: ({ user, role }) => {
    set({
      user: user || null,
      role: role || "",
      isAuthenticated: true,
      isAuthChecked: true,
    });
  },

  setAuthChecked: (value) => {
    set({ isAuthChecked: value });
  },
}));

export default useAuthStore;
