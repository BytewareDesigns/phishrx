import { useState, useMemo } from "react";
import { Users, UserPlus, Trash2, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEmployees, useCreateEmployee, useArchiveEmployee } from "@/hooks/useEmployees";

interface Props {
  organizationId: string;
  organizationName: string;
}

const createSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name:  z.string().min(1, "Required"),
  email:      z.string().email("Enter a valid email"),
  phone:      z.string().optional(),
  department: z.string().optional(),
  job_title:  z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export function OrgEmployeesTab({ organizationId, organizationName }: Props) {
  const { data: employees, isLoading } = useEmployees(organizationId);
  const createEmp  = useCreateEmployee();
  const archiveEmp = useArchiveEmployee();

  const [search, setSearch]         = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      first_name: "", last_name: "", email: "",
      phone: "", department: "", job_title: "",
    },
  });

  const filtered = useMemo(() => {
    return (employees ?? []).filter((e) => {
      const haystack = `${e.first_name} ${e.last_name} ${e.email} ${e.department ?? ""} ${e.job_title ?? ""}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [employees, search]);

  const handleCreate = async (data: CreateForm) => {
    await createEmp.mutateAsync({
      organization_id: organizationId,
      first_name:      data.first_name,
      last_name:       data.last_name,
      email:           data.email,
      phone:           data.phone || null,
      department:      data.department || null,
      job_title:       data.job_title || null,
      is_active:       true,
    });
    setCreateOpen(false);
    form.reset();
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    await archiveEmp.mutateAsync({ id: removeTarget.id, organizationId });
    setRemoveTarget(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Employees
          </CardTitle>
          <CardDescription>
            Phishing simulation targets for {organizationName}
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Add Employee
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            {search ? "No employees match your search." : "No employees yet."}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      {e.first_name} {e.last_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.email}</TableCell>
                    <TableCell className="text-sm">
                      {e.department ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.job_title ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setRemoveTarget({
                          id:   e.id,
                          name: `${e.first_name} ${e.last_name}`,
                        })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-xs text-muted-foreground">
            <Badge variant="outline">{filtered.length}</Badge> {filtered.length === 1 ? "employee" : "employees"}
          </p>
        )}
      </CardContent>

      {/* Create employee dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>
              Add a new phishing simulation target to {organizationName}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input {...form.register("first_name")} />
                {form.formState.errors.first_name && (
                  <p className="text-xs text-destructive">{form.formState.errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input {...form.register("last_name")} />
                {form.formState.errors.last_name && (
                  <p className="text-xs text-destructive">{form.formState.errors.last_name.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="555-123-4567" {...form.register("phone")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input {...form.register("department")} />
              </div>
              <div className="space-y-1.5">
                <Label>Job Title</Label>
                <Input {...form.register("job_title")} />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEmp.isPending}>
                {createEmp.isPending ? "Adding…" : "Add Employee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove employee?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.name} will be marked inactive and removed from future campaigns.
              Historical campaign data is preserved.
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
