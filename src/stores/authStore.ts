import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import type { UserProfile, UserRole } from "@/types";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Practitioner / impersonation view (ephemeral — resets on sign-out)
  viewingAsPractitioner: boolean;
  /** Org the admin is currently impersonating (null = empty preview) */
  impersonatingOrgId:   string | null;
  impersonatingOrgName: string | null;

  // Actions
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setViewingAsPractitioner: (value: boolean) => void;
  /** Enter practitioner view for a specific org (master/global admin only) */
  startImpersonation: (orgId: string, orgName: string) => void;
  /** Exit impersonation and return to admin view */
  exitImpersonation: () => void;
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
  impersonatingOrgId:    null,
  impersonatingOrgName:  null,

  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: (isInitialized) => set({ isInitialized }),

  setViewingAsPractitioner: (value) => {
    const role = get().profile?.role;
    if (role === "master_admin" || role === "global_admin") {
      set({
        viewingAsPractitioner: value,
        // Clear impersonation when toggling off via the avatar menu
        ...(value === false ? { impersonatingOrgId: null, impersonatingOrgName: null } : {}),
      });
    }
  },

  startImpersonation: (orgId, orgName) => {
    const role = get().profile?.role;
    if (role === "master_admin" || role === "global_admin") {
      set({ viewingAsPractitioner: true, impersonatingOrgId: orgId, impersonatingOrgName: orgName });
    }
  },

  exitImpersonation: () => {
    set({ viewingAsPractitioner: false, impersonatingOrgId: null, impersonatingOrgName: null });
  },

  reset: () =>
    set({
      session: null,
      user: null,
      profile: null,
      isLoading: false,
      viewingAsPractitioner: false,
      impersonatingOrgId:    null,
      impersonatingOrgName:  null,
    }),

  isAuthenticated: () => !!get().session,

  // Effective role — 'training_admin' when practitioner/impersonation view is active
  // Both master_admin AND global_admin can impersonate, so both get downgraded.
  getRole: () => {
    const { profile, viewingAsPractitioner } = get();
    if (!profile) return null;
    if (viewingAsPractitioner &&
       (profile.role === "master_admin" || profile.role === "global_admin")) {
      return "training_admin";
    }
    return profile.role;
  },

  // Always reflects the real DB role — used to show/hide the toggle itself
  isMasterAdmin: () => get().profile?.role === "master_admin",
  isGlobalAdmin: () => get().profile?.role === "global_admin",

  isTrainingAdmin: () => {
    const { profile, viewingAsPractitioner } = get();
    if (viewingAsPractitioner &&
       (profile?.role === "master_admin" || profile?.role === "global_admin")) return true;
    return profile?.role === "training_admin";
  },

  isPlatformAdmin: () => {
    const { profile, viewingAsPractitioner } = get();
    // When in practitioner/impersonation view, both admin roles act as training_admin
    if (viewingAsPractitioner &&
       (profile?.role === "master_admin" || profile?.role === "global_admin")) return false;
    return profile?.role === "master_admin" || profile?.role === "global_admin";
  },
}));
