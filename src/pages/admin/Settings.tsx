import { Settings2, ShieldCheck, Globe, Bell } from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SettingRowProps {
  label: string;
  description: string;
  value: string;
  badge?: "default" | "secondary" | "outline";
}

function SettingRow({ label, description, value, badge = "secondary" }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Badge variant={badge}>{value}</Badge>
    </div>
  );
}

export default function PlatformSettings() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Platform Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Global configuration for the PhishRx platform
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Security</CardTitle>
            </div>
            <CardDescription>Authentication and access control settings</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingRow
              label="Multi-factor Authentication"
              description="Required for all platform admin accounts"
              value="Required"
              badge="default"
            />
            <Separator />
            <SettingRow
              label="Session Timeout"
              description="Automatic sign-out after inactivity"
              value="8 hours"
            />
            <Separator />
            <SettingRow
              label="SSO Provider"
              description="Medcurity identity provider integration"
              value="Active"
              badge="default"
            />
            <Separator />
            <SettingRow
              label="Password Policy"
              description="Minimum password complexity requirements"
              value="Strong"
            />
          </CardContent>
        </Card>

        {/* Platform */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Platform</CardTitle>
            </div>
            <CardDescription>Core platform behaviour and limits</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingRow
              label="Environment"
              description="Current deployment environment"
              value={import.meta.env.PROD ? "Production" : "Staging"}
              badge={import.meta.env.PROD ? "default" : "secondary"}
            />
            <Separator />
            <SettingRow
              label="API Version"
              description="Medcurity LMS integration API version"
              value="v2"
            />
            <Separator />
            <SettingRow
              label="Max Campaign Targets"
              description="Maximum employees per campaign"
              value="Unlimited"
            />
            <Separator />
            <SettingRow
              label="Data Retention"
              description="Campaign event data retention period"
              value="2 years"
            />
          </CardContent>
        </Card>

        {/* Channels */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Simulation Channels</CardTitle>
            </div>
            <CardDescription>Available phishing simulation delivery channels</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingRow
              label="Email (Phishing)"
              description="SMTP phishing email simulations"
              value="Enabled"
              badge="default"
            />
            <Separator />
            <SettingRow
              label="SMS (Smishing)"
              description="Text message smishing simulations"
              value="Enabled"
              badge="default"
            />
            <Separator />
            <SettingRow
              label="Voice (Vishing)"
              description="AI-powered voice vishing via Retell"
              value="Enabled"
              badge="default"
            />
            <Separator />
            <SettingRow
              label="Direct Mail (Dishing)"
              description="Physical mail campaigns via Lob"
              value="Enabled"
              badge="default"
            />
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Notifications</CardTitle>
            </div>
            <CardDescription>Platform-level alert and reporting settings</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingRow
              label="Campaign Completion Alerts"
              description="Notify admins when campaigns finish"
              value="Enabled"
              badge="default"
            />
            <Separator />
            <SettingRow
              label="High Catch-Rate Alerts"
              description="Alert when catch rate exceeds threshold"
              value="&gt; 40%"
            />
            <Separator />
            <SettingRow
              label="Weekly Summary Reports"
              description="Automated weekly digest emails"
              value="Enabled"
              badge="default"
            />
            <Separator />
            <SettingRow
              label="Integration Sync Alerts"
              description="Medcurity LMS sync failure notifications"
              value="Enabled"
              badge="default"
            />
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Platform settings are managed via environment configuration.
        Contact your system administrator to make changes.
      </p>
    </div>
  );
}
