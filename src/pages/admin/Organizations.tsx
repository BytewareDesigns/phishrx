import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Building2, MoreHorizontal, CheckCircle2, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganizations, useCreateOrganization, useArchiveOrganization } from "@/hooks/useOrganizations";
import { formatDate } from "@/lib/utils";

const createSchema = z.object({
  name:                z.string().min(2, "Name must be at least 2 characters."),
  external_company_id: z.string().optional(),
  logo_url:            z.string().url("Enter a valid URL.").optional().or(z.literal("")),
});
type CreateForm = z.infer<typeof createSchema>;

export default function AdminOrganizations() {
  const navigate = useNavigate();
  const [search,      setSearch]      = useState("");
  const [createOpen,  setCreateOpen]  = useState(false);

  const { data: orgs, isLoading } = useOrganizations();
  const createMutation  = useCreateOrganization();
  const archiveMutation = useArchiveOrganization();

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", external_company_id: "", logo_url: "" },
  });

  const filtered = (orgs ?? []).filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      (o.external_company_id ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data: CreateForm) => {
    await createMutation.mutateAsync({
      name:                data.name,
      external_company_id: data.external_company_id || undefined,
      logo_url:            data.logo_url || undefined,
    });
    setCreateOpen(false);
    form.reset();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Organizations</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage all PhishRx client organizations
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Organization
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{orgs?.length ?? "—"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{orgs?.filter((o) => o.is_active).length ?? "—"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Inactive</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{orgs?.filter((o) => !o.is_active).length ?? "—"}</p></CardContent>
        </Card>
      </div>

      {/* Search + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
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
                  <TableHead>Organization</TableHead>
                  <TableHead>External ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      {search ? "No organizations match your search." : "No organizations yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((org) => (
                    <TableRow
                      key={org.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/admin/organizations/${org.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                            {org.logo_url
                              ? <img src={org.logo_url} alt="" className="h-6 w-6 object-contain" />
                              : <Building2 className="h-4 w-4 text-primary" />
                            }
                          </div>
                          <span className="font-medium">{org.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {org.external_company_id ?? "—"}
                      </TableCell>
                      <TableCell>
                        {org.is_active
                          ? <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>
                          : <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(org.created_at)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/admin/organizations/${org.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            {org.is_active && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => archiveMutation.mutate(org.id)}
                              >
                                Deactivate
                              </DropdownMenuItem>
                            )}
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Organization</DialogTitle>
            <DialogDescription>Create a new client organization in PhishRx.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name *</Label>
              <Input id="org-name" placeholder="Riverside Medical Center" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ext-id">External Company ID</Label>
              <Input id="ext-id" placeholder="840" {...form.register("external_company_id")} />
              <p className="text-xs text-muted-foreground">The Medcurity billing system company ID.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input id="logo" placeholder="https://…" {...form.register("logo_url")} />
              {form.formState.errors.logo_url && (
                <p className="text-sm text-destructive">{form.formState.errors.logo_url.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create Organization"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
