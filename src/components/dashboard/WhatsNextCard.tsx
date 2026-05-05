import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, AlertTriangle, TrendingUp, Send, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Campaign } from "@/types";
import type { CampaignTotals } from "@/hooks/useCampaigns";

// ============================================================
// WhatsNextCard — small contextual nudge on the dashboard.
//
// Looks at the org's current state and suggests the single most
// useful next action. Modeled on the wizard's "the wizard tells a
// story" — the story for repeat users is "what should I do today?"
//
// Priority order (first match wins):
//   1. There's an active campaign with high catch rate → assign training
//   2. No campaign launched in the last 30 days → run a refresher
//   3. Recent campaign just completed → review results
//   4. Default: try a different channel
// ============================================================

interface Props {
  campaigns: Campaign[];
  totals:    CampaignTotals | null;
  employeeCount: number;
}

export function WhatsNextCard({ campaigns, totals, employeeCount }: Props) {
  const navigate = useNavigate();
  const nudge = pickNudge(campaigns, totals, employeeCount);

  if (!nudge) return null;

  const Icon = nudge.icon;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-4 flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-primary/70" />
            <p className="text-xs font-medium text-primary uppercase tracking-wide">
              What's next
            </p>
          </div>
          <p className="text-sm font-medium">{nudge.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{nudge.body}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => navigate(nudge.cta.href)}
        >
          {nudge.cta.label} <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

interface Nudge {
  title: string;
  body:  string;
  icon:  React.ElementType;
  cta:   { label: string; href: string };
}

function pickNudge(
  campaigns: Campaign[],
  totals:    CampaignTotals | null,
  employeeCount: number,
): Nudge | null {
  // 1. High catch rate — assign training in Medcurity LMS
  if (totals && totals.sent >= 5 && totals.catch_rate >= 30) {
    return {
      title: `Catch rate is high (${totals.catch_rate.toFixed(0)}%)`,
      body:  "Consider following up with phishing-awareness training in Medcurity LMS for employees who got caught.",
      icon:  AlertTriangle,
      cta:   { label: "View results", href: "/dashboard/reports" },
    };
  }

  // 2. No campaign in last 30 days — run a refresher
  const launched = campaigns.filter((c) => c.status !== "draft");
  const mostRecent = launched.sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  )[0];
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  if (!mostRecent || +new Date(mostRecent.created_at) < thirtyDaysAgo) {
    if (employeeCount > 0) {
      return {
        title: mostRecent
          ? "It's been a while since your last campaign"
          : "Ready to run your first refresher",
        body: "Regular phishing simulations build resilience over time. A monthly cadence is the sweet spot.",
        icon: Send,
        cta:  { label: "New campaign", href: "/dashboard/campaigns/new" },
      };
    }
  }

  // 3. Recent campaign just completed — review
  if (mostRecent && mostRecent.status === "completed") {
    const completedRecently =
      Date.now() - +new Date(mostRecent.created_at) < 7 * 24 * 60 * 60 * 1000;
    if (completedRecently) {
      return {
        title: `"${mostRecent.name}" finished — see how it landed`,
        body:  "Drill into the per-employee funnel to see who fell for it and who didn't.",
        icon:  Activity,
        cta:   { label: "Open campaign", href: `/dashboard/campaigns/${mostRecent.id}` },
      };
    }
  }

  // 4. Default — encourage trying a new channel
  if (mostRecent && totals && totals.sent > 0) {
    return {
      title: "Try a different channel",
      body:  "Smishing and vishing simulations catch employees who've learned to spot phishing email — diversifying the test improves real resilience.",
      icon:  TrendingUp,
      cta:   { label: "New campaign", href: "/dashboard/campaigns/new" },
    };
  }

  return null;
}
