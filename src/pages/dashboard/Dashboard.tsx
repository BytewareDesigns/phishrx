import { useNavigate } from "react-router-dom";
import {
  Mail, MessageSquare, Phone, MailIcon, TrendingUp, Users, ShieldCheck,
  AlertTriangle, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useMyOrganization } from "@/hooks/useMyOrganization";
import { useEmployees } from "@/hooks/useEmployees";
import {
  useCampaigns, useOrgCampaignTotals, useCampaignStats,
} from "@/hooks/useCampaigns";
import { formatDate } from "@/lib/utils";

const CHANNEL_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  email:       { label: "Phishing", icon: Mail,          color: "text-phishing bg-phishing-light" },
  sms:         { label: "Smishing", icon: MessageSquare, color: "text-smishing bg-smishing-light" },
  voice:       { label: "Vishing",  icon: Phone,         color: "text-vishing bg-vishing-light"   },
  direct_mail: { label: "Dishing",  icon: MailIcon,      color: "text-dishing bg-dishing-light"   },
};

export default function TrainingAdminDashboard() {
  const { profile }            = useAuth();
  const navigate               = useNavigate();
  const { data: org }          = useMyOrganization();
  const { data: employees }    = useEmployees(org?.id);
  const { data: campaigns }    = useCampaigns(org?.id);
  const { data: orgTotals }    = useOrgCampaignTotals(org?.id);

  // Per-channel breakdown — fetch stats for the most recent campaign so the
  // cards have a concrete number; if there's no campaign yet, leave em-dashes.
  const recentCampaign = (campaigns ?? [])
    .filter((c) => ["active", "completed", "paused"].includes(c.status))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];
  const { data: recentStats } = useCampaignStats(recentCampaign?.id);
  const channelTotals = (recentStats ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      if (row.channel) acc[row.channel] = row.total_caught ?? 0;
      return acc;
    },
    {},
  );

  const activeEmployees = (employees ?? []).filter((e) => e.is_active).length;
  const activeCampaigns = (campaigns ?? []).filter((c) => c.status === "active").length;
  const totalCampaigns  = (campaigns ?? []).length;

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Campaign Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, {profile?.first_name ?? "Admin"}
            {org?.name && <> · {org.name}</>}
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard/campaigns/new")}>
          New Campaign <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Employees
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeEmployees}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Available targets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Catch Rate
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {orgTotals && orgTotals.sent > 0
                ? `${orgTotals.catch_rate.toFixed(1)}%`
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {orgTotals && orgTotals.sent > 0
                ? `${orgTotals.caught} of ${orgTotals.sent} caught`
                : "no campaigns sent"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Campaigns
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeCampaigns}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{totalCampaigns} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Messages Sent
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{orgTotals?.sent ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">All campaigns</p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement funnel */}
      {orgTotals && orgTotals.sent > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagement Funnel</CardTitle>
            <CardDescription>Lifetime employee progression through your simulations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FunnelRow label="Sent"      value={orgTotals.sent}      total={orgTotals.sent} />
            <FunnelRow label="Delivered" value={orgTotals.delivered} total={orgTotals.sent} />
            <FunnelRow label="Opened"    value={orgTotals.opened}    total={orgTotals.sent} />
            <FunnelRow label="Clicked"   value={orgTotals.clicked}   total={orgTotals.sent} />
            <FunnelRow label="Caught"    value={orgTotals.caught}    total={orgTotals.sent} highlight />
          </CardContent>
        </Card>
      )}

      {/* Channel breakdown — uses last active campaign */}
      <div>
        <h2 className="text-base font-semibold mb-3">
          Channels {recentCampaign && (
            <span className="text-xs text-muted-foreground font-normal">
              · last campaign: {recentCampaign.name}
            </span>
          )}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {(Object.keys(CHANNEL_META) as Array<keyof typeof CHANNEL_META>).map((ch) => {
            const meta = CHANNEL_META[ch];
            const Icon = meta.icon;
            const caught = channelTotals[ch] ?? 0;
            return (
              <Card key={ch} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{meta.label}</CardTitle>
                  <div className={`rounded-md p-2 ${meta.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{recentCampaign ? caught : "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {recentCampaign ? "caught last campaign" : "no data yet"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Campaigns</CardTitle>
          <CardDescription>Your latest phishing simulation campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {!campaigns ? (
            <Skeleton className="h-32 w-full" />
          ) : campaigns.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No campaigns yet.{" "}
              <button
                className="ml-1 text-primary hover:underline"
                onClick={() => navigate("/dashboard/campaigns/new")}
              >
                Create your first campaign →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded transition-colors"
                  onClick={() => navigate(`/dashboard/campaigns/${c.id}`)}
                >
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                  </div>
                  <Badge
                    variant={
                      c.status === "active"    ? "default" :
                      c.status === "completed" ? "success" :
                      c.status === "draft"     ? "outline" : "secondary"
                    }
                    className="capitalize"
                  >
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FunnelRow({
  label, value, total, highlight,
}: { label: string; value: number; total: number; highlight?: boolean }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className={highlight ? "font-semibold text-rose-700" : ""}>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          <span className={`font-semibold ${highlight ? "text-rose-700" : "text-foreground"}`}>{value}</span>
          {" "}({pct.toFixed(1)}%)
        </span>
      </div>
      <Progress
        value={pct}
        className={`h-2 ${highlight ? "[&>div]:bg-rose-500" : ""}`}
      />
    </div>
  );
}
