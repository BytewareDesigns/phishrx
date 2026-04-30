import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, AlertTriangle, Power } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUpdateOrganization, useArchiveOrganization } from "@/hooks/useOrganizations";
import { useAuth } from "@/hooks/useAuth";
import type { Organization } from "@/types";

interface Props {
  org: Organization;
}

const editSchema = z.object({
  name:                z.string().min(2, "At least 2 characters"),
  external_company_id: z.string().optional(),
  logo_url:            z.string().url("Enter a valid URL").optional().or(z.literal("")),
});
type EditForm = z.infer<typeof editSchema>;

export function OrgSettingsTab({ org }: Props) {
  const navigate = useNavigate();
  const { isMasterAdmin, isGlobalAdmin } = useAuth();
  const updateOrg  = useUpdateOrganization();
  const archiveOrg = useArchiveOrganization();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: {
      name:                org.name,
      external_company_id: org.external_company_id ?? "",
      logo_url:            org.logo_url ?? "",
    },
  });

  const handleSave = async (data: EditForm) => {
    await updateOrg.mutateAsync({
      id:                  org.id,
      name:                data.name,
      external_company_id: data.external_company_id || undefined,
      logo_url:            data.logo_url || undefined,
    });
  };

  const handleDeactivate = async () => {
    await archiveOrg.mutateAsync(org.id);
    setConfirmDeactivate(false);
    navigate("/admin/organizations");
  };

  const canDeactivate = isMasterAdmin() || isGlobalAdmin();

  return (
    <div className="space-y-6">
      {/* General settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" /> Organization Settings
          </CardTitle>
          <CardDescription>
            Update the organization's display details and Medcurity integration mapping.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4 max-w-xl">
            <div className="space-y-2">
              <Label>Organization Name *</Label>
              <Input {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>External Company ID</Label>
              <Input placeholder="840" {...form.register("external_company_id")} />
              <p className="text-xs text-muted-foreground">
                The Medcurity billing system company ID. Used for SSO and subscription sync.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input placeholder="https://…" {...form.register("logo_url")} />
              {form.formState.errors.logo_url && (
                <p className="text-xs text-destructive">{form.formState.errors.logo_url.message}</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={updateOrg.isPending || !form.formState.isDirty}>
                {updateOrg.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger zone */}
      {canDeactivate && org.is_active && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible operations on this organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-sm">Deactivate organization</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hides the organization from active lists and disables new campaign creation.
                  Existing data is preserved and the org can be reactivated later.
                </p>
              </div>
              <Button
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive shrink-0"
                onClick={() => setConfirmDeactivate(true)}
              >
                <Power className="h-4 w-4 mr-1" /> Deactivate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {org.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The organization will be hidden from active lists. Training admins
              assigned to it will lose access. You can reactivate it later from the
              Organizations list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeactivate}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
