import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Campaign } from "@/types";
import { toast } from "sonner";

const QUERY_KEY = "campaigns";

// ── Fetch campaigns for an organization ──────────────────────
export function useCampaigns(organizationId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });
}

// ── Fetch all campaigns (platform admin) ─────────────────────
export function useAllCampaigns() {
  return useQuery({
    queryKey: [QUERY_KEY, "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, organizations(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

// ── Fetch single campaign with channels + targets ─────────────
export type CampaignDetail = Campaign & {
  campaign_channels: Array<{
    id: string;
    channel: string;
    email_template_id: string | null;
    sms_template_id: string | null;
    voice_template_id: string | null;
    directmail_template_id: string | null;
    is_active: boolean;
  }>;
  campaign_targets: Array<{
    employee_id: string;
    employees: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      department: string | null;
    } | null;
  }>;
};

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, "detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          campaign_channels(*),
          campaign_targets(employee_id, employees(id, first_name, last_name, email, department))
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as CampaignDetail;
    },
  });
}

// ── Fetch campaign event stats ────────────────────────────────
export function useCampaignStats(campaignId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, "stats", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_stats")
        .select("*")
        .eq("campaign_id", campaignId!);
      if (error) throw error;
      return data;
    },
  });
}

// ── Create campaign ──────────────────────────────────────────
export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      organization_id: string;
      name: string;
      description?: string;
      start_date?: string;
      end_date?: string;
      created_by: string;
    }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({ ...payload, status: "draft" })
        .select()
        .single();
      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, c.organization_id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Update campaign ──────────────────────────────────────────
export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, c.organization_id] });
      qc.invalidateQueries({ queryKey: [QUERY_KEY, "detail", c.id] });
      toast.success("Campaign updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Add channels to campaign ─────────────────────────────────
export function useAddCampaignChannels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      campaignId,
      channels,
    }: {
      campaignId: string;
      channels: Array<{
        channel: string;
        email_template_id?: string;
        sms_template_id?: string;
        voice_template_id?: string;
        directmail_template_id?: string;
      }>;
    }) => {
      const rows = channels.map((c) => ({ campaign_id: campaignId, ...c }));
      const { error } = await supabase.from("campaign_channels").upsert(rows, { onConflict: "campaign_id,channel" });
      if (error) throw error;
    },
    onSuccess: (_, { campaignId }) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, "detail", campaignId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Set campaign targets ─────────────────────────────────────
export function useSetCampaignTargets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campaignId, employeeIds }: { campaignId: string; employeeIds: string[] }) => {
      // Delete existing targets first
      await supabase.from("campaign_targets").delete().eq("campaign_id", campaignId);
      if (employeeIds.length === 0) return;
      const rows = employeeIds.map((id) => ({ campaign_id: campaignId, employee_id: id }));
      const { error } = await supabase.from("campaign_targets").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, { campaignId }) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, "detail", campaignId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Launch campaign (status → active) ────────────────────────
export function useLaunchCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase
        .from("campaigns")
        .update({ status: "active" })
        .eq("id", campaignId)
        .select()
        .single();
      if (error) throw error;
      return data as Campaign;
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, c.organization_id] });
      qc.invalidateQueries({ queryKey: [QUERY_KEY, "detail", c.id] });
      toast.success("Campaign launched!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
