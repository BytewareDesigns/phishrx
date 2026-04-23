import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Employee } from "@/types";
import { toast } from "sonner";

const QUERY_KEY = "employees";

// ── Fetch employees for an organization ──────────────────────
export function useEmployees(organizationId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("organization_id", organizationId!)
        .eq("is_active", true)
        .order("last_name");
      if (error) throw error;
      return data as Employee[];
    },
  });
}

// ── Fetch single employee ────────────────────────────────────
export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, "single", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Employee;
    },
  });
}

// ── Create employee ──────────────────────────────────────────
type CreateEmployeePayload = {
  organization_id:    string;
  email:              string;
  first_name:         string;
  last_name:          string;
  phone?:             string | null;
  department?:        string | null;
  job_title?:         string | null;
  is_active?:         boolean;
  medcurity_user_id?: string | null;
};

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateEmployeePayload) => {
      const { data, error } = await supabase
        .from("employees")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as Employee;
    },
    onSuccess: (emp) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, emp.organization_id] });
      toast.success(`${emp.first_name} ${emp.last_name} added.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Bulk create employees (CSV import) ───────────────────────
export function useBulkCreateEmployees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      organizationId,
      employees,
    }: {
      organizationId: string;
      employees: Array<{ email: string; first_name: string; last_name: string; department?: string; job_title?: string; phone?: string }>;
    }) => {
      const rows = employees.map((e) => ({ ...e, organization_id: organizationId, is_active: true }));
      const { data, error } = await supabase
        .from("employees")
        .upsert(rows, { onConflict: "organization_id,email", ignoreDuplicates: false })
        .select();
      if (error) throw error;
      return data as Employee[];
    },
    onSuccess: (rows) => {
      if (rows.length > 0) {
        qc.invalidateQueries({ queryKey: [QUERY_KEY, rows[0].organization_id] });
      }
      toast.success(`${rows.length} employee(s) imported.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Update employee ──────────────────────────────────────────
export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Employee> & { id: string; organization_id: string }) => {
      const { data, error } = await supabase
        .from("employees")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Employee;
    },
    onSuccess: (emp) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, emp.organization_id] });
      toast.success("Employee updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Archive (soft-delete) employee ───────────────────────────
export function useArchiveEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, organizationId }: { id: string; organizationId: string }) => {
      const { error } = await supabase
        .from("employees")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
      return organizationId;
    },
    onSuccess: (orgId) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY, orgId] });
      toast.success("Employee removed.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
