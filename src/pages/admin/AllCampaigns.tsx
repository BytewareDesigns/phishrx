import { useState } from "react";
import { Search, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Campaign, CampaignStatus } from "@/types";
import { formatDate } from "@/lib/utils";

type CampaignWithOrg = Campaign & { organizations: { id: string; name: string } | null };

function useAllCampaigns() {
  return useQuery({
    queryKey: ["all-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*, organizations(id, name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CampaignWithOrg[];
    },
  });
}

const STATUS_VARIANT: Record<CampaignStatus, "default" | "secondary" | "outline" | "success" | "destructive"> = {
  draft:      "outline",
  scheduled:  "secondary",
  active:     "default",
  paused:     "secondary",
  completed:  "success",
  cancelled:  "destructive",
  archived:   "secondary",
};

const STATUS_OPTIONS: Array<{ value: CampaignStatus | "all"; label: string }> = [
  { value: "all",       label: "All Statuses" },
  { value: "draft",     label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "active",    label: "Active" },
  { value: "paused",    label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AllCampaigns() {
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all");
  const [orgFilter,    setOrgFilter]    = useState<string>("all");

  const { data: campaigns, isLoading } = useAllCampaigns();

  // Build unique org list from campaign data
  const orgs = Array.from(
    new Map((campaigns ?? [])
      .filter(c => c.organizations)
      .map(c => [c.organizations!.id, c.organizations!.name])
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  const filtered = (campaigns ?? []).filter((c) => {
    const matchSearch  = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.organizations?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus  = statusFilter === "all" || c.status === statusFilter;
    const matchOrg     = orgFilter    === "all" || c.organization_id === orgFilter;
    return matchSearch && matchStatus && matchOrg;
  });

  const totalActive    = (campaigns ?? []).filter(c => c.status === "active").length;
  const totalCompleted = (campaigns ?? []).filter(c => c.status === "completed").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">All Campaigns</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Platform-wide view of all phishing simulation campaigns
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Campaigns</span>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{campaigns?.length ?? "—"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <span className="text-sm text-muted-foreground">Active</span>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{totalActive}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <span className="text-sm text-muted-foreground">Completed</span>
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalCompleted}</p></CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns or organizations…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CampaignStatus | "all")}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {orgs.map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      No campaigns found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {c.organizations?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {c.start_date ? formatDate(c.start_date) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(c.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
