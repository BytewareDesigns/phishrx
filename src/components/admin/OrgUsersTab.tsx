import { useState } from "react";
import { Users, UserPlus, Trash2, Mail, ShieldCheck, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useOrgUsers, useUsers, useAssignUserToOrg, useRemoveUserFromOrg,
  useInviteUser,
} from "@/hooks/useUsers";
import { getInitials, formatDate } from "@/lib/utils";
import type { UserRole } from "@/types";

const inviteSchema = z.object({
  email:      z.string().email("Enter a valid email"),
  first_name: z.string().min(1, "Required"),
  last_name:  z.string().min(1, "Required"),
});
type InviteForm = z.infer<typeof inviteSchema>;

interface Props {
  organizationId: string;
  organizationName: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  master_admin:   "Master Admin",
  global_admin:   "Global Admin",
  training_admin: "Training Admin",
};

export function OrgUsersTab({ organizationId, organizationName }: Props) {
  const { data: assignments, isLoading } = useOrgUsers(organizationId);
  const { data: allUsers }   = useUsers();
  const assign = useAssignUserToOrg();
  const invite = useInviteUser();
  const remove = useRemoveUserFromOrg();

  const [addOpen, setAddOpen]           = useState(false);
  const [addTab, setAddTab]             = useState<"existing" | "invite">("existing");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);

  const inviteForm = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", first_name: "", last_name: "" },
  });

  // Eligible candidates = active, non-archived users not already assigned
  const assignedIds = new Set((assignments ?? []).map((a) => a.user_id));
  const eligibleUsers = (allUsers ?? []).filter(
    (u) => !u.is_archived && !assignedIds.has(u.id) && u.role === "training_admin"
  );

  const handleAdd = async () => {
    if (!selectedUserId) return;
    await assign.mutateAsync({
      userId:         selectedUserId,
      organizationId,
      role:           "training_admin",
    });
    setAddOpen(false);
    setSelectedUserId("");
  };

  const handleInvite = async (data: InviteForm) => {
    await invite.mutateAsync({
      email:           data.email,
      first_name:      data.first_name,
      last_name:       data.last_name,
      organization_id: organizationId,
    });
    setAddOpen(false);
    inviteForm.reset();
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    await remove.mutateAsync({
      userId:         removeTarget.userId,
      organizationId,
    });
    setRemoveTarget(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Training Admins
          </CardTitle>
          <CardDescription>
            Users who can manage campaigns, employees, and templates for {organizationName}
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Assign User
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (assignments ?? []).length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            No training admins assigned to this organization yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(assignments ?? []).map((a) => {
                const u = a.user_profiles;
                const name = u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email : "Unknown user";
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(u?.first_name, u?.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {u?.email ?? "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {ROLE_LABELS[a.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs gap-1">
                        {a.assigned_by_integration ? (
                          <><ShieldCheck className="h-3 w-3" /> Medcurity SSO</>
                        ) : (
                          <>Manual</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(a.assigned_at)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() =>
                          setRemoveTarget({ userId: a.user_id, name })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add user dialog — two modes: assign existing, or invite new by email */}
      <Dialog
        open={addOpen}
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v) {
            setSelectedUserId("");
            inviteForm.reset();
            setAddTab("existing");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add User to {organizationName}</DialogTitle>
            <DialogDescription>
              Assign an existing training admin or invite a new one by email.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={addTab} onValueChange={(v) => setAddTab(v as "existing" | "invite")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="existing" className="gap-1.5">
                <UserPlus className="h-3.5 w-3.5" /> Assign Existing
              </TabsTrigger>
              <TabsTrigger value="invite" className="gap-1.5">
                <Send className="h-3.5 w-3.5" /> Invite New
              </TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-3 pt-3">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    eligibleUsers.length === 0
                      ? "No eligible users available"
                      : "Choose a user…"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {eligibleUsers.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      All training admins are already assigned
                    </SelectItem>
                  ) : (
                    eligibleUsers.map((u) => {
                      const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
                      return (
                        <SelectItem key={u.id} value={u.id}>
                          {name ? `${name} — ${u.email}` : u.email}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only existing users with the Training Admin role appear here.
                To create a brand-new user, switch to the Invite New tab.
              </p>
              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleAdd}
                  disabled={!selectedUserId || assign.isPending}
                >
                  {assign.isPending ? "Assigning…" : "Assign User"}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="invite" className="pt-3">
              <form onSubmit={inviteForm.handleSubmit(handleInvite)} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="jane@example.com"
                    {...inviteForm.register("email")}
                  />
                  {inviteForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {inviteForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>First Name *</Label>
                    <Input {...inviteForm.register("first_name")} />
                    {inviteForm.formState.errors.first_name && (
                      <p className="text-xs text-destructive">
                        {inviteForm.formState.errors.first_name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last Name *</Label>
                    <Input {...inviteForm.register("last_name")} />
                    {inviteForm.formState.errors.last_name && (
                      <p className="text-xs text-destructive">
                        {inviteForm.formState.errors.last_name.message}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll email a magic link. When they accept, the user is automatically
                  assigned to <span className="font-medium">{organizationName}</span> as
                  a Training Admin.
                </p>
                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={invite.isPending}>
                    {invite.isPending ? "Sending invite…" : "Send Invite"}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove user from {organizationName}?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.name} will lose access to this organization's campaigns,
              employees, and templates. The user account itself is not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemove}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
