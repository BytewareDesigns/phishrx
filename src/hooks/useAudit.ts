import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

// ============================================================
// Audit logging
//
// Best-effort writes to the `audit_log` table from the client. We
// don't await these in the calling mutation (fire-and-forget) so a
// failure in audit logging never blocks a successful user action.
//
// If you need stricter guarantees, wrap the audit row in the same
// transaction by inserting from an Edge Function instead.
// ============================================================

export type AuditAction =
  | "org.create"      | "org.update"     | "org.deactivate"
  | "user.invite"     | "user.assign"    | "user.remove"     | "user.update_role"  | "user.archive"
  | "campaign.create" | "campaign.update"| "campaign.launch" | "campaign.pause"   | "campaign.resume" | "campaign.cancel" | "campaign.archive"
  | "template.create" | "template.update"| "template.delete"
  | "employee.create" | "employee.update"| "employee.archive";

export type AuditResource =
  | "organization" | "user" | "campaign" | "template" | "employee";

export interface AuditPayload {
  action:        AuditAction;
  resource_type: AuditResource;
  resource_id?:  string;
  // Loose JSON-able shapes so callers can pass DB rows directly without
  // having to add an index signature to every domain interface.
  old_data?:     unknown;
  new_data?:     unknown;
}

/**
 * Fire-and-forget audit log write.
 *
 * Usage from a mutation's onSuccess:
 *   onSuccess: (org) => {
 *     audit({ action: "org.create", resource_type: "organization", resource_id: org.id, new_data: org });
 *   }
 *
 * Errors are swallowed (logged to console only) — never block UX.
 */
export async function audit(payload: AuditPayload): Promise<void> {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;

  const { error } = await supabase.from("audit_log").insert({
    actor_id:      userId,
    action:        payload.action,
    resource_type: payload.resource_type,
    resource_id:   payload.resource_id ?? null,
    old_data:      payload.old_data ?? null,
    new_data:      payload.new_data ?? null,
  });

  if (error) {
    console.warn("[audit] write failed:", error.message);
  }
}

// ── Audit log viewer query ────────────────────────────────────
export interface AuditLogRow {
  id:            string;
  actor_id:      string | null;
  action:        string;
  resource_type: string;
  resource_id:   string | null;
  old_data:      unknown;
  new_data:      unknown;
  ip_address:    string | null;
  created_at:    string;
  // Joined actor profile
  actor: {
    id:         string;
    email:      string;
    first_name: string | null;
    last_name:  string | null;
    role:       string;
  } | null;
}

export interface AuditFilters {
  actorId?:      string;
  action?:       string;
  resourceType?: string;
  resourceId?:   string;
  limit?:        number;
}

export function useAuditLog(filters: AuditFilters = {}) {
  return useQuery({
    queryKey: ["audit-log", filters],
    queryFn: async () => {
      let q = supabase
        .from("audit_log")
        .select(`
          id, actor_id, action, resource_type, resource_id,
          old_data, new_data, ip_address, created_at,
          actor:user_profiles!audit_log_actor_id_fkey (
            id, email, first_name, last_name, role
          )
        `)
        .order("created_at", { ascending: false })
        .limit(filters.limit ?? 200);

      if (filters.actorId)      q = q.eq("actor_id",      filters.actorId);
      if (filters.action)       q = q.eq("action",        filters.action);
      if (filters.resourceType) q = q.eq("resource_type", filters.resourceType);
      if (filters.resourceId)   q = q.eq("resource_id",   filters.resourceId);

      const { data, error } = await q;
      if (error) throw error;

      // Normalize Supabase's array-or-object FK relation
      const rows = (data ?? []).map((r: any) => {
        const a = r.actor;
        return { ...r, actor: Array.isArray(a) ? a[0] ?? null : a ?? null };
      });
      return rows as AuditLogRow[];
    },
  });
}
