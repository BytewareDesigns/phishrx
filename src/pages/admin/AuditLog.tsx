import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, FileText, Search, ChevronDown, ChevronRight,
  Building2, Users, ShieldAlert, FileCode, UserCog,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuditLog, type AuditLogRow } from "@/hooks/useAudit";
import { formatDateTime } from "@/lib/utils";

// ── Action → label + color mapping ──────────────────────────
const ACTION_META: Record<string, { label: string; variant: "default" | "secondary" | "success" | "outline" | "destructive" }> = {
  "org.create":         { label: "Created org",         variant: "success"     },
  "org.update":         { label: "Updated org",         variant: "default"     },
  "org.deactivate":     { label: "Deactivated org",     variant: "destructive" },
  "user.invite":        { label: "Invited user",        variant: "success"     },
  "user.assign":        { label: "Assigned user",       variant: "default"     },
  "user.remove":        { label: "Removed user",        variant: "destructive" },
  "user.update_role":   { label: "Updated role",        variant: "default"     },
  "user.archive":       { label: "Archived user",       variant: "destructive" },
  "campaign.create":    { label: "Created campaign",    variant: "success"     },
  "campaign.update":    { label: "Updated campaign",    variant: "default"     },
  "campaign.launch":    { label: "Launched campaign",   variant: "success"     },
  "campaign.pause":     { label: "Paused campaign",     variant: "secondary"   },
  "campaign.resume":    { label: "Resumed campaign",    variant: "default"     },
  "campaign.cancel":    { label: "Cancelled campaign",  variant: "destructive" },
  "campaign.archive":   { label: "Archived campaign",   variant: "secondary"   },
  "template.create":    { label: "Created template",    variant: "success"     },
  "template.update":    { label: "Updated template",    variant: "default"     },
  "template.delete":    { label: "Deleted template",    variant: "destructive" },
  "employee.create":    { label: "Added employee",      variant: "success"     },
  "employee.archive":   { label: "Removed employee",    variant: "destructive" },
};

const RESOURCE_ICONS: Record<string, React.ElementType> = {
  organization: Building2,
  user:         UserCog,
  campaign:     ShieldAlert,
  template:     FileCode,
  employee:     Users,
};

export default function AuditLog() {
  const navigate = useNavigate();

  const [search,        setSearch]        = useState("");
  const [actionFilter,  setActionFilter]  = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [expanded,      setExpanded]      = useState<Set<string>>(new Set());

  const { data: rows, isLoading } = useAuditLog({
    action:       actionFilter  === "all" ? undefined : actionFilter,
    resourceType: resourceFilter === "all" ? undefined : resourceFilter,
    limit:        500,
  });

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      const actorName = r.actor
        ? `${r.actor.first_name ?? ""} ${r.actor.last_name ?? ""} ${r.actor.email}`.toLowerCase()
        : "";
      return (
        actorName.includes(q) ||
        r.action.toLowerCase().includes(q) ||
        (r.resource_id ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Distinct action values for the filter — derived from actual data
  const actionOptions = useMemo(() => {
    const set = new Set<string>();
    (rows ?? []).forEach((r) => set.add(r.action));
    return Array.from(set).sort();
  }, [rows]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Admin
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <FileText className="h-6 w-6 text-muted-foreground" /> Audit Log
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Every administrative action across the platform · most recent 500 events
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search actor, action, or resource ID…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Action filter */}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actionOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {ACTION_META[a]?.label ?? a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Resource filter */}
            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All resources</SelectItem>
                <SelectItem value="organization">Organizations</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="campaign">Campaigns</SelectItem>
                <SelectItem value="template">Templates</SelectItem>
                <SelectItem value="employee">Employees</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CardDescription>
            {isLoading
              ? "Loading…"
              : `${filtered.length.toLocaleString()} ${filtered.length === 1 ? "event" : "events"}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-16">
              No matching audit events.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Resource ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <AuditRow
                    key={row.id}
                    row={row}
                    expanded={expanded.has(row.id)}
                    onToggle={() => toggleExpand(row.id)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AuditRow({
  row, expanded, onToggle,
}: {
  row: AuditLogRow; expanded: boolean; onToggle: () => void;
}) {
  const actor       = row.actor;
  const actorName   = actor
    ? `${actor.first_name ?? ""} ${actor.last_name ?? ""}`.trim() || actor.email
    : "Unknown";
  const meta        = ACTION_META[row.action] ?? { label: row.action, variant: "outline" as const };
  const ResourceIcon = RESOURCE_ICONS[row.resource_type] ?? FileText;
  const hasPayload  = !!(row.old_data || row.new_data);

  return (
    <>
      <TableRow
        className={hasPayload ? "cursor-pointer" : ""}
        onClick={hasPayload ? onToggle : undefined}
      >
        <TableCell>
          {hasPayload && (
            <span className="inline-flex items-center text-muted-foreground">
              {expanded
                ? <ChevronDown className="h-4 w-4" />
                : <ChevronRight className="h-4 w-4" />}
            </span>
          )}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground tabular-nums">
          {formatDateTime(row.created_at)}
        </TableCell>
        <TableCell>
          <div className="text-sm">
            <p className="font-medium">{actorName}</p>
            {actor && (
              <p className="text-xs text-muted-foreground">{actor.email}</p>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={meta.variant} className="text-xs">{meta.label}</Badge>
        </TableCell>
        <TableCell>
          <span className="inline-flex items-center gap-1.5 text-sm capitalize">
            <ResourceIcon className="h-3.5 w-3.5 text-muted-foreground" />
            {row.resource_type}
          </span>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground font-mono">
          {row.resource_id ? row.resource_id.slice(0, 8) + "…" : "—"}
        </TableCell>
      </TableRow>
      {expanded && hasPayload && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/30">
            <div className="p-3 space-y-3 text-xs">
              {row.old_data ? (
                <div>
                  <p className="font-medium text-rose-700 mb-1">Before</p>
                  <pre className="font-mono bg-background border rounded p-2 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(row.old_data, null, 2)}
                  </pre>
                </div>
              ) : null}
              {row.new_data ? (
                <div>
                  <p className="font-medium text-emerald-700 mb-1">After</p>
                  <pre className="font-mono bg-background border rounded p-2 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(row.new_data, null, 2)}
                  </pre>
                </div>
              ) : null}
              {row.ip_address && (
                <p className="text-muted-foreground">IP: {row.ip_address}</p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
