import { useState } from "react";
import { Building2, Edit2, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyOrganization } from "@/hooks/useMyOrganization";
import { useUpdateOrganization } from "@/hooks/useOrganizations";
import { formatDate } from "@/lib/utils";

const editSchema = z.object({
  name:     z.string().min(2, "Organization name must be at least 2 characters"),
  logo_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});
type EditForm = z.infer<typeof editSchema>;

export default function OrgSettings() {
  const [editOpen, setEditOpen] = useState(false);

  const { data: org, isLoading } = useMyOrganization();
  const updateMutation           = useUpdateOrganization();

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: { name: org?.name ?? "", logo_url: org?.logo_url ?? "" },
  });

  const handleEdit = async (data: EditForm) => {
    if (!org?.id) return;
    await updateMutation.mutateAsync({
      id: org.id,
      name: data.name,
      logo_url: data.logo_url || undefined,
    });
    setEditOpen(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Organization Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your organization profile and preferences
        </p>
      </div>

      {/* Org profile card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">Organization Profile</CardTitle>
              <CardDescription>Basic information about your organization</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Edit2 className="h-4 w-4 mr-1" /> Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              {org?.logo_url
                ? <img src={org.logo_url} alt="" className="h-10 w-10 object-contain" />
                : <Building2 className="h-8 w-8 text-primary" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">{org?.name ?? "—"}</p>
                {org?.is_active
                  ? <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>
                  : <Badge variant="secondary">Inactive</Badge>
                }
              </div>
              {org?.external_company_id && (
                <p className="text-sm text-muted-foreground">
                  External ID: {org.external_company_id}
                </p>
              )}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Organization ID</p>
              <p className="font-mono text-xs mt-0.5 break-all">{org?.id ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="mt-0.5">{org?.created_at ? formatDate(org.created_at) : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Updated</p>
              <p className="mt-0.5">{org?.updated_at ? formatDate(org.updated_at) : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Logo URL</p>
              <p className="mt-0.5 text-xs break-all">{org?.logo_url || "Not set"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simulation preferences (read-only, informational) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Simulation Preferences</CardTitle>
          <CardDescription>
            Channel access is managed by your platform administrator based on your subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Phishing (Email)",       key: "email" },
            { label: "Smishing (SMS)",          key: "sms" },
            { label: "Vishing (Voice)",         key: "voice" },
            { label: "Dishing (Direct Mail)",   key: "direct_mail" },
          ].map(({ label }) => (
            <div key={label} className="flex items-center justify-between py-1">
              <p className="text-sm">{label}</p>
              <Badge variant="outline">Contact Admin</Badge>
            </div>
          ))}
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
              <Label>Organization Name *</Label>
              <Input {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input placeholder="https://…" {...form.register("logo_url")} />
              {form.formState.errors.logo_url && (
                <p className="text-xs text-destructive">{form.formState.errors.logo_url.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
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
