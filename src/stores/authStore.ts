import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import type { UserProfile, UserRole } from "@/types";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Master-admin practitioner view toggle (ephemeral — resets on sign-out)
  viewingAsPractitioner: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setViewingAsPractitioner: (value: boolean) => void;
  reset: () => void;

  // Computed helpers
  isAuthenticated: () => boolean;
  /** Effective role — returns 'training_admin' when viewingAsPractitioner is active */
  getRole: () => UserRole | null;
  /** Always checks the real DB role regardless of view mode */
  isMasterAdmin: () => boolean;
  isGlobalAdmin: () => boolean;
  /** True when effective role is training_admin (including practitioner view) */
  isTrainingAdmin: () => boolean;
  /** True when effective role is master_admin or global_admin */
  isPlatformAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,
  viewingAsPractitioner: false,

  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  setViewingAsPractitioner: (value) => {
    // Only master_admin may toggle practitioner view
    if (get().profile?.role === "master_admin") {
      set({ viewingAsPractitioner: value });
    }
  },

  reset: () =>
    set({
      session: null,
      user: null,
      profile: null,
      isLoading: false,
      viewingAsPractitioner: false,
    }),

  isAuthenticated: () => !!get().session,

  // Effective role — 'training_admin' when practitioner view is active
  getRole: () => {
    const { profile, viewingAsPractitioner } = get();
    if (!profile) return null;
    if (viewingAsPractitioner && profile.role === "master_admin") return "training_admin";
    return profile.role;
  },

  // Always reflects the real DB role — used to show/hide the toggle itself
  isMasterAdmin: () => get().profile?.role === "master_admin",
  isGlobalAdmin: () => get().profile?.role === "global_admin",

  isTrainingAdmin: () => {
    const { profile, viewingAsPractitioner } = get();
    if (viewingAsPractitioner && profile?.role === "master_admin") return true;
    return profile?.role === "training_admin";
  },

  isPlatformAdmin: () => {
    const { profile, viewingAsPractitioner } = get();
    if (viewingAsPractitioner && profile?.role === "master_admin") return false;
    return profile?.role === "master_admin" || profile?.role === "global_admin";
  },
}));
