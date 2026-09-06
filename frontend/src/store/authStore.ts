import { create } from "zustand";
import { api } from "../api/client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  subscriptionStatus: string;
  isPremium: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  fetchMe: async () => {
    try {
      const data = await api<{ user: AuthUser }>("/api/auth/me");
      set({ user: data.user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  logout: async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      set({ user: null });
    }
  },
}));
