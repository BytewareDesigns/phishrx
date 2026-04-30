import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Building2, CheckCircle2, UserCog, LayoutDashboard,
  Users, ShieldAlert, Settings, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/hooks/useOrganizations";
import { useAuth } from "@/hooks/useAuth";

import { OrgOverviewTab }     from "@/components/admin/OrgOverviewTab";
import { OrgUsersTab }        from "@/components/admin/OrgUsersTab";
import { OrgEmployeesTab }    from "@/components/admin/OrgEmployeesTab";
import { OrgCampaignsTab }    from "@/components/admin/OrgCampaignsTab";
import { OrgSubscriptionTab } from "@/components/admin/OrgSubscriptionTab";
import { OrgSettingsTab }     from "@/components/admin/OrgSettingsTab";

const TABS = ["overview", "users", "employees", "campaigns", "subscription", "settings"] as const;
type TabKey = typeof TABS[number];

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: org, isLoading } = useOrganization(id);
  const { isPlatformAdmin, startImpersonation } = useAuth();

  // Tab state synced to ?tab=… in URL so admin can deep-link
  const tabFromUrl = searchParams.get("tab") as TabKey | null;
  const initialTab: TabKey = tabFromUrl && TABS.includes(tabFromUrl) ? tabFromUrl : "overview";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabKey);
    if (value === "overview") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", value);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleImpersonate = () => {
    if (!org) return;
    startImpersonation(org.id, org.name);
    navigate("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Organization not found.
        <Button variant="link" onClick={() => navigate("/admin/organizations")}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/organizations")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Organizations
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {org.logo_url ? (
              <img src={org.logo_url} alt="" className="h-8 w-8 object-contain" />
            ) : (
              <Building2 className="h-6 w-6 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold">{org.name}</h1>
              {org.is_active ? (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                </Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            {org.external_company_id && (
              <p className="text-sm text-muted-foreground">
                Medcurity ID: {org.external_company_id}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isPlatformAdmin() && (
            <Button variant="outline" size="sm" onClick={handleImpersonate}>
              <UserCog className="h-4 w-4 mr-1" /> Impersonate
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Training Admins
          </TabsTrigger>
          <TabsTrigger value="employees" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Employees
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Subscription
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OrgOverviewTab org={org} />
        </TabsContent>
        <TabsContent value="users">
          <OrgUsersTab organizationId={org.id} organizationName={org.name} />
        </TabsContent>
        <TabsContent value="employees">
          <OrgEmployeesTab organizationId={org.id} organizationName={org.name} />
        </TabsContent>
        <TabsContent value="campaigns">
          <OrgCampaignsTab organizationId={org.id} organizationName={org.name} />
        </TabsContent>
        <TabsContent value="subscription">
          <OrgSubscriptionTab organizationId={org.id} organizationName={org.name} />
        </TabsContent>
        <TabsContent value="settings">
          <OrgSettingsTab org={org} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
