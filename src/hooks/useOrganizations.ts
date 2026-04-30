import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Organization, CampaignPackage } from "@/types";
import { toast } from "sonner";

const QUERY_KEY    = "organizations";
const PACKAGES_KEY = "campaign-packages";

// ── Fetch all organizations ───────────────────────────────────
export function useOrganizations() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Organization[];
    },
  });
}

// ── Fetch single organization ────────────────────────────────
export function useOrganization(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Organization;
    },
  });
}

// ── Create organization ──────────────────────────────────────
// Also auto-provisions a default email-only campaign_package so the org can
// launch its first campaign immediately without waiting on the Medcurity
// billing system to push a real subscription. Master/global admins can
// expand the package (seats, channels, dates) later from the org's
// Subscription tab.
const DEFAULT_PACKAGE = {
  total_seats:      100,
  used_seats:       0,
  channels_enabled: ["email"] as const,
  durationMonths:   12,
};

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; external_company_id?: string; logo_url?: string }) => {
      const { data: org, error } = await supabase
        .from("organizations")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      // Provision a default subscription package — best-effort, don't fail
      // org creation if this errors (admin can add manually).
      const start = new Date();
      const end   = new Date(start);
      end.setMonth(end.getMonth() + DEFAULT_PACKAGE.durationMonths);

      const { error: pkgError } = await supabase
        .from("campaign_packages")
        .insert({
          organization_id:          org.id,
          external_subscription_id: `phishrx-default-${org.id}`,
          channels_enabled:         DEFAULT_PACKAGE.channels_enabled,
          total_seats:              DEFAULT_PACKAGE.total_seats,
          used_seats:               DEFAULT_PACKAGE.used_seats,
          start_date:               start.toISOString(),
          end_date:                 end.toISOString(),
          is_active:                true,
        });

      if (pkgError) {
        console.warn("Default package provisioning failed:", pkgError.message);
      }

      return org as Organization;
    },
    onSuccess: (org) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [PACKAGES_KEY, org.id] });
      toast.success("Organization created with default email subscription.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Update organization ──────────────────────────────────────
export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Organization> & { id: string }) => {
      const { data, error } = await supabase
        .from("organizations")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Organization;
    },
    onSuccess: (org) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.setQueryData([QUERY_KEY, org.id], org);
      toast.success("Organization updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Archive / deactivate organization ────────────────────────
export function useArchiveOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("organizations")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Organization deactivated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Campaign Packages (subscription) ──────────────────────────
export function useCampaignPackages(organizationId?: string) {
  return useQuery({
    queryKey: [PACKAGES_KEY, organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_packages")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CampaignPackage[];
    },
  });
}
