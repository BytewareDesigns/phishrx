import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Info, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================================
// ReasonBanner
//
// Reads a ?reason=... query param and renders a contextual yellow
// banner explaining why the user was sent here. Used by Employees
// and Templates pages when CampaignNew bounced the user away because
// they tried to launch a campaign with no targets / no templates.
//
// The banner persists across data changes — once the user adds the
// missing thing, they can click "Continue to campaign wizard" to go
// back where they came from.
// ============================================================

const REASONS: Record<string, {
  title:    string;
  body:     string;
  ctaText:  string;
  ctaHref:  string;
}> = {
  "campaign-needs-targets": {
    title:   "You need at least one employee before launching a campaign",
    body:    "Add a target below — upload a CSV or add manually — then continue to the campaign wizard.",
    ctaText: "Continue to campaign wizard",
    ctaHref: "/dashboard/campaigns/new",
  },
  "campaign-needs-templates": {
    title:   "You need at least one template before launching a campaign",
    body:    "PhishRx ships with global templates ready to use. Browse below — once one's available, you can continue to the campaign wizard.",
    ctaText: "Continue to campaign wizard",
    ctaHref: "/dashboard/campaigns/new",
  },
};

interface Props {
  /** When true, the CTA button is shown (the gap is filled). */
  ready?: boolean;
}

export function ReasonBanner({ ready = false }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const reason   = searchParams.get("reason");

  if (!reason || !REASONS[reason]) return null;

  const meta = REASONS[reason];

  const dismiss = () => {
    searchParams.delete("reason");
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
      <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-900">{meta.title}</p>
        <p className="text-xs text-amber-800/80 mt-0.5">{meta.body}</p>

        {ready && (
          <Button
            size="sm"
            className="mt-3"
            onClick={() => {
              dismiss();
              navigate(meta.ctaHref);
            }}
          >
            {meta.ctaText} <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
      </div>
      <button
        onClick={dismiss}
        className="text-amber-600 hover:text-amber-900 shrink-0"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
