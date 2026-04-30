import { Activity, Mail, MessageSquare, Phone, Package, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useCampaignPackages } from "@/hooks/useOrganizations";
import { formatDate } from "@/lib/utils";
import type { CampaignChannel } from "@/types";

interface Props {
  organizationId: string;
  organizationName: string;
}

const CHANNEL_META: Record<CampaignChannel, { label: string; icon: React.ElementType; color: string }> = {
  email:       { label: "Phishing", icon: Mail,          color: "text-phishing"   },
  sms:         { label: "Smishing", icon: MessageSquare, color: "text-smishing"   },
  voice:       { label: "Vishing",  icon: Phone,         color: "text-vishing"    },
  direct_mail: { label: "Dishing",  icon: Package,       color: "text-dishing"    },
};

export function OrgSubscriptionTab({ organizationId, organizationName }: Props) {
  const { data: packages, isLoading } = useCampaignPackages(organizationId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!packages || packages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Subscription
          </CardTitle>
          <CardDescription>Campaign packages for {organizationName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground text-sm py-12">
            <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            No campaign packages yet.
            <p className="mt-1 text-xs">
              Subscriptions are provisioned via the Medcurity Integration API.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {packages.map((pkg) => {
        const usagePct = (pkg.used_seats / pkg.total_seats) * 100;
        const remaining = pkg.total_seats - pkg.used_seats;
        const isExpired = new Date(pkg.end_date) < new Date();

        return (
          <Card key={pkg.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Subscription #{pkg.external_subscription_id}
                  </CardTitle>
                  <CardDescription>
                    {formatDate(pkg.start_date)} – {formatDate(pkg.end_date)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {pkg.is_active && !isExpired ? (
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                    </Badge>
                  ) : isExpired ? (
                    <Badge variant="secondary">
                      <XCircle className="h-3 w-3 mr-1" /> Expired
                    </Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Seat usage */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Seats</span>
                  <span className="text-muted-foreground">
                    {pkg.used_seats} of {pkg.total_seats} used ·{" "}
                    <span className="font-medium text-foreground">{remaining}</span> remaining
                  </span>
                </div>
                <Progress value={usagePct} className="h-2" />
              </div>

              {/* Channels enabled */}
              <div>
                <p className="text-sm font-medium mb-2">Channels Enabled</p>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(CHANNEL_META) as CampaignChannel[]).map((ch) => {
                    const meta = CHANNEL_META[ch];
                    const enabled = pkg.channels_enabled.includes(ch);
                    const Icon = meta.icon;
                    return (
                      <div
                        key={ch}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${
                          enabled
                            ? `${meta.color} border-current bg-current/5`
                            : "text-muted-foreground/50 border-muted"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {meta.label}
                        {!enabled && <span className="ml-1 text-[10px]">disabled</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
