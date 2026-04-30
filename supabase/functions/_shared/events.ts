// supabase/functions/_shared/events.ts
// Shared helpers for inserting campaign_events from provider webhooks.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Channel = "email" | "sms" | "voice" | "direct_mail";
export type EventType =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "form_submitted"
  | "call_answered"
  | "call_completed"
  | "qr_scanned"
  | "caught";

/** Build a service-role admin client for webhook handlers (no user auth). */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * Look up a campaign_target row by ID and return campaign_id + employee_id.
 * Returns null if the target doesn't exist (silent-drop unknown tracking IDs).
 */
export async function lookupTarget(
  admin: SupabaseClient,
  targetId: string,
): Promise<{ campaign_id: string; employee_id: string } | null> {
  const { data } = await admin
    .from("campaign_targets")
    .select("campaign_id, employee_id")
    .eq("id", targetId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Insert a single campaign_event. Uses service role, so RLS is bypassed.
 * Webhook handlers fan out to this for every provider event they receive.
 */
export async function insertEvent(
  admin: SupabaseClient,
  args: {
    campaign_id:  string;
    employee_id:  string;
    channel:      Channel;
    event_type:   EventType;
    metadata?:    Record<string, unknown>;
    occurred_at?: string;
  },
): Promise<void> {
  const { error } = await admin.from("campaign_events").insert({
    campaign_id:  args.campaign_id,
    employee_id:  args.employee_id,
    channel:      args.channel,
    event_type:   args.event_type,
    metadata:     args.metadata ?? null,
    occurred_at:  args.occurred_at ?? new Date().toISOString(),
  });
  if (error) {
    console.error(
      `[events] insert failed for ${args.channel}/${args.event_type}:`,
      error.message,
    );
  }
}

/**
 * Look up the most recent campaign_target for a (campaign, employee) pair.
 * Used by webhook handlers that don't carry the target_id directly (Twilio
 * MessageSid, Lob letter ID) — we map provider ID → target via a second
 * lookup table, but for now we use phone/email + active campaign matching.
 */
export async function findTargetByEmployeeContact(
  admin: SupabaseClient,
  contact: { email?: string; phone?: string; campaign_id?: string },
): Promise<{ campaign_id: string; employee_id: string } | null> {
  if (!contact.email && !contact.phone) return null;

  // Find the employee
  const empQuery = admin.from("employees").select("id, organization_id");
  const { data: emp } = contact.email
    ? await empQuery.eq("email", contact.email).maybeSingle()
    : await empQuery.eq("phone", contact.phone!).maybeSingle();

  if (!emp) return null;

  // Find the most recent active campaign_target for this employee.
  // If campaign_id is provided, scope to that.
  let q = admin
    .from("campaign_targets")
    .select("campaign_id, employee_id, added_at")
    .eq("employee_id", emp.id)
    .order("added_at", { ascending: false })
    .limit(1);

  if (contact.campaign_id) {
    q = q.eq("campaign_id", contact.campaign_id);
  }

  const { data: target } = await q.maybeSingle();
  return target ?? null;
}
