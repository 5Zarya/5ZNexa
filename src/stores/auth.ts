// src/stores/auth.ts
import api from "../services/api";
import { create } from "zustand";
import type { User } from "../types";

type AuthState = {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  setUser: (user: User | null | ((prev: User | null) => User | null)) => void;
  setAccessToken: (token: string | null) => void;

  // 🔥 TAMBAH INI
  updateAvatar: (avatarUrl: string) => void;

  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    const saved = localStorage.getItem("user");
    return saved ? (JSON.parse(saved) as User) : null;
  })(),

  accessToken: localStorage.getItem("access_token"),
  isAuthenticated: !!localStorage.getItem("access_token"),

  setUser: (user) =>
    set((state) => {
      let newUser: User | null;

      if (typeof user === "function") {
        const updater = user as (prev: User | null) => User | null;
        newUser = updater(state.user);
      } else {
        newUser = user;
      }

      if (newUser) {
        localStorage.setItem("user", JSON.stringify(newUser));
      } else {
        localStorage.removeItem("user");
      }

      return {
        user: newUser,
        isAuthenticated: !!state.accessToken,
      };
    }),

  setAccessToken: (token) => {
    if (token) {
      localStorage.setItem("access_token", token);
    } else {
      localStorage.removeItem("access_token");
    }

    set({
      accessToken: token,
      isAuthenticated: !!token,
    });
  },

  // 🔥 NEW METHOD
  updateAvatar: (avatarUrl: string) =>
    set((state) => {
      if (!state.user) return state;

      const updatedUser = {
        ...state.user,
        avatarUrl,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));

      return {
        user: updatedUser,
      };
    }),

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {}

    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });

    window.location.href = "/login";
  },
}));