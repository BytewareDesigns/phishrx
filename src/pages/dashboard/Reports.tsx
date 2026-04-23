import { useMemo } from "react";
import { TrendingUp, Users, ShieldAlert, MousePointerClick, AlertTriangle, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useEmployees } from "@/hooks/useEmployees";
import { useMyOrganization } from "@/hooks/useMyOrganization";
import { formatDate } from "@/lib/utils";

// Channel colors matching brand palette
const CHANNEL_COLORS: Record<string, string> = {
  email:       "#2463EB",
  sms:         "#10B981",
  voice:       "#F59E0B",
  direct_mail: "#8B5CF6",
};

const CHANNEL_LABELS: Record<string, string> = {
  email:       "Phishing",
  sms:         "Smishing",
  voice:       "Vishing",
  direct_mail: "Dishing",
};

const STATUS_COLORS: Record<string, string> = {
  draft:     "#94A3B8",
  active:    "#2463EB",
  completed: "#10B981",
  archived:  "#CBD5E1",
};

function StatCard({
  icon, label, value, sub, trend,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; trend?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        {trend && <p className="text-xs text-emerald-600 font-medium mt-1">{trend}</p>}
      </CardContent>
    </Card>
  );
}

function LoadingCards() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
    </div>
  );
}

export default function Reports() {
  const { data: org } = useMyOrganization();
  const { data: campaigns, isLoading: loadingCampaigns } = useCampaigns(org?.id);
  const { data: employees, isLoading: loadingEmployees } = useEmployees(org?.id);

  const isLoading = loadingCampaigns || loadingEmployees;

  // ── Derived stats ────────────────────────────────────────────
  const stats = useMemo(() => {
    const total        = campaigns?.length ?? 0;
    const active       = campaigns?.filter(c => c.status === "active").length    ?? 0;
    const completed    = campaigns?.filter(c => c.status === "completed").length ?? 0;
    const totalTargets = employees?.length ?? 0;
    return { total, active, completed, totalTargets };
  }, [campaigns, employees]);

  // ── Campaign status breakdown for pie chart ───────────────────
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    (campaigns ?? []).forEach(c => {
      counts[c.status] = (counts[c.status] ?? 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name:  status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: STATUS_COLORS[status] ?? "#94A3B8",
    }));
  }, [campaigns]);

  // ── Campaigns over time (last 6 months) ──────────────────────
  const timelineData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      months[key] = 0;
    }
    (campaigns ?? []).forEach(c => {
      const d   = new Date(c.created_at);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      if (key in months) months[key]++;
    });
    return Object.entries(months).map(([month, count]) => ({ month, count }));
  }, [campaigns]);

  // ── Department breakdown ──────────────────────────────────────
  const deptData = useMemo(() => {
    const depts: Record<string, number> = {};
    (employees ?? []).forEach(e => {
      const dept = e.department ?? "Unknown";
      depts[dept] = (depts[dept] ?? 0) + 1;
    });
    return Object.entries(depts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([dept, count]) => ({ dept, count }));
  }, [employees]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <LoadingCards />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {org?.name ? `Security awareness overview for ${org.name}` : "Organization security analytics"}
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<ShieldAlert         className="h-4 w-4" />}
          label="Total Campaigns"
          value={stats.total}
          sub={`${stats.active} active`}
        />
        <StatCard
          icon={<Users               className="h-4 w-4" />}
          label="Total Targets"
          value={stats.totalTargets}
          sub="active employees"
        />
        <StatCard
          icon={<TrendingUp          className="h-4 w-4" />}
          label="Completed"
          value={stats.completed}
          sub="campaigns finished"
        />
        <StatCard
          icon={<MousePointerClick   className="h-4 w-4" />}
          label="Catch Rate"
          value="—"
          sub="tracked via events"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaigns over time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Campaigns Created (Last 6 Months)
            </CardTitle>
            <CardDescription>Monthly campaign creation activity</CardDescription>
          </CardHeader>
          <CardContent>
            {timelineData.every(d => d.count === 0) ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No campaigns in the last 6 months
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={timelineData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number) => [v, "Campaigns"]}
                  />
                  <Bar dataKey="count" fill="#2463EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Campaign status pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign Status Breakdown</CardTitle>
            <CardDescription>Distribution of campaigns by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No campaigns yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number, name: string) => [v, name]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department breakdown */}
      {deptData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employees by Department</CardTitle>
            <CardDescription>Top departments in your target roster</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis type="category" dataKey="dept" tick={{ fontSize: 12 }} width={110} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [v, "Employees"]} />
                <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent campaigns table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Campaigns</CardTitle>
          <CardDescription>Last 10 campaigns for this organization</CardDescription>
        </CardHeader>
        <CardContent>
          {(campaigns ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No campaigns yet.</p>
          ) : (
            <div className="space-y-2">
              {(campaigns ?? []).slice(0, 10).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        c.status === "active"    ? "default"    :
                        c.status === "completed" ? "success"    :
                        c.status === "draft"     ? "outline"    : "secondary"
                      }
                      className="capitalize"
                    >
                      {c.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert note */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                Detailed analytics coming soon
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                Per-employee click tracking, catch rate trends, and channel performance reports will appear here
                once campaigns are launched and event data is collected.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
