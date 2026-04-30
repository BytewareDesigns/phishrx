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

// ── Campaign stats (from campaign_stats view) ─────────────────
export interface CampaignChannelStats {
  campaign_id:          string;
  organization_id:      string;
  campaign_name:        string;
  channel:              "email" | "sms" | "voice" | "direct_mail" | null;
  total_sent:           number;
  total_delivered:      number;
  total_opened:         number;
  total_clicked:        number;
  total_form_submitted: number;
  total_caught:         number;
  catch_rate:           number;
}

export interface CampaignTotals {
  sent:           number;
  delivered:      number;
  opened:         number;
  clicked:        number;
  form_submitted: number;
  caught:         number;
  catch_rate:     number;
}

function aggregateRows(rows: CampaignChannelStats[]): CampaignTotals {
  const t: CampaignTotals = {
    sent: 0, delivered: 0, opened: 0, clicked: 0,
    form_submitted: 0, caught: 0, catch_rate: 0,
  };
  for (const r of rows) {
    t.sent           += r.total_sent           ?? 0;
    t.delivered      += r.total_delivered      ?? 0;
    t.opened         += r.total_opened         ?? 0;
    t.clicked        += r.total_clicked        ?? 0;
    t.form_submitted += r.total_form_submitted ?? 0;
    t.caught         += r.total_caught         ?? 0;
  }
  t.catch_rate = t.sent > 0 ? Math.round((t.caught / t.sent) * 1000) / 10 : 0;
  return t;
}

/** Per-channel stats for a single campaign (one row per channel that had any events) */
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
      return data as CampaignChannelStats[];
    },
  });
}

/** Aggregated totals across all channels for a single campaign */
export function useCampaignTotals(campaignId: string | undefined) {
  const { data, ...rest } = useCampaignStats(campaignId);
  const totals = data ? aggregateRows(data) : null;
  return { ...rest, data: totals };
}

/** Stats for ALL campaigns within an organization, aggregated */
export function useOrgCampaignTotals(organizationId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, "stats", "org", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_stats")
        .select("*")
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return aggregateRows((data ?? []) as CampaignChannelStats[]);
    },
  });
}

// ── Per-target event drill-down ───────────────────────────────
// Returns a map { employeeId → highest-priority event } for one campaign.
// Used by CampaignDetail to show a status column on the targets table.
export type TargetStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "form_submitted"
  | "caught";

const STATUS_PRIORITY: Record<TargetStatus, number> = {
  pending:        0,
  sent:           1,
  delivered:      2,
  opened:         3,
  clicked:        4,
  form_submitted: 5,
  caught:         6,
};

export function useCampaignTargetStatuses(campaignId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, "target-statuses", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_events")
        .select("employee_id, event_type, occurred_at, channel")
        .eq("campaign_id", campaignId!)
        .order("occurred_at", { ascending: true });
      if (error) throw error;

      // Group by employee_id, keep the highest-priority event seen
      const byEmployee = new Map<string, {
        status:      TargetStatus;
        last_event:  string;
      }>();

      for (const row of (data ?? [])) {
        const status = row.event_type as TargetStatus;
        if (!STATUS_PRIORITY[status]) continue;
        const cur = byEmployee.get(row.employee_id);
        if (!cur || STATUS_PRIORITY[status] > STATUS_PRIORITY[cur.status]) {
          byEmployee.set(row.employee_id, {
            status,
            last_event: row.occurred_at,
          });
        }
      }

      return byEmployee;
    },
    refetchInterval: 30_000, // poll every 30s for live campaigns
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

// ── Launch campaign via Edge Function ────────────────────────
// Calls the launch-campaign edge function which:
//   • creates campaign_targets for all active org employees
//   • sets status → active
//   • dispatches sends via SendGrid / Twilio / Retell / Lob
export function useLaunchCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke("launch-campaign", {
        body: { campaign_id: campaignId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message ?? "Launch failed");
      return data as {
        success: boolean;
        campaign: string;
        targets: number;
        sent: { email: number; sms: number; voice: number; direct_mail: number };
        errors: string[];
      };
    },
    onSuccess: (result, campaignId) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [QUERY_KEY, "detail", campaignId] });
      const { sent } = result;
      const total = sent.email + sent.sms + sent.voice + sent.direct_mail;
      toast.success(
        `Campaign launched! ${total.toLocaleString()} message${total !== 1 ? "s" : ""} sent to ${result.targets} employees.`,
      );
      if (result.errors.length > 0) {
        console.warn("Launch warnings:", result.errors);
        toast.warning(`${result.errors.length} delivery error(s) — check console for details.`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
