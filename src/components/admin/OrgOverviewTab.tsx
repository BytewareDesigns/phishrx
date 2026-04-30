import { useNavigate } from "react-router-dom";
import { Users, ShieldAlert, Calendar, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEmployees } from "@/hooks/useEmployees";
import { useCampaigns } from "@/hooks/useCampaigns";
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

  const activeEmployees = (employees ?? []).filter((e) => e.is_active).length;
  const activeCampaigns = (campaigns ?? []).filter((c) => c.status === "active").length;
  const activePackage   = (packages  ?? []).find((p) => p.is_active);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
