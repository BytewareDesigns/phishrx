import { useNavigate } from "react-router-dom";
import { ShieldAlert, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useCampaigns } from "@/hooks/useCampaigns";
import { formatDate } from "@/lib/utils";

interface Props {
  organizationId: string;
  organizationName: string;
}

export function OrgCampaignsTab({ organizationId, organizationName }: Props) {
  const navigate = useNavigate();
  const { data: campaigns, isLoading } = useCampaigns(organizationId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> Campaigns
        </CardTitle>
        <CardDescription>
          All phishing simulation campaigns for {organizationName}.{" "}
          To create a new campaign, click "Impersonate" on the Overview tab.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (campaigns ?? []).length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-12">
            <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            No campaigns yet for this organization.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(campaigns ?? []).map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/dashboard/campaigns/${c.id}`)}
                >
                  <TableCell>
                    <p className="font-medium">{c.name}</p>
                    {c.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{c.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      c.status === "active"    ? "default" :
                      c.status === "completed" ? "success" :
                      c.status === "draft"     ? "outline" : "secondary"
                    } className="capitalize">
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.start_date ? formatDate(c.start_date) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(c.created_at)}
                  </TableCell>
                  <TableCell>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
