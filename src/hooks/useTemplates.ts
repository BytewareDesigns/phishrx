import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { EmailTemplate, SmsTemplate, VoiceTemplate, DirectMailTemplate } from "@/types";
import { toast } from "sonner";

// ── Email Templates ───────────────────────────────────────────
export function useEmailTemplates(organizationId?: string) {
  return useQuery({
    queryKey: ["email-templates", organizationId],
    queryFn: async () => {
      let q = supabase.from("email_templates").select("*").order("name");
      if (organizationId) {
        q = q.or(`organization_id.eq.${organizationId},is_global.eq.true`);
      } else {
        q = q.eq("is_global", true);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<EmailTemplate, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("email_templates").insert(payload).select().single();
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["email-templates", t.organization_id] });
      toast.success("Email template created.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── SMS Templates ─────────────────────────────────────────────
export function useSmsTemplates(organizationId?: string) {
  return useQuery({
    queryKey: ["sms-templates", organizationId],
    queryFn: async () => {
      let q = supabase.from("sms_templates").select("*").order("name");
      if (organizationId) {
        q = q.or(`organization_id.eq.${organizationId},is_global.eq.true`);
      } else {
        q = q.eq("is_global", true);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as SmsTemplate[];
    },
  });
}

export function useCreateSmsTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<SmsTemplate, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("sms_templates").insert(payload).select().single();
      if (error) throw error;
      return data as SmsTemplate;
    },
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["sms-templates", t.organization_id] });
      toast.success("SMS template created.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Voice Templates ───────────────────────────────────────────
export function useVoiceTemplates(organizationId?: string) {
  return useQuery({
    queryKey: ["voice-templates", organizationId],
    queryFn: async () => {
      let q = supabase.from("voice_templates").select("*").order("name");
      if (organizationId) {
        q = q.or(`organization_id.eq.${organizationId},is_global.eq.true`);
      } else {
        q = q.eq("is_global", true);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as VoiceTemplate[];
    },
  });
}

export function useCreateVoiceTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<VoiceTemplate, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("voice_templates").insert(payload).select().single();
      if (error) throw error;
      return data as VoiceTemplate;
    },
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["voice-templates", t.organization_id] });
      qc.invalidateQueries({ queryKey: ["voice-templates", undefined] });
      toast.success("Voice template created.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Direct Mail Templates ─────────────────────────────────────
export function useDirectMailTemplates(organizationId?: string) {
  return useQuery({
    queryKey: ["directmail-templates", organizationId],
    queryFn: async () => {
      let q = supabase.from("direct_mail_templates").select("*").order("name");
      if (organizationId) {
        q = q.or(`organization_id.eq.${organizationId},is_global.eq.true`);
      } else {
        q = q.eq("is_global", true);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as DirectMailTemplate[];
    },
  });
}

export function useCreateDirectMailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<DirectMailTemplate, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("direct_mail_templates").insert(payload).select().single();
      if (error) throw error;
      return data as DirectMailTemplate;
    },
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["directmail-templates", t.organization_id] });
      qc.invalidateQueries({ queryKey: ["directmail-templates", undefined] });
      toast.success("Direct mail template created.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Hook that returns all template types for a given org ──────
export function useOrgTemplates(organizationId?: string) {
  const email      = useEmailTemplates(organizationId);
  const sms        = useSmsTemplates(organizationId);
  const voice      = useVoiceTemplates(organizationId);
  const directMail = useDirectMailTemplates(organizationId);

  return {
    email,
    sms,
    voice,
    directMail,
    isLoading: email.isLoading || sms.isLoading || voice.isLoading || directMail.isLoading,
  };
}
