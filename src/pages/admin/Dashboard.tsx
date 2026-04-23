import { Building2, Users, ShieldAlert, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

const STAT_CARDS = [
  {
    label:       "Total Organizations",
    value:       "—",
    icon:        Building2,
    description: "Active client organizations",
    color:       "text-blue-600 bg-blue-50",
  },
  {
    label:       "Total Users",
    value:       "—",
    icon:        Users,
    description: "Training admins + targets",
    color:       "text-emerald-600 bg-emerald-50",
  },
  {
    label:       "Active Campaigns",
    value:       "—",
    icon:        ShieldAlert,
    description: "Campaigns currently running",
    color:       "text-amber-600 bg-amber-50",
  },
  {
    label:       "Events (30 days)",
    value:       "—",
    icon:        Activity,
    description: "Tracking events recorded",
    color:       "text-purple-600 bg-purple-50",
  },
];

export default function AdminDashboard() {
  const { profile } = useAuth();

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Platform Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, {profile?.first_name ?? "Admin"}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {profile?.role === "master_admin" ? "Master Admin" : "Global Admin"}
        </Badge>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <div className={`rounded-md p-2 ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Organizations</CardTitle>
            <CardDescription>Latest onboarded clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No organizations yet
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Campaigns</CardTitle>
            <CardDescription>Campaigns running across all organizations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No active campaigns
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
