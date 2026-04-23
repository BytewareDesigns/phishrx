import { useState } from "react";
import { Plus, Search, Mail, MessageSquare, Phone, Package, FileText, Globe, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useEmailTemplates, useCreateEmailTemplate,
  useSmsTemplates,   useCreateSmsTemplate,
  useVoiceTemplates,
  useDirectMailTemplates,
} from "@/hooks/useTemplates";
import { useMyOrganization } from "@/hooks/useMyOrganization";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import type { EmailTemplate, SmsTemplate, VoiceTemplate, DirectMailTemplate } from "@/types";

// ── Schemas ──────────────────────────────────────────────────
const emailSchema = z.object({
  name:        z.string().min(1, "Required"),
  subject:     z.string().min(1, "Required"),
  from_name:   z.string().min(1, "Required"),
  from_email:  z.string().email("Valid email required"),
  html_body:   z.string().min(1, "Required"),
  difficulty:  z.enum(["easy", "medium", "hard"]).default("medium"),
});
type EmailForm = z.infer<typeof emailSchema>;

const smsSchema = z.object({
  name:      z.string().min(1, "Required"),
  body:      z.string().min(1, "Required").max(160, "Max 160 chars"),
  sender_id: z.string().optional(),
});
type SmsForm = z.infer<typeof smsSchema>;

// ── Difficulty badge ─────────────────────────────────────────
function DifficultyBadge({ level }: { level?: string | null }) {
  if (!level) return null;
  const variant =
    level === "easy"   ? "success"     :
    level === "hard"   ? "destructive" : "default";
  return <Badge variant={variant} className="capitalize text-xs">{level}</Badge>;
}

// ── Template card ────────────────────────────────────────────
function TemplateCard({
  name, description, isGlobal, difficulty, created_at,
}: {
  name: string; description?: string | null; isGlobal?: boolean;
  difficulty?: string | null; created_at: string;
}) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium line-clamp-1">{name}</CardTitle>
          <div className="flex gap-1 shrink-0">
            {isGlobal && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Globe className="h-2.5 w-2.5" /> Global
              </Badge>
            )}
            <DifficultyBadge level={difficulty} />
          </div>
        </div>
        {description && (
          <CardDescription className="text-xs line-clamp-2">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">Added {formatDate(created_at)}</p>
      </CardContent>
    </Card>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState({ label, onAdd }: { label: string; onAdd?: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center">
      <FileText className="h-10 w-10 text-muted-foreground/40" />
      <p className="text-muted-foreground text-sm">No {label} templates yet.</p>
      {onAdd && (
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Create Template
        </Button>
      )}
    </div>
  );
}

// ── Skeleton grid ─────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <>
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-lg" />
      ))}
    </>
  );
}

// ── Main component ────────────────────────────────────────────
export default function Templates() {
  const [activeTab, setActiveTab] = useState("email");
  const [search,    setSearch]    = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [smsOpen,   setSmsOpen]   = useState(false);

  const { user }    = useAuth();
  const { data: org } = useMyOrganization();

  const { data: emailTemplates, isLoading: loadingEmail } = useEmailTemplates(org?.id);
  const { data: smsTemplates,   isLoading: loadingSms   } = useSmsTemplates(org?.id);
  const { data: voiceTemplates, isLoading: loadingVoice } = useVoiceTemplates(org?.id);
  const { data: dmTemplates,    isLoading: loadingDm    } = useDirectMailTemplates(org?.id);

  const createEmail = useCreateEmailTemplate();
  const createSms   = useCreateSmsTemplate();

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { name: "", subject: "", from_name: "", from_email: "", html_body: "", difficulty: "medium" },
  });

  const smsForm = useForm<SmsForm>({
    resolver: zodResolver(smsSchema),
    defaultValues: { name: "", body: "", sender_id: "" },
  });

  // Generic filter
  const filterFn = <T extends { name: string }>(list: T[] | undefined) =>
    (list ?? []).filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  // ── Submit handlers ─────────────────────────────────────────
  const handleCreateEmail = async (data: EmailForm) => {
    if (!org?.id || !user?.id) return;
    await createEmail.mutateAsync({
      name:             data.name,
      subject:          data.subject,
      from_name:        data.from_name,
      from_email:       data.from_email,
      html_body:        data.html_body,
      difficulty:       data.difficulty,
      organization_id:  org.id,
      created_by:       user.id,
      is_global:        false,
      landing_scenario: null,
    });
    setEmailOpen(false);
    emailForm.reset();
  };

  const handleCreateSms = async (data: SmsForm) => {
    if (!org?.id || !user?.id) return;
    await createSms.mutateAsync({
      name:                    data.name,
      body:                    data.body,
      sender_id:               data.sender_id || null,
      organization_id:         org.id,
      created_by:              user.id,
      is_global:               false,
      tracking_url_placeholder: null,
    });
    setSmsOpen(false);
    smsForm.reset();
  };

  const tabConfig = [
    { value: "email",       label: "Phishing",  icon: <Mail          className="h-4 w-4" />, color: "text-phishing",  count: emailTemplates?.length },
    { value: "sms",         label: "Smishing",  icon: <MessageSquare className="h-4 w-4" />, color: "text-smishing",  count: smsTemplates?.length   },
    { value: "voice",       label: "Vishing",   icon: <Phone         className="h-4 w-4" />, color: "text-vishing",   count: voiceTemplates?.length  },
    { value: "direct_mail", label: "Dishing",   icon: <Package       className="h-4 w-4" />, color: "text-dishing",   count: dmTemplates?.length     },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage phishing simulation message templates
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "email" && (
            <Button onClick={() => setEmailOpen(true)}>
              <Plus className="h-4 w-4" /> New Phishing Template
            </Button>
          )}
          {activeTab === "sms" && (
            <Button onClick={() => setSmsOpen(true)}>
              <Plus className="h-4 w-4" /> New Smishing Template
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-11">
          {tabConfig.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-2">
              <span className={t.color}>{t.icon}</span>
              {t.label}
              {t.count !== undefined && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 h-4 rounded-sm">{t.count}</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Phishing (email) */}
        <TabsContent value="email" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingEmail ? <SkeletonGrid /> :
              filterFn(emailTemplates).length === 0
                ? <EmptyState label="phishing" onAdd={() => setEmailOpen(true)} />
                : filterFn(emailTemplates).map((t: EmailTemplate) => (
                    <TemplateCard
                      key={t.id}
                      name={t.name}
                      description={t.subject}
                      isGlobal={t.is_global}
                      difficulty={t.difficulty}
                      created_at={t.created_at}
                    />
                  ))
            }
          </div>
        </TabsContent>

        {/* Smishing (SMS) */}
        <TabsContent value="sms" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingSms ? <SkeletonGrid /> :
              filterFn(smsTemplates).length === 0
                ? <EmptyState label="smishing" onAdd={() => setSmsOpen(true)} />
                : filterFn(smsTemplates).map((t: SmsTemplate) => (
                    <TemplateCard
                      key={t.id}
                      name={t.name}
                      description={t.body?.slice(0, 80)}
                      isGlobal={t.is_global}
                      created_at={t.created_at}
                    />
                  ))
            }
          </div>
        </TabsContent>

        {/* Vishing (voice) */}
        <TabsContent value="voice" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingVoice ? <SkeletonGrid /> :
              filterFn(voiceTemplates).length === 0 ? (
                <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center">
                  <Phone className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">No vishing templates yet.</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Voice templates are configured via the Retell AI integration. Contact your platform admin to add voice templates.
                  </p>
                </div>
              ) : filterFn(voiceTemplates).map((t: VoiceTemplate) => (
                <TemplateCard
                  key={t.id}
                  name={t.name}
                  description={t.prompt_summary}
                  isGlobal={t.is_global}
                  created_at={t.created_at}
                />
              ))
            }
          </div>
        </TabsContent>

        {/* Dishing (direct mail) */}
        <TabsContent value="direct_mail" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingDm ? <SkeletonGrid /> :
              filterFn(dmTemplates).length === 0 ? (
                <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center">
                  <Package className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">No dishing templates yet.</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Direct mail templates are configured via the Lob integration. Contact your platform admin to add direct mail templates.
                  </p>
                </div>
              ) : filterFn(dmTemplates).map((t: DirectMailTemplate) => (
                <TemplateCard
                  key={t.id}
                  name={t.name}
                  description={t.description}
                  isGlobal={t.is_global}
                  created_at={t.created_at}
                />
              ))
            }
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Create Email Template Dialog ── */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Phishing Template</DialogTitle>
            <DialogDescription>Create a simulated phishing email template.</DialogDescription>
          </DialogHeader>
          <form onSubmit={emailForm.handleSubmit(handleCreateEmail)} className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input placeholder="IT Password Reset" {...emailForm.register("name")} />
              {emailForm.formState.errors.name && <p className="text-xs text-destructive">{emailForm.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Sender Name *</Label>
                <Input placeholder="IT Support" {...emailForm.register("from_name")} />
                {emailForm.formState.errors.from_name && <p className="text-xs text-destructive">{emailForm.formState.errors.from_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Sender Email *</Label>
                <Input type="email" placeholder="itsupport@company-helpdesk.com" {...emailForm.register("from_email")} />
                {emailForm.formState.errors.from_email && <p className="text-xs text-destructive">{emailForm.formState.errors.from_email.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject Line *</Label>
              <Input placeholder="Action Required: Reset Your Password" {...emailForm.register("subject")} />
              {emailForm.formState.errors.subject && <p className="text-xs text-destructive">{emailForm.formState.errors.subject.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...emailForm.register("difficulty")}
              >
                <option value="easy">Easy — obvious red flags</option>
                <option value="medium">Medium — some red flags</option>
                <option value="hard">Hard — very convincing</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>HTML Body *</Label>
              <Textarea
                placeholder={"<p>Dear {{first_name}},</p>\n<p>Please click the link below: <a href=\"{{tracking_link}}\">Reset Now</a></p>"}
                rows={8}
                className="font-mono text-xs"
                {...emailForm.register("html_body")}
              />
              {emailForm.formState.errors.html_body && <p className="text-xs text-destructive">{emailForm.formState.errors.html_body.message}</p>}
              <p className="text-xs text-muted-foreground">
                Merge tags: <code className="bg-muted px-1 rounded">{"{{first_name}}"}</code>{" "}
                <code className="bg-muted px-1 rounded">{"{{last_name}}"}</code>{" "}
                <code className="bg-muted px-1 rounded">{"{{tracking_link}}"}</code>
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setEmailOpen(false); emailForm.reset(); }}>Cancel</Button>
              <Button type="submit" disabled={createEmail.isPending}>
                {createEmail.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving…</>
                  : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Create SMS Template Dialog ── */}
      <Dialog open={smsOpen} onOpenChange={setSmsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Smishing Template</DialogTitle>
            <DialogDescription>Create a simulated SMS phishing template (max 160 characters).</DialogDescription>
          </DialogHeader>
          <form onSubmit={smsForm.handleSubmit(handleCreateSms)} className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input placeholder="HR Benefits Update" {...smsForm.register("name")} />
              {smsForm.formState.errors.name && <p className="text-xs text-destructive">{smsForm.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Sender ID / Number</Label>
              <Input placeholder="HR-Dept or +15551234567" {...smsForm.register("sender_id")} />
            </div>
            <div className="space-y-2">
              <Label>Message Body *</Label>
              <Textarea
                placeholder={"Hi {{first_name}}, your benefits enrollment closes today. Click: {{tracking_link}}"}
                rows={4}
                {...smsForm.register("body")}
              />
              {smsForm.formState.errors.body && <p className="text-xs text-destructive">{smsForm.formState.errors.body.message}</p>}
              <p className="text-xs text-muted-foreground">
                Merge tags: <code className="bg-muted px-1 rounded">{"{{first_name}}"}</code>{" "}
                <code className="bg-muted px-1 rounded">{"{{tracking_link}}"}</code>
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setSmsOpen(false); smsForm.reset(); }}>Cancel</Button>
              <Button type="submit" disabled={createSms.isPending}>
                {createSms.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving…</>
                  : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
