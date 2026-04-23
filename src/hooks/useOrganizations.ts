import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Organization } from "@/types";
import { toast } from "sonner";

const QUERY_KEY = "organizations";

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
export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; external_company_id?: string; logo_url?: string }) => {
      const { data, error } = await supabase
        .from("organizations")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as Organization;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Organization created.");
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
