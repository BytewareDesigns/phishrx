import { useState } from "react";
import {
  Search, MoreHorizontal, UserCog, Building2, ShieldAlert,
  UserX, UserCheck, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useUsers, useUpdateUserRole, useArchiveUser,
  useUserOrgAssignments, useAssignUserToOrg, useRemoveUserFromOrg,
} from "@/hooks/useUsers";
import { useOrganizations } from "@/hooks/useOrganizations";
import type { UserProfile, UserRole } from "@/types";
import { formatDate } from "@/lib/utils";

const ROLE_LABELS: Record<UserRole, string> = {
  master_admin:   "Master Admin",
  global_admin:   "Global Admin",
  training_admin: "Training Admin",
};

const ROLE_VARIANT: Record<UserRole, "default" | "secondary" | "outline"> = {
  master_admin:   "default",
  global_admin:   "secondary",
  training_admin: "outline",
};

export default function Users() {
  const [search,      setSearch]      = useState("");
  const [roleFilter,  setRoleFilter]  = useState<UserRole | "all">("all");
  const [archiveUser, setArchiveUser] = useState<UserProfile | null>(null);
  const [roleUser,    setRoleUser]    = useState<UserProfile | null>(null);
  const [newRole,     setNewRole]     = useState<UserRole>("training_admin");
  const [orgUser,     setOrgUser]     = useState<UserProfile | null>(null);
  const [assignOrgId, setAssignOrgId] = useState("");

  const { data: users,  isLoading } = useUsers();
  const { data: orgs  }             = useOrganizations();
  const updateRole    = useUpdateUserRole();
  const archiveMut    = useArchiveUser();
  const assignOrg     = useAssignUserToOrg();
  const removeOrg     = useRemoveUserFromOrg();

  // Assignments shown inside the manage-org dialog
  const { data: assignments, isLoading: loadingAssign } = useUserOrgAssignments(orgUser?.id);

  const filtered = (users ?? []).filter((u) => {
    const matchSearch =
      `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole && !u.is_archived;
  });

  const handleRoleOpen = (user: UserProfile) => {
    setNewRole(user.role);
    setRoleUser(user);
  };

  const handleRoleSave = async () => {
    if (!roleUser) return;
    await updateRole.mutateAsync({ id: roleUser.id, role: newRole });
    setRoleUser(null);
  };

  const handleArchiveConfirm = async () => {
    if (!archiveUser) return;
    await archiveMut.mutateAsync(archiveUser.id);
    setArchiveUser(null);
  };

  const handleAssignOrg = async () => {
    if (!orgUser || !assignOrgId) return;
    await assignOrg.mutateAsync({ userId: orgUser.id, organizationId: assignOrgId });
    setAssignOrgId("");
  };

  const handleRemoveOrg = async (organizationId: string) => {
    if (!orgUser) return;
    await removeOrg.mutateAsync({ userId: orgUser.id, organizationId });
  };

  const activeCount   = (users ?? []).filter(u => !u.is_archived).length;
  const adminCount    = (users ?? []).filter(u => u.role === "master_admin" || u.role === "global_admin").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage platform users, roles, and organization assignments
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Users</span>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{activeCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-sm text-muted-foreground">Platform Admins</span>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{adminCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-sm text-muted-foreground">Organizations</span>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{orgs?.length ?? "—"}</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | "all")}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="master_admin">Master Admin</SelectItem>
                <SelectItem value="global_admin">Global Admin</SelectItem>
                <SelectItem value="training_admin">Training Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.first_name || user.last_name
                          ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
                          : <span className="text-muted-foreground italic">No name</span>
                        }
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={ROLE_VARIANT[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleRoleOpen(user)}>
                              <UserCog className="h-4 w-4 mr-2" /> Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setOrgUser(user)}>
                              <Building2 className="h-4 w-4 mr-2" /> Manage Orgs
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setArchiveUser(user)}
                            >
                              <UserX className="h-4 w-4 mr-2" /> Archive User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Change Role Dialog */}
      <Dialog open={!!roleUser} onOpenChange={() => setRoleUser(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update the platform role for{" "}
              <span className="font-medium">{roleUser?.email}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>New Role</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="master_admin">Master Admin</SelectItem>
                <SelectItem value="global_admin">Global Admin</SelectItem>
                <SelectItem value="training_admin">Training Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleUser(null)}>Cancel</Button>
            <Button onClick={handleRoleSave} disabled={updateRole.isPending}>
              {updateRole.isPending ? "Saving…" : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Org Assignments Dialog */}
      <Dialog open={!!orgUser} onOpenChange={() => setOrgUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Organization Assignments</DialogTitle>
            <DialogDescription>
              Manage which organizations <span className="font-medium">{orgUser?.email}</span> can access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current assignments */}
            <div>
              <p className="text-sm font-medium mb-2">Current Assignments</p>
              {loadingAssign ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (assignments ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center border rounded-md">
                  Not assigned to any organizations.
                </p>
              ) : (
                <div className="space-y-2">
                  {assignments!.map((a) => (
                    <div key={a.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                      <div className="flex items-center gap-2">
                        {a.organizations.logo_url
                          ? <img src={a.organizations.logo_url} alt="" className="h-5 w-5 object-contain" />
                          : <Building2 className="h-4 w-4 text-muted-foreground" />
                        }
                        <span className="text-sm font-medium">{a.organizations.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-7 text-xs"
                        onClick={() => handleRemoveOrg(a.organizations.id)}
                        disabled={removeOrg.isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add assignment */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Assign to Organization</p>
              <div className="flex gap-2">
                <Select value={assignOrgId} onValueChange={setAssignOrgId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select organization…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(orgs ?? [])
                      .filter(o => !assignments?.some(a => a.organizations.id === o.id))
                      .map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssignOrg}
                  disabled={!assignOrgId || assignOrg.isPending}
                >
                  {assignOrg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                  Assign
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgUser(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirm */}
      <AlertDialog open={!!archiveUser} onOpenChange={() => setArchiveUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive User?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{archiveUser?.email}</span> will lose access to the platform.
              Their data will be preserved and can be restored manually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleArchiveConfirm}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
