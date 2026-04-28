import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Users, ShieldAlert, Edit2, CheckCircle2, UserCog } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOrganization, useUpdateOrganization } from "@/hooks/useOrganizations";
import { useEmployees } from "@/hooks/useEmployees";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";

const editSchema = z.object({
  name:     z.string().min(2),
  logo_url: z.string().url().optional().or(z.literal("")),
});
type EditForm = z.infer<typeof editSchema>;

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const { data: org, isLoading } = useOrganization(id);
  const { data: employees }      = useEmployees(id);
  const { data: campaigns }      = useCampaigns(id);
  const updateMutation           = useUpdateOrganization();

  const { isPlatformAdmin, startImpersonation } = useAuth();

  const handleImpersonate = () => {
    if (!org) return;
    startImpersonation(org.id, org.name);
    navigate("/dashboard");
  };

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: { name: org?.name ?? "", logo_url: org?.logo_url ?? "" },
  });

  const handleEdit = async (data: EditForm) => {
    if (!id) return;
    await updateMutation.mutateAsync({ id, name: data.name, logo_url: data.logo_url || undefined });
    setEditOpen(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Organization not found.
        <Button variant="link" onClick={() => navigate("/admin/organizations")}>Go back</Button>
      </div>
    );
  }

  const activeEmployees = (employees ?? []).filter(e => e.is_active).length;
  const activeCampaigns = (campaigns ?? []).filter(c => c.status === "active").length;

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/organizations")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Organizations
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            {org.logo_url
              ? <img src={org.logo_url} alt="" className="h-8 w-8 object-contain" />
              : <Building2 className="h-6 w-6 text-primary" />
            }
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{org.name}</h1>
              {org.is_active
                ? <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>
                : <Badge variant="secondary">Inactive</Badge>
              }
            </div>
            {org.external_company_id && (
              <p className="text-sm text-muted-foreground">ID: {org.external_company_id}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPlatformAdmin() && (
            <Button variant="outline" size="sm" onClick={handleImpersonate}>
              <UserCog className="h-4 w-4 mr-1" /> Impersonate
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit2 className="h-4 w-4 mr-1" /> Edit
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <CardTitle className="text-sm text-muted-foreground">Total Campaigns</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{campaigns?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">{activeCampaigns} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Created</CardTitle>
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
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                  </div>
                  <Badge variant={
                    c.status === "active"    ? "default"    :
                    c.status === "completed" ? "success"    :
                    c.status === "draft"     ? "outline"    : "secondary"
                  }>
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleEdit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input placeholder="https://…" {...form.register("logo_url")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
