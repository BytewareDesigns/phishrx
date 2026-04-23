import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import type { UserProfile, UserRole } from "@/types";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;

  // Computed helpers
  isAuthenticated: () => boolean;
  getRole: () => UserRole | null;
  isMasterAdmin: () => boolean;
  isGlobalAdmin: () => boolean;
  isTrainingAdmin: () => boolean;
  isPlatformAdmin: () => boolean; // master_admin or global_admin
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),

  reset: () =>
    set({
      session: null,
      user: null,
      profile: null,
      isLoading: false,
    }),

  isAuthenticated: () => !!get().session,
  getRole: () => get().profile?.role ?? null,
  isMasterAdmin: () => get().profile?.role === "master_admin",
  isGlobalAdmin: () => get().profile?.role === "global_admin",
  isTrainingAdmin: () => get().profile?.role === "training_admin",
  isPlatformAdmin: () => {
    const role = get().profile?.role;
    return role === "master_admin" || role === "global_admin";
  },
}));
