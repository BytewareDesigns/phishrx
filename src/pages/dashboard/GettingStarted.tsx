import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Building2, Users, FileCode, Send, Activity,
  ArrowRight, CheckCircle2, ExternalLink, Loader2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingStepper, STEPS } from "@/components/onboarding/OnboardingStepper";
import { useMyOrganization } from "@/hooks/useMyOrganization";
import {
  useOnboardingStatus, useCompleteOnboarding,
  type OnboardingStepId,
} from "@/hooks/useOnboarding";

// ============================================================
// Getting Started — 5-step guided onboarding for new training admins.
//
// Each step embeds (or links to) the existing CRUD surfaces. We don't
// rebuild Employees/Templates/Campaigns — we channel users into them
// in a forced order and bring them back when the step's gate clears.
//
// State is derived from the database, not in-memory. Closing the tab
// and coming back tomorrow resumes the user on the same step.
// ============================================================

export default function GettingStarted() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: org, isLoading: orgLoading } = useMyOrganization();
  const { status, isLoading } = useOnboardingStatus(org?.id);
  const completeOnboarding = useCompleteOnboarding();

  // Allow query param to override the auto-resume position
  const forcedStep = searchParams.get("step") as OnboardingStepId | null;
  const [activeStep, setActiveStep] = useState<OnboardingStepId | null>(null);

  // When status loads, sync activeStep to the current resume point unless
  // user has manually navigated.
  useEffect(() => {
    if (!status || activeStep) return;
    setActiveStep(forcedStep ?? status.currentStep);
  }, [status, activeStep, forcedStep]);

  // If onboarding is already complete and there's no explicit step in URL,
  // redirect to dashboard.
  useEffect(() => {
    if (status?.isComplete && !forcedStep) {
      navigate("/dashboard", { replace: true });
    }
  }, [status?.isComplete, forcedStep, navigate]);

  if (orgLoading || isLoading || !status || !org) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const completedSteps: OnboardingStepId[] = [];
  if (status.hasCompanyConfirmed) completedSteps.push("company");
  if (status.hasEmployees)        completedSteps.push("employees");
  if (status.hasTemplates)        completedSteps.push("templates");
  if (status.hasLaunchedCampaign) completedSteps.push("campaign");
  if (status.hasViewedResults)    completedSteps.push("results");

  const handleStepClick = (id: OnboardingStepId) => {
    // Allow navigation to any completed step or the current step
    if (completedSteps.includes(id) || id === status.currentStep) {
      setActiveStep(id);
    }
  };

  const handleFinish = async () => {
    if (!org.id) return;
    await completeOnboarding.mutateAsync(org.id);
    navigate("/dashboard");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold">Welcome to PhishRx</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Five quick steps to launch your first phishing simulation for{" "}
            <span className="font-medium text-foreground">{org.name}</span>.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
          Skip for now <ExternalLink className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>

      {/* Stepper */}
      <Card>
        <CardContent className="py-5">
          <OnboardingStepper
            currentStep={activeStep ?? status.currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
          />
        </CardContent>
      </Card>

      {/* Active step body */}
      {activeStep === "company"   && <CompanyStep   org={org} onNext={() => setActiveStep("employees")} />}
      {activeStep === "employees" && (
        <EmployeesStep
          orgId={org.id}
          orgName={org.name}
          count={status.employeeCount}
          onNext={() => setActiveStep("templates")}
        />
      )}
      {activeStep === "templates" && (
        <TemplatesStep
          count={status.templateCount}
          onNext={() => setActiveStep("campaign")}
        />
      )}
      {activeStep === "campaign"  && (
        <CampaignStep
          hasLaunched={status.hasLaunchedCampaign}
          latestId={status.latestLaunchedCampaignId}
          onNext={() => setActiveStep("results")}
        />
      )}
      {activeStep === "results"   && (
        <ResultsStep
          campaignId={status.latestLaunchedCampaignId}
          onFinish={handleFinish}
          isFinishing={completeOnboarding.isPending}
        />
      )}
    </div>
  );
}

// ── Step 1: Company ──────────────────────────────────────────
function CompanyStep({
  org, onNext,
}: { org: { id: string; name: string; external_company_id: string | null }; onNext: () => void }) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Confirm Company Information</CardTitle>
        </div>
        <CardDescription>
          We've imported your company info from Medcurity. Confirm everything looks right
          before we send simulations on your behalf.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
          <Row label="Organization">{org.name}</Row>
          {org.external_company_id && (
            <Row label="Medcurity ID">
              <code className="text-xs bg-background px-1.5 py-0.5 rounded border">
                {org.external_company_id}
              </code>
            </Row>
          )}
          <Row label="Status">
            <Badge variant="success" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          </Row>
        </div>

        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-900">
          <p>
            Need to update logo, contact info, or display name? Use the Settings tab on
            your organization page anytime.
          </p>
        </div>

        <div className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard/settings")}
          >
            Edit Settings
          </Button>
          <Button onClick={onNext} className="ml-auto">
            Looks good — next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Step 2: Employees ────────────────────────────────────────
function EmployeesStep({
  orgId: _orgId, orgName, count, onNext,
}: { orgId: string; orgName: string; count: number; onNext: () => void }) {
  const navigate = useNavigate();
  const ready = count > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Add Employees</CardTitle>
        </div>
        <CardDescription>
          These are the people who'll receive your simulated phishing messages.
          Add at least one to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">
              {count === 0
                ? "No employees yet"
                : count === 1
                  ? "1 employee added"
                  : `${count} employees added`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {orgName} · Active employees only
            </p>
          </div>
          <Button onClick={() => navigate("/dashboard/employees")}>
            <Users className="h-4 w-4 mr-1" />
            {count === 0 ? "Add Employees" : "Manage Employees"}
          </Button>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 space-y-1">
          <p className="font-medium">Two ways to add employees:</p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-800/90">
            <li>Upload a CSV (fastest for &gt;10 people)</li>
            <li>Add manually one at a time</li>
          </ul>
          <p className="text-amber-800/80 pt-1">
            Required: first name, last name, email. Phone is needed for SMS/voice channels.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={onNext} disabled={!ready}>
            {ready ? <>Next <ArrowRight className="h-4 w-4 ml-1" /></> : "Add at least one employee"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Step 3: Templates ────────────────────────────────────────
function TemplatesStep({ count, onNext }: { count: number; onNext: () => void }) {
  const navigate = useNavigate();
  const ready = count > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileCode className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Choose Templates</CardTitle>
        </div>
        <CardDescription>
          These are the phishing messages your employees will receive. PhishRx ships
          with vetted global templates — you can use them as-is or build your own.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">
              {count === 0
                ? "No templates available"
                : `${count} template${count !== 1 ? "s" : ""} ready to use`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Includes global templates from PhishRx + any custom templates you've created
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard/templates")}>
            Browse Templates
          </Button>
        </div>

        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-900">
          <p>
            <span className="font-medium">Tip:</span> Start with a global template for
            your first campaign. You'll get a feel for what kind of phishing your
            employees actually click on, then build custom templates targeting those
            patterns.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={onNext} disabled={!ready}>
            {ready ? <>Next <ArrowRight className="h-4 w-4 ml-1" /></> : "Browse to continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Step 4: Campaign ─────────────────────────────────────────
function CampaignStep({
  hasLaunched, latestId, onNext,
}: { hasLaunched: boolean; latestId: string | null; onNext: () => void }) {
  const navigate = useNavigate();

  if (hasLaunched && latestId) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-lg">Campaign Launched</CardTitle>
          </div>
          <CardDescription>
            Your first campaign is out. Let's check on results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-900">
              Messages are being delivered. Engagement events will start appearing
              in real time as employees interact with them.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={onNext}>
              View Live Results <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Launch Your First Campaign</CardTitle>
        </div>
        <CardDescription>
          A campaign sends your selected templates to your selected employees over a
          chosen time window. The 6-step wizard walks you through every choice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-900 space-y-1">
          <p className="font-medium">What happens when you launch:</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-800/90">
            <li>Messages dispatch via SendGrid / Twilio / Retell / Lob</li>
            <li>Each click, open, or call response is tracked in real time</li>
            <li>You'll see who fell for it and who didn't</li>
            <li>You can pause or cancel anytime from the campaign page</li>
          </ul>
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={() => navigate("/dashboard/campaigns/new?onboarding=1")}>
            Start Campaign Wizard <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Step 5: Results ──────────────────────────────────────────
function ResultsStep({
  campaignId, onFinish, isFinishing,
}: { campaignId: string | null; onFinish: () => void; isFinishing: boolean }) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Watch Live Results</CardTitle>
        </div>
        <CardDescription>
          Open your campaign page to see the engagement funnel update in real time
          as employees receive, open, and click your simulation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 text-xs text-emerald-900">
          <p className="font-medium">You're all set!</p>
          <p className="text-emerald-800/90 mt-0.5">
            From here on out, the dashboard is your home. Launch new campaigns from
            the Campaigns page anytime.
          </p>
        </div>

        <div className="flex justify-between gap-2 flex-wrap">
          {campaignId && (
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/campaigns/${campaignId}`)}
            >
              <Activity className="h-4 w-4 mr-1" /> View Campaign
            </Button>
          )}
          <Button onClick={onFinish} disabled={isFinishing} className="ml-auto">
            {isFinishing
              ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Finishing…</>
              : <>Finish Setup <CheckCircle2 className="h-4 w-4 ml-1" /></>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Mini layout helper ───────────────────────────────────────
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

// Used by STEPS export indirectly — keeps the imports useful elsewhere
export const ONBOARDING_STEPS = STEPS;
