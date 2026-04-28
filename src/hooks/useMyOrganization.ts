import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Organization } from "@/types";

/**
 * Returns the active organization for the current user context:
 *
 * - Platform admin impersonating an org  → fetches that specific org by ID
 * - Training admin (normal mode)         → fetches their first assigned org
 * - Platform admin NOT impersonating     → returns null (they use org selector)
 */
export function useMyOrganization() {
  const { user, isPlatformAdmin, impersonatingOrgId } = useAuth();

  const isImpersonating = !!impersonatingOrgId;

  return useQuery({
    queryKey: ["my-organization", user?.id, impersonatingOrgId],
    enabled: !!user?.id && (isImpersonating || !isPlatformAdmin()),
    queryFn: async () => {
      if (isImpersonating) {
        // Admin is impersonating a specific org — fetch it directly.
        // Platform admins have RLS access to all orgs, so this works.
        const { data, error } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", impersonatingOrgId!)
          .single();
        if (error) throw error;
        return data as Organization;
      }

      // Normal training admin path — first active org assignment
      const { data, error } = await supabase
        .from("user_organization_assignments")
        .select("organization_id, organizations(*)")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("assigned_at")
        .limit(1)
        .single();
      if (error) throw error;
      return data.organizations as unknown as Organization;
    },
  });
}
