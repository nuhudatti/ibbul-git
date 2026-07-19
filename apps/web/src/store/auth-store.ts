"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { useIdeStore } from "@/store/ide-store";

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, sessionToken: string) => void;
  logout: () => void;
  updateUser: (patch: Partial<User>) => void;
  clearMustChangePassword: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      sessionToken: null,
      isAuthenticated: false,
      login: (user, sessionToken) => {
        useIdeStore.getState().resetWorkspaceSession();
        set({ user, sessionToken, isAuthenticated: true });
      },
      logout: () => {
        fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(
          () => undefined
        );
        useIdeStore.getState().resetWorkspaceSession();
        set({ user: null, sessionToken: null, isAuthenticated: false });
      },
      updateUser: (patch) =>
        set((state) =>
          state.user ? { user: { ...state.user, ...patch } } : state
        ),
      clearMustChangePassword: () =>
        set((state) =>
          state.user
            ? { user: { ...state.user, mustChangePassword: false } }
            : state
        ),
    }),
    { name: "ula-auth" }
  )
);
