import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useEmployees } from "@/hooks/useEmployees";
import { useCampaigns } from "@/hooks/useCampaigns";
import {
  useEmailTemplates, useSmsTemplates, useVoiceTemplates, useDirectMailTemplates,
} from "@/hooks/useTemplates";
import { useOrganization } from "@/hooks/useOrganizations";
import { audit } from "@/hooks/useAudit";
import { toast } from "sonner";

// ============================================================
// Onboarding status
//
// Computes what's done vs. pending for a given org, derived from
// the actual data state (employees / templates / campaigns) plus
// the explicit `organizations.onboarding_completed_at` flag.
//
// Used by:
//   * /dashboard auto-redirect logic (incomplete → Getting Started)
//   * /dashboard/getting-started page (visual stepper + per-step gate)
//   * Pre-flight check on /dashboard/campaigns/new
// ============================================================

export type OnboardingStepId =
  | "company"
  | "employees"
  | "templates"
  | "campaign"
  | "results";

export interface OnboardingStatus {
  hasCompanyConfirmed:  boolean;  // Always true once they're past auth (org row exists)
  hasEmployees:         boolean;  // ≥ 1 active employee
  hasTemplates:         boolean;  // ≥ 1 template available (org-specific OR global)
  hasLaunchedCampaign:  boolean;  // ≥ 1 campaign in active/completed/paused/archived/cancelled
  hasViewedResults:     boolean;  // organizations.onboarding_completed_at is set
  /** Convenience — true once all gates clear */
  isComplete:           boolean;
  /** The next step the user should land on */
  currentStep:          OnboardingStepId;
  /** Total active employee count for display */
  employeeCount:        number;
  /** Total templates available for display */
  templateCount:        number;
  /** Latest launched campaign id, if any (used for the "View results" CTA) */
  latestLaunchedCampaignId: string | null;
}

export function useOnboardingStatus(organizationId: string | undefined): {
  status: OnboardingStatus | null;
  isLoading: boolean;
} {
  const { data: org,         isLoading: orgLoading }    = useOrganization(organizationId);
  const { data: employees,   isLoading: empLoading }    = useEmployees(organizationId);
  const { data: campaigns,   isLoading: campLoading }   = useCampaigns(organizationId);
  const { data: emailTpl,    isLoading: emailLoading }  = useEmailTemplates(organizationId);
  const { data: smsTpl,      isLoading: smsLoading }    = useSmsTemplates(organizationId);
  const { data: voiceTpl,    isLoading: voiceLoading }  = useVoiceTemplates(organizationId);
  const { data: dmTpl,       isLoading: dmLoading }     = useDirectMailTemplates(organizationId);

  const isLoading =
    orgLoading || empLoading || campLoading ||
    emailLoading || smsLoading || voiceLoading || dmLoading;

  const status = useMemo<OnboardingStatus | null>(() => {
    if (!org) return null;

    const employeeCount = (employees ?? []).filter((e) => e.is_active).length;
    const templateCount =
      (emailTpl ?? []).length +
      (smsTpl   ?? []).length +
      (voiceTpl ?? []).length +
      (dmTpl    ?? []).length;

    const launchedCampaigns = (campaigns ?? []).filter(
      (c) => c.status !== "draft",
    );
    const latestLaunched = launchedCampaigns.sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    )[0];

    const hasCompanyConfirmed = !!org;
    const hasEmployees        = employeeCount > 0;
    const hasTemplates        = templateCount > 0;
    const hasLaunchedCampaign = launchedCampaigns.length > 0;
    const hasViewedResults    = !!org.onboarding_completed_at;
    const isComplete          = hasViewedResults;

    // Determine where the user should resume
    let currentStep: OnboardingStepId = "company";
    if (!hasEmployees)              currentStep = "employees";
    else if (!hasTemplates)         currentStep = "templates";
    else if (!hasLaunchedCampaign)  currentStep = "campaign";
    else if (!hasViewedResults)     currentStep = "results";
    else                            currentStep = "results";  // already done, stays final

    return {
      hasCompanyConfirmed,
      hasEmployees,
      hasTemplates,
      hasLaunchedCampaign,
      hasViewedResults,
      isComplete,
      currentStep,
      employeeCount,
      templateCount,
      latestLaunchedCampaignId: latestLaunched?.id ?? null,
    };
  }, [org, employees, campaigns, emailTpl, smsTpl, voiceTpl, dmTpl]);

  return { status, isLoading };
}

// ── Stamp completion ─────────────────────────────────────────
// Called once when the user reaches the final step of Getting Started.
// We use a dedicated mutation so it can be invalidated cleanly and
// we can audit-log the milestone.
export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { data, error } = await supabase
        .from("organizations")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", organizationId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (org) => {
      qc.invalidateQueries({ queryKey: ["organizations"] });
      qc.invalidateQueries({ queryKey: ["organizations", org.id] });
      audit({
        action: "org.update", resource_type: "organization", resource_id: org.id,
        new_data: { onboarding_completed_at: org.onboarding_completed_at },
      });
      toast.success("All set up — welcome to PhishRx!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
