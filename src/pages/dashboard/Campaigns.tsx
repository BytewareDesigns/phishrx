import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, ShieldAlert, MoreHorizontal, Mail, MessageSquare, Phone, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCampaigns, useUpdateCampaign, useLaunchCampaign } from "@/hooks/useCampaigns";
import { useMyOrganization } from "@/hooks/useMyOrganization";
import { formatDate } from "@/lib/utils";
import type { Campaign } from "@/types";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "outline" | "destructive"> = {
  draft:     "outline",
  active:    "default",
  completed: "success",
  archived:  "secondary",
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email:       <Mail      className="h-3.5 w-3.5" />,
  sms:         <MessageSquare className="h-3.5 w-3.5" />,
  voice:       <Phone     className="h-3.5 w-3.5" />,
  direct_mail: <Package   className="h-3.5 w-3.5" />,
};

const CHANNEL_COLORS: Record<string, string> = {
  email:       "bg-phishing/10 text-phishing border-phishing/20",
  sms:         "bg-smishing/10 text-smishing border-smishing/20",
  voice:       "bg-vishing/10 text-vishing border-vishing/20",
  direct_mail: "bg-dishing/10 text-dishing border-dishing/20",
};

function ChannelBadge({ channel }: { channel: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${CHANNEL_COLORS[channel] ?? "bg-muted text-muted-foreground"}`}
    >
      {CHANNEL_ICONS[channel]}
      {channel === "direct_mail" ? "Dishing" : channel === "email" ? "Phishing" : channel === "sms" ? "Smishing" : "Vishing"}
    </span>
  );
}

export default function Campaigns() {
  const navigate = useNavigate();
  const [search,      setSearch]      = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [archiveCampaign, setArchiveCampaign] = useState<Campaign | null>(null);

  const { data: org } = useMyOrganization();
  const { data: campaigns, isLoading } = useCampaigns(org?.id);
  const updateMutation = useUpdateCampaign();
  const launchMutation = useLaunchCampaign();

  const filtered = (campaigns ?? []).filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all:       campaigns?.length ?? 0,
    draft:     campaigns?.filter(c => c.status === "draft").length ?? 0,
    active:    campaigns?.filter(c => c.status === "active").length ?? 0,
    completed: campaigns?.filter(c => c.status === "completed").length ?? 0,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Phishing simulation campaigns for {org?.name ?? "your organization"}
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard/campaigns/new")}>
          <Plus className="h-4 w-4" /> New Campaign
        </Button>
      </div>

      {/* Quick filters */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "draft", "active", "completed"] as const).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            className="capitalize"
            onClick={() => setStatusFilter(s)}
          >
            {s} ({counts[s]})
          </Button>
        ))}
      </div>

      {/* Table card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-16">
                      <div className="flex flex-col items-center gap-2">
                        <ShieldAlert className="h-8 w-8 text-muted-foreground/40" />
                        {search ? "No campaigns match your search." : "No campaigns yet. Create your first phishing simulation."}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((campaign) => (
                    <TableRow
                      key={campaign.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/dashboard/campaigns/${campaign.id}`)}
                    >
                      <TableCell>
                        <p className="font-medium">{campaign.name}</p>
                        {campaign.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{campaign.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {/* Channels are loaded in the detail hook; show placeholder if not joined */}
                        <span className="text-xs text-muted-foreground">—</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[campaign.status] ?? "secondary"} className="capitalize">
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {campaign.start_date ? formatDate(campaign.start_date) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(campaign.created_at)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/campaigns/${campaign.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            {campaign.status === "draft" && (
                              <DropdownMenuItem
                                onClick={() => launchMutation.mutate(campaign.id)}
                              >
                                Launch
                              </DropdownMenuItem>
                            )}
                            {(campaign.status === "draft" || campaign.status === "active") && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setArchiveCampaign(campaign)}
                              >
                                Archive
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

      {/* Archive confirm */}
      <AlertDialog open={!!archiveCampaign} onOpenChange={() => setArchiveCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              "{archiveCampaign?.name}" will be archived and no further messages will be sent.
              Historical data is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (archiveCampaign) {
                  updateMutation.mutate({ id: archiveCampaign.id, status: "archived" });
                  setArchiveCampaign(null);
                }
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
