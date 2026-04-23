import { Mail, MessageSquare, Phone, MailIcon, TrendingUp, Users, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

const CHANNEL_CARDS = [
  {
    label:   "Phishing",
    channel: "email",
    icon:    Mail,
    color:   "text-phishing bg-phishing-light",
    stat:    "—",
    desc:    "Email simulations",
  },
  {
    label:   "Smishing",
    channel: "sms",
    icon:    MessageSquare,
    color:   "text-smishing bg-smishing-light",
    stat:    "—",
    desc:    "SMS simulations",
  },
  {
    label:   "Vishing",
    channel: "voice",
    icon:    Phone,
    color:   "text-vishing bg-vishing-light",
    stat:    "—",
    desc:    "Voice call simulations",
  },
  {
    label:   "Dishing",
    channel: "direct_mail",
    icon:    MailIcon,
    color:   "text-dishing bg-dishing-light",
    stat:    "—",
    desc:    "Direct mail simulations",
  },
];

const SUMMARY_CARDS = [
  { label: "Active Employees", value: "—", icon: Users,        color: "text-blue-600 bg-blue-50" },
  { label: "Catch Rate",       value: "—", icon: TrendingUp,   color: "text-amber-600 bg-amber-50" },
  { label: "Campaigns Run",    value: "—", icon: ShieldCheck,  color: "text-emerald-600 bg-emerald-50" },
];

export default function TrainingAdminDashboard() {
  const { profile } = useAuth();

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Campaign Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, {profile?.first_name ?? "Admin"}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">Training Admin</Badge>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SUMMARY_CARDS.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <div className={`rounded-md p-2 ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Channel breakdown */}
      <div>
        <h2 className="text-base font-semibold mb-3">Channels</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {CHANNEL_CARDS.map((card) => (
            <Card key={card.channel} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <div className={`rounded-md p-2 ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{card.stat}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Campaigns</CardTitle>
          <CardDescription>Your latest phishing simulation campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No campaigns yet.{" "}
            <a href="/dashboard/campaigns/new" className="ml-1 text-primary hover:underline">
              Create your first campaign →
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
