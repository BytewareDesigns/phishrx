import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, MessageSquare, Phone, Package, Users, TrendingUp, MousePointerClick, AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCampaign, useLaunchCampaign, type CampaignDetail as CampaignDetailType } from "@/hooks/useCampaigns";
import { formatDate, formatDateTime } from "@/lib/utils";

const CHANNEL_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  email:       { label: "Phishing",  icon: <Mail          className="h-4 w-4" />, color: "text-phishing" },
  sms:         { label: "Smishing",  icon: <MessageSquare className="h-4 w-4" />, color: "text-smishing" },
  voice:       { label: "Vishing",   icon: <Phone         className="h-4 w-4" />, color: "text-vishing"  },
  direct_mail: { label: "Dishing",   icon: <Package       className="h-4 w-4" />, color: "text-dishing"  },
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "outline"> = {
  draft:     "outline",
  active:    "default",
  completed: "success",
  archived:  "secondary",
};

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: campaign, isLoading } = useCampaign(id);
  const launchMutation = useLaunchCampaign();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const c = campaign as CampaignDetailType | undefined;

  if (!c) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Campaign not found.
        <Button variant="link" onClick={() => navigate("/dashboard/campaigns")}>Go back</Button>
      </div>
    );
  }

  // Safely access joined relations
  const channels     = c.campaign_channels ?? [];
  const targets      = c.campaign_targets  ?? [];
  const totalTargets = targets.length;

  // Placeholder stats until campaign_stats materialized view is populated
  const sent      = 0;
  const clicked   = 0;
  const reported  = 0;
  const catchRate = totalTargets > 0 ? Math.round((clicked / totalTargets) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/campaigns")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Campaigns
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold">{c.name}</h1>
            <Badge variant={STATUS_VARIANT[c.status] ?? "secondary"} className="capitalize">
              {c.status === "active" && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current animate-pulse inline-block" />}
              {c.status}
            </Badge>
          </div>
          {c.description && (
            <p className="text-muted-foreground text-sm">{c.description}</p>
          )}
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            {c.start_date && <span>Starts: {formatDate(c.start_date)}</span>}
            {c.end_date   && <span>Ends: {formatDate(c.end_date)}</span>}
            <span>Created: {formatDateTime(c.created_at)}</span>
          </div>
        </div>
        {c.status === "draft" && (
          <Button
            onClick={() => launchMutation.mutate(c.id)}
            disabled={launchMutation.isPending}
          >
            {launchMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1" />Launching…</>
            ) : (
              "Launch Campaign"
            )}
          </Button>
        )}
      </div>

      {/* Active channels */}
      {channels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {channels.map((ch: any) => {
            const meta = CHANNEL_META[ch.channel];
            if (!meta) return null;
            return (
              <span
                key={ch.channel}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${meta.color} border-current/20 bg-current/5`}
              >
                {meta.icon}
                {meta.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Users           className="h-4 w-4" />} label="Targets"   value={totalTargets} />
        <StatCard icon={<TrendingUp      className="h-4 w-4" />} label="Sent"      value={sent}         sub={`of ${totalTargets}`} />
        <StatCard icon={<MousePointerClick className="h-4 w-4" />} label="Clicked" value={clicked}      sub={`${catchRate}% catch rate`} />
        <StatCard icon={<AlertTriangle   className="h-4 w-4" />} label="Reported"  value={reported}     sub="good catch!" />
      </div>

      {/* Catch rate bar */}
      {totalTargets > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Overall Catch Rate</CardTitle>
            <CardDescription>Percentage of targets who clicked a simulated phishing link</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{clicked} clicked</span>
              <span className="font-semibold">{catchRate}%</span>
            </div>
            <Progress value={catchRate} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Targets table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Targets ({totalTargets})
          </CardTitle>
          <CardDescription>Employees included in this campaign</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {targets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No targets assigned.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((t: any) => {
                  const emp = t.employees;
                  return (
                    <TableRow key={t.employee_id}>
                      <TableCell className="font-medium">
                        {emp ? `${emp.first_name} ${emp.last_name}` : t.employee_id}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {emp?.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {emp?.department ?? "—"}
                      </TableCell>
                      <TableCell>
                        {/* Per-target event status will come from campaign_events */}
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Channels detail */}
      {channels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channel Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {channels.map((ch: any) => {
                const meta = CHANNEL_META[ch.channel] ?? { label: ch.channel, icon: null, color: "" };
                return (
                  <div key={ch.channel} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className={`flex items-center gap-2 ${meta.color}`}>
                      {meta.icon}
                      <span className="font-medium text-sm">{meta.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 inline mr-1" />
                      Template configured
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
