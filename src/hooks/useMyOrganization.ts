import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { Organization } from "@/types";

/**
 * Returns the first active organization for the current training_admin.
 * Platform admins (global/master) get null — they use org selector.
 */
export function useMyOrganization() {
  const { user, isPlatformAdmin } = useAuth();

  return useQuery({
    queryKey: ["my-organization", user?.id],
    enabled: !!user?.id && !isPlatformAdmin(),
    queryFn: async () => {
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
