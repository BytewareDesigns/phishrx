import { useState, useRef } from "react";
import { Plus, Search, Upload, MoreHorizontal, Users, Mail, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployees, useCreateEmployee, useArchiveEmployee, useBulkCreateEmployees } from "@/hooks/useEmployees";
import { useMyOrganization } from "@/hooks/useMyOrganization";
import { toast } from "sonner";

const employeeSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name:  z.string().min(1, "Required"),
  email:      z.string().email("Valid email required"),
  department: z.string().optional(),
  job_title:  z.string().optional(),
  phone:      z.string().optional(),
});
type EmployeeForm = z.infer<typeof employeeSchema>;

export default function Employees() {
  const [search,       setSearch]       = useState("");
  const [addOpen,      setAddOpen]      = useState(false);
  const [importOpen,   setImportOpen]   = useState(false);
  const [archiveId,    setArchiveId]    = useState<string | null>(null);
  const [csvRows,      setCsvRows]      = useState<EmployeeForm[]>([]);
  const [csvError,     setCsvError]     = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: org } = useMyOrganization();
  const { data: employees, isLoading } = useEmployees(org?.id);
  const createMutation      = useCreateEmployee();
  const archiveMutation     = useArchiveEmployee();
  const bulkCreateMutation  = useBulkCreateEmployees();

  const form = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { first_name: "", last_name: "", email: "", department: "", job_title: "", phone: "" },
  });

  const filtered = (employees ?? []).filter(
    (e) =>
      `${e.first_name} ${e.last_name} ${e.email} ${e.department ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  // ── Add single employee ────────────────────────────────────
  const handleAdd = async (data: EmployeeForm) => {
    if (!org?.id) return;
    await createMutation.mutateAsync({ ...data, organization_id: org.id, is_active: true });
    setAddOpen(false);
    form.reset();
  };

  // ── CSV parsing ────────────────────────────────────────────
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError("");
    setCsvRows([]);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) { setCsvError("CSV must have a header row and at least one data row."); return; }

      // Detect header: first_name, last_name, email, (optional: department, job_title, phone)
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const required = ["first_name", "last_name", "email"];
      const missing = required.filter((f) => !header.includes(f));
      if (missing.length > 0) { setCsvError(`Missing columns: ${missing.join(", ")}`); return; }

      const idx = (col: string) => header.indexOf(col);
      const rows: EmployeeForm[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const row: EmployeeForm = {
          first_name: cols[idx("first_name")] ?? "",
          last_name:  cols[idx("last_name")]  ?? "",
          email:      cols[idx("email")]      ?? "",
          department: idx("department")  >= 0 ? cols[idx("department")] : undefined,
          job_title:  idx("job_title")   >= 0 ? cols[idx("job_title")]  : undefined,
          phone:      idx("phone")       >= 0 ? cols[idx("phone")]       : undefined,
        };
        const result = employeeSchema.safeParse(row);
        if (!result.success) { setCsvError(`Row ${i + 1}: ${result.error.errors[0].message}`); return; }
        rows.push(row);
      }
      setCsvRows(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!org?.id || csvRows.length === 0) return;
    await bulkCreateMutation.mutateAsync({ organizationId: org.id, employees: csvRows });
    setImportOpen(false);
    setCsvRows([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {org?.name ? `Managing targets for ${org.name}` : "Manage phishing simulation targets"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Employee
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Employees</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{employees?.length ?? "—"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-sm text-muted-foreground">Departments</span>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Set((employees ?? []).map(e => e.department).filter(Boolean)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                  <TableHead>Department</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      {search ? "No employees match your search." : "No employees yet. Add one or import from CSV."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">
                        {emp.first_name} {emp.last_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{emp.email}</TableCell>
                      <TableCell>
                        {emp.department
                          ? <Badge variant="outline" className="text-xs">{emp.department}</Badge>
                          : <span className="text-muted-foreground text-sm">—</span>
                        }
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {emp.job_title ?? "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setArchiveId(emp.id)}
                            >
                              Remove
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

      {/* Add Employee Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription>Add a new phishing simulation target to your roster.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input placeholder="Jane" {...form.register("first_name")} />
                {form.formState.errors.first_name && <p className="text-xs text-destructive">{form.formState.errors.first_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input placeholder="Doe" {...form.register("last_name")} />
                {form.formState.errors.last_name && <p className="text-xs text-destructive">{form.formState.errors.last_name.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email Address *</Label>
              <Input type="email" placeholder="jane.doe@company.com" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Department</Label>
                <Input placeholder="Nursing" {...form.register("department")} />
              </div>
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input placeholder="RN" {...form.register("job_title")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="555-123-4567" {...form.register("phone")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setAddOpen(false); form.reset(); }}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding…" : "Add Employee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Employees from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with columns: <code className="text-xs bg-muted px-1 rounded">first_name, last_name, email</code> (plus optional: department, job_title, phone).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click to select a CSV file</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
            </div>

            {csvError && <p className="text-sm text-destructive">{csvError}</p>}

            {csvRows.length > 0 && (
              <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3">
                <p className="text-sm text-emerald-800 font-medium">
                  ✓ {csvRows.length} employee(s) ready to import
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Preview: {csvRows.slice(0, 3).map(r => `${r.first_name} ${r.last_name}`).join(", ")}{csvRows.length > 3 ? ` + ${csvRows.length - 3} more` : ""}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setCsvRows([]); setCsvError(""); }}>Cancel</Button>
            <Button
              onClick={handleImport}
              disabled={csvRows.length === 0 || bulkCreateMutation.isPending}
            >
              {bulkCreateMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Importing…</> : `Import ${csvRows.length} Employees`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirm */}
      <AlertDialog open={!!archiveId} onOpenChange={() => setArchiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the employee from your active roster. Their campaign history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (archiveId && org?.id) {
                  archiveMutation.mutate({ id: archiveId, organizationId: org.id });
                  setArchiveId(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
