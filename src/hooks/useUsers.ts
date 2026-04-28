import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { UserProfile, UserRole, UserOrganizationAssignment } from "@/types";
import { toast } from "sonner";

const QUERY_KEY = "users";

// ── Fetch all user profiles (admin only) ──────────────────────
export function useUsers() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as UserProfile[];
    },
  });
}

// ── Fetch org assignments for a user ──────────────────────────
export function useUserOrgAssignments(userId?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, "assignments", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_organization_assignments")
        .select("*, organizations(id, name, logo_url)")
        .eq("user_id", userId!)
        .eq("is_active", true)
        .order("assigned_at");
      if (error) throw error;
      return data as Array<UserOrganizationAssignment & { organizations: { id: string; name: string; logo_url: string | null } }>;
    },
  });
}

// ── Update user role ──────────────────────────────────────────
export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { data, error } = await supabase
        .from("user_profiles")
        .update({ role })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Role updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Archive (soft-delete) user ────────────────────────────────
export function useArchiveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_profiles")
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("User archived.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Assign user to organization ───────────────────────────────
export function useAssignUserToOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      organizationId,
      role = "training_admin",
    }: {
      userId: string;
      organizationId: string;
      role?: UserRole;
    }) => {
      const { error } = await supabase
        .from("user_organization_assignments")
        .upsert(
          { user_id: userId, organization_id: organizationId, role, is_active: true },
          { onConflict: "user_id,organization_id" }
        );
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, "assignments", userId] });
      toast.success("User assigned to organization.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Remove user from organization ─────────────────────────────
export function useRemoveUserFromOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, organizationId }: { userId: string; organizationId: string }) => {
      const { error } = await supabase
        .from("user_organization_assignments")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("organization_id", organizationId);
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, "assignments", userId] });
      toast.success("User removed from organization.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Update current user's own profile ────────────────────────
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      first_name,
      last_name,
      phone,
      title,
    }: {
      id: string;
      first_name: string;
      last_name: string;
      phone?: string | null;
      title?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("user_profiles")
        .update({ first_name, last_name, phone, title })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as UserProfile;
    },
    onSuccess: (profile) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      // Also update the cached profile in auth store if needed
      toast.success("Profile updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Change password ───────────────────────────────────────────
// Note: we intentionally do NOT call signInWithPassword to verify the current
// password, because that fires a new SIGNED_IN auth event mid-session which
// can race with the subsequent updateUser call and leave the app stuck on the
// loading spinner. The user is already authenticated; Supabase enforces that.
export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Password changed successfully."),
    onError: (err: Error) => toast.error(err.message),
  });
}
