import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Mail, MessageSquare, Phone, Package, Users, Send,
  Eye, MousePointerClick, AlertTriangle, CheckCircle2, Clock, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useCampaign, useLaunchCampaign,
  useCampaignStats, useCampaignTotals, useCampaignTargetStatuses,
  type CampaignDetail as CampaignDetailType,
  type TargetStatus,
} from "@/hooks/useCampaigns";
import { formatDate, formatDateTime } from "@/lib/utils";

const CHANNEL_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  email:       { label: "Phishing",  icon: <Mail          className="h-4 w-4" />, color: "text-phishing" },
  sms:         { label: "Smishing",  icon: <MessageSquare className="h-4 w-4" />, color: "text-smishing" },
  voice:       { label: "Vishing",   icon: <Phone         className="h-4 w-4" />, color: "text-vishing"  },
  direct_mail: { label: "Dishing",   icon: <Package       className="h-4 w-4" />, color: "text-dishing"  },
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "outline" | "destructive"> = {
  draft:     "outline",
  active:    "default",
  paused:    "secondary",
  completed: "success",
  cancelled: "destructive",
  archived:  "secondary",
};

const TARGET_STATUS_META: Record<TargetStatus, { label: string; className: string; icon: React.ElementType }> = {
  pending:        { label: "Pending",   className: "text-muted-foreground bg-muted",       icon: Clock              },
  sent:           { label: "Sent",      className: "text-blue-600 bg-blue-50",             icon: Send               },
  delivered:      { label: "Delivered", className: "text-cyan-700 bg-cyan-50",             icon: CheckCircle2       },
  opened:         { label: "Opened",    className: "text-indigo-700 bg-indigo-50",         icon: Eye                },
  clicked:        { label: "Clicked",   className: "text-amber-700 bg-amber-50",           icon: MousePointerClick  },
  form_submitted: { label: "Submitted", className: "text-orange-700 bg-orange-50",         icon: AlertTriangle      },
  caught:         { label: "Caught",    className: "text-rose-700 bg-rose-50",             icon: AlertTriangle      },
};

function StatCard({
  icon, label, value, sub,
}: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
}) {
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

function TargetStatusBadge({ status }: { status: TargetStatus }) {
  const meta = TARGET_STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: campaign, isLoading } = useCampaign(id);
  const { data: totals }              = useCampaignTotals(id);
  const { data: channelStats }        = useCampaignStats(id);
  const { data: targetStatuses }      = useCampaignTargetStatuses(id);
  const launchMutation                = useLaunchCampaign();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28" />)}
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

  const channels     = c.campaign_channels ?? [];
  const targets      = c.campaign_targets  ?? [];
  const totalTargets = targets.length;

  const sent          = totals?.sent           ?? 0;
  const opened        = totals?.opened         ?? 0;
  const clicked       = totals?.clicked        ?? 0;
  const caught        = totals?.caught         ?? 0;
  const catchRate     = totals?.catch_rate     ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/campaigns")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Campaigns
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold">{c.name}</h1>
            <Badge variant={STATUS_VARIANT[c.status] ?? "secondary"} className="capitalize">
              {c.status === "active" && (
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current animate-pulse inline-block" />
              )}
              {c.status}
            </Badge>
          </div>
          {c.description && (
            <p className="text-muted-foreground text-sm">{c.description}</p>
          )}
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
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

      {/* Stat cards — real data from campaign_stats view */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Targets"
          value={totalTargets}
        />
        <StatCard
          icon={<Send className="h-4 w-4" />}
          label="Sent"
          value={sent}
          sub={`${totalTargets > 0 ? Math.round((sent / totalTargets) * 100) : 0}% of targets`}
        />
        <StatCard
          icon={<Eye className="h-4 w-4" />}
          label="Opened"
          value={opened}
          sub={`${sent > 0 ? Math.round((opened / sent) * 100) : 0}% of sent`}
        />
        <StatCard
          icon={<MousePointerClick className="h-4 w-4" />}
          label="Clicked"
          value={clicked}
          sub={`${sent > 0 ? Math.round((clicked / sent) * 100) : 0}% click-through`}
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Caught"
          value={caught}
          sub={`${catchRate.toFixed(1)}% catch rate`}
        />
      </div>

      {/* Catch rate bar */}
      {totalTargets > 0 && sent > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Overall Catch Rate</CardTitle>
            <CardDescription>
              Percentage of employees who fell for the simulation (clicked, submitted, or fully engaged)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{caught} of {sent} delivered</span>
              <span className="font-semibold">{catchRate.toFixed(1)}%</span>
            </div>
            <Progress value={catchRate} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Per-channel breakdown */}
      {channelStats && channelStats.length > 0 && channelStats.some((c) => c.channel) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channel Performance</CardTitle>
            <CardDescription>Breakdown of each enabled channel's funnel</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Opened</TableHead>
                  <TableHead className="text-right">Clicked</TableHead>
                  <TableHead className="text-right">Caught</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelStats
                  .filter((row) => row.channel)
                  .map((row) => {
                    const meta = CHANNEL_META[row.channel!];
                    return (
                      <TableRow key={row.channel!}>
                        <TableCell>
                          <div className={`flex items-center gap-2 ${meta?.color ?? ""}`}>
                            {meta?.icon}
                            <span className="font-medium text-sm">{meta?.label ?? row.channel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.total_sent}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.total_opened}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.total_clicked}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{row.total_caught}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.catch_rate?.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Targets table with per-employee status drill-down */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Targets ({totalTargets})
          </CardTitle>
          <CardDescription>
            Employees included in this campaign · Status reflects the furthest progression in the phishing funnel
          </CardDescription>
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
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((t: any) => {
                  const emp = t.employees;
                  const targetState = targetStatuses?.get(t.employee_id);
                  const status: TargetStatus = targetState?.status ?? "pending";
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
                        <TargetStatusBadge status={status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {targetState?.last_event ? formatDateTime(targetState.last_event) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Channel configuration */}
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
