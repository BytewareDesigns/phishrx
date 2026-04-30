import { useNavigate } from "react-router-dom";
import { Users, ShieldAlert, Calendar, Activity, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useEmployees } from "@/hooks/useEmployees";
import { useCampaigns, useOrgCampaignTotals } from "@/hooks/useCampaigns";
import { useCampaignPackages } from "@/hooks/useOrganizations";
import { formatDate } from "@/lib/utils";
import type { Organization } from "@/types";

interface Props {
  org: Organization;
}

export function OrgOverviewTab({ org }: Props) {
  const navigate = useNavigate();
  const { data: employees }  = useEmployees(org.id);
  const { data: campaigns }  = useCampaigns(org.id);
  const { data: packages }   = useCampaignPackages(org.id);
  const { data: orgTotals }  = useOrgCampaignTotals(org.id);

  const activeEmployees = (employees ?? []).filter((e) => e.is_active).length;
  const activeCampaigns = (campaigns ?? []).filter((c) => c.status === "active").length;
  const activePackage   = (packages  ?? []).find((p) => p.is_active);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeEmployees}</p>
            <p className="text-xs text-muted-foreground">Active targets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Campaigns</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{campaigns?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">{activeCampaigns} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Catch Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {orgTotals && orgTotals.sent > 0 ? `${orgTotals.catch_rate.toFixed(1)}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {orgTotals && orgTotals.sent > 0
                ? `${orgTotals.caught} of ${orgTotals.sent} caught`
                : "no campaigns sent yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Subscription</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {activePackage ? `${activePackage.used_seats}/${activePackage.total_seats}` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {activePackage ? "Seats used" : "No active package"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">Created</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{formatDate(org.created_at)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement funnel — only if we have actual sends */}
      {orgTotals && orgTotals.sent > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagement Funnel</CardTitle>
            <CardDescription>How employees moved through phishing simulations to date</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FunnelRow label="Sent"      value={orgTotals.sent}      total={orgTotals.sent} />
            <FunnelRow label="Delivered" value={orgTotals.delivered} total={orgTotals.sent} />
            <FunnelRow label="Opened"    value={orgTotals.opened}    total={orgTotals.sent} />
            <FunnelRow label="Clicked"   value={orgTotals.clicked}   total={orgTotals.sent} />
            <FunnelRow label="Caught"    value={orgTotals.caught}    total={orgTotals.sent} highlight />
          </CardContent>
        </Card>
      )}

      {/* Recent campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Campaigns</CardTitle>
          <CardDescription>Phishing simulation campaigns for this organization</CardDescription>
        </CardHeader>
        <CardContent>
          {(campaigns ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No campaigns yet.</p>
          ) : (
            <div className="space-y-2">
              {(campaigns ?? []).slice(0, 5).map((c) => (
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
