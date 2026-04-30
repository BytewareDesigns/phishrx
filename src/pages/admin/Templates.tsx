import { useState } from "react";
import {
  Plus, Search, Mail, MessageSquare, Phone, Package, FileText, Globe,
  Loader2, ExternalLink, AlertTriangle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useEmailTemplates, useCreateEmailTemplate,
  useSmsTemplates,   useCreateSmsTemplate,
  useVoiceTemplates, useCreateVoiceTemplate,
  useDirectMailTemplates, useCreateDirectMailTemplate,
} from "@/hooks/useTemplates";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import type {
  EmailTemplate, SmsTemplate, VoiceTemplate, DirectMailTemplate,
} from "@/types";

// ── Schemas ──────────────────────────────────────────────────
const emailSchema = z.object({
  name:       z.string().min(1, "Required"),
  subject:    z.string().min(1, "Required"),
  from_name:  z.string().min(1, "Required"),
  from_email: z.string().email("Valid email required"),
  html_body:  z.string().min(1, "Required"),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});
type EmailForm = z.infer<typeof emailSchema>;

const smsSchema = z.object({
  name:      z.string().min(1, "Required"),
  body:      z.string().min(1, "Required").max(160, "Max 160 chars"),
  sender_id: z.string().optional(),
});
type SmsForm = z.infer<typeof smsSchema>;

const voiceSchema = z.object({
  name:            z.string().min(1, "Required"),
  retell_agent_id: z.string().min(1, "Required"),
  prompt_summary:  z.string().optional(),
});
type VoiceForm = z.infer<typeof voiceSchema>;

const dmSchema = z.object({
  name:                    z.string().min(1, "Required"),
  lob_template_id:         z.string().min(1, "Required"),
  description:             z.string().optional(),
  qr_code_url_placeholder: z.string().optional(),
});
type DmForm = z.infer<typeof dmSchema>;

// ── Card ─────────────────────────────────────────────────────
function GlobalTemplateCard({
  name, subtitle, difficulty, created_at, externalId,
}: {
  name: string; subtitle?: string | null;
  difficulty?: string | null; created_at: string; externalId?: string | null;
}) {
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium line-clamp-1">{name}</CardTitle>
          <div className="flex gap-1 shrink-0">
            <Badge variant="secondary" className="text-xs gap-1">
              <Globe className="h-2.5 w-2.5" /> Global
            </Badge>
            {difficulty && (
              <Badge
                variant={difficulty === "easy" ? "success" : difficulty === "hard" ? "destructive" : "default"}
                className="capitalize text-xs"
              >
                {difficulty}
              </Badge>
            )}
          </div>
        </div>
        {subtitle && (
          <CardDescription className="text-xs line-clamp-2">{subtitle}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-1">
        {externalId && (
          <p className="text-xs text-muted-foreground font-mono truncate">{externalId}</p>
        )}
        <p className="text-xs text-muted-foreground">Added {formatDate(created_at)}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ label, onAdd, icon: Icon }: { label: string; onAdd: () => void; icon: React.ElementType }) {
  return (
    <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/40" />
      <p className="text-muted-foreground text-sm">No global {label} templates yet.</p>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" /> Create Global Template
      </Button>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <>{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}</>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function AdminTemplates() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("email");
  const [search, setSearch]       = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [smsOpen, setSmsOpen]     = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [dmOpen, setDmOpen]       = useState(false);

  // Pass undefined → these hooks fetch ONLY is_global=true rows
  const { data: emailTemplates, isLoading: loadingEmail } = useEmailTemplates(undefined);
  const { data: smsTemplates,   isLoading: loadingSms   } = useSmsTemplates(undefined);
  const { data: voiceTemplates, isLoading: loadingVoice } = useVoiceTemplates(undefined);
  const { data: dmTemplates,    isLoading: loadingDm    } = useDirectMailTemplates(undefined);

  const createEmail = useCreateEmailTemplate();
  const createSms   = useCreateSmsTemplate();
  const createVoice = useCreateVoiceTemplate();
  const createDm    = useCreateDirectMailTemplate();

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { name: "", subject: "", from_name: "", from_email: "", html_body: "", difficulty: "medium" },
  });
  const smsForm = useForm<SmsForm>({
    resolver: zodResolver(smsSchema),
    defaultValues: { name: "", body: "", sender_id: "" },
  });
  const voiceForm = useForm<VoiceForm>({
    resolver: zodResolver(voiceSchema),
    defaultValues: { name: "", retell_agent_id: "", prompt_summary: "" },
  });
  const dmForm = useForm<DmForm>({
    resolver: zodResolver(dmSchema),
    defaultValues: { name: "", lob_template_id: "", description: "", qr_code_url_placeholder: "" },
  });

  const filterFn = <T extends { name: string }>(list: T[] | undefined) =>
    (list ?? [])
      .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
      // only show genuinely global rows here
      .filter((t: any) => t.is_global === true);

  // ── Handlers — every create writes is_global=true, organization_id=null ──
  const handleCreateEmail = async (data: EmailForm) => {
    if (!user?.id) return;
    await createEmail.mutateAsync({
      name:             data.name,
      subject:          data.subject,
      from_name:        data.from_name,
      from_email:       data.from_email,
      html_body:        data.html_body,
      difficulty:       data.difficulty,
      organization_id:  null,
      created_by:       user.id,
      is_global:        true,
      landing_scenario: null,
    });
    setEmailOpen(false);
    emailForm.reset();
  };

  const handleCreateSms = async (data: SmsForm) => {
    if (!user?.id) return;
    await createSms.mutateAsync({
      name:                     data.name,
      body:                     data.body,
      sender_id:                data.sender_id || null,
      organization_id:          null,
      created_by:               user.id,
      is_global:                true,
      tracking_url_placeholder: null,
    });
    setSmsOpen(false);
    smsForm.reset();
  };

  const handleCreateVoice = async (data: VoiceForm) => {
    if (!user?.id) return;
    await createVoice.mutateAsync({
      name:            data.name,
      retell_agent_id: data.retell_agent_id,
      prompt_summary:  data.prompt_summary || null,
      organization_id: null,
      created_by:      user.id,
      is_global:       true,
    });
    setVoiceOpen(false);
    voiceForm.reset();
  };

  const handleCreateDm = async (data: DmForm) => {
    if (!user?.id) return;
    await createDm.mutateAsync({
      name:                    data.name,
      lob_template_id:         data.lob_template_id,
      description:             data.description || null,
      qr_code_url_placeholder: data.qr_code_url_placeholder || null,
      organization_id:         null,
      created_by:              user.id,
      is_global:               true,
    });
    setDmOpen(false);
    dmForm.reset();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Global Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Platform-wide phishing simulation templates available to every organization.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <Globe className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Global templates appear in every org's template selector
              </p>
              <p className="text-xs text-blue-700/80 mt-0.5">
                Use these for ready-to-go simulations new orgs can launch on day one.
                Org-specific templates created by training admins remain scoped to their org.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search global templates…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-11">
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4 text-phishing" /> Phishing
            <Badge variant="secondary" className="ml-1 text-xs px-1.5 h-4 rounded-sm">
              {filterFn(emailTemplates).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-2">
            <MessageSquare className="h-4 w-4 text-smishing" /> Smishing
            <Badge variant="secondary" className="ml-1 text-xs px-1.5 h-4 rounded-sm">
              {filterFn(smsTemplates).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="voice" className="gap-2">
            <Phone className="h-4 w-4 text-vishing" /> Vishing
            <Badge variant="secondary" className="ml-1 text-xs px-1.5 h-4 rounded-sm">
              {filterFn(voiceTemplates).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="direct_mail" className="gap-2">
            <Package className="h-4 w-4 text-dishing" /> Dishing
            <Badge variant="secondary" className="ml-1 text-xs px-1.5 h-4 rounded-sm">
              {filterFn(dmTemplates).length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Phishing */}
        <TabsContent value="email" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setEmailOpen(true)}>
              <Plus className="h-4 w-4" /> New Phishing Template
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingEmail ? <SkeletonGrid /> :
              filterFn(emailTemplates).length === 0
                ? <EmptyState label="phishing" onAdd={() => setEmailOpen(true)} icon={Mail} />
                : filterFn(emailTemplates).map((t: EmailTemplate) => (
                    <GlobalTemplateCard
                      key={t.id}
                      name={t.name}
                      subtitle={t.subject}
                      difficulty={t.difficulty}
                      created_at={t.created_at}
                    />
                  ))
            }
          </div>
        </TabsContent>

        {/* Smishing */}
        <TabsContent value="sms" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setSmsOpen(true)}>
              <Plus className="h-4 w-4" /> New Smishing Template
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingSms ? <SkeletonGrid /> :
              filterFn(smsTemplates).length === 0
                ? <EmptyState label="smishing" onAdd={() => setSmsOpen(true)} icon={MessageSquare} />
                : filterFn(smsTemplates).map((t: SmsTemplate) => (
                    <GlobalTemplateCard
                      key={t.id}
                      name={t.name}
                      subtitle={t.body?.slice(0, 80)}
                      created_at={t.created_at}
                    />
                  ))
            }
          </div>
        </TabsContent>

        {/* Vishing */}
        <TabsContent value="voice" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setVoiceOpen(true)}>
              <Plus className="h-4 w-4" /> New Vishing Template
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingVoice ? <SkeletonGrid /> :
              filterFn(voiceTemplates).length === 0
                ? <EmptyState label="vishing" onAdd={() => setVoiceOpen(true)} icon={Phone} />
                : filterFn(voiceTemplates).map((t: VoiceTemplate) => (
                    <GlobalTemplateCard
                      key={t.id}
                      name={t.name}
                      subtitle={t.prompt_summary}
                      externalId={t.retell_agent_id}
                      created_at={t.created_at}
                    />
                  ))
            }
          </div>
        </TabsContent>

        {/* Dishing */}
        <TabsContent value="direct_mail" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setDmOpen(true)}>
              <Plus className="h-4 w-4" /> New Dishing Template
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingDm ? <SkeletonGrid /> :
              filterFn(dmTemplates).length === 0
                ? <EmptyState label="direct mail" onAdd={() => setDmOpen(true)} icon={Package} />
                : filterFn(dmTemplates).map((t: DirectMailTemplate) => (
                    <GlobalTemplateCard
                      key={t.id}
                      name={t.name}
                      subtitle={t.description}
                      externalId={t.lob_template_id}
                      created_at={t.created_at}
                    />
                  ))
            }
          </div>
        </TabsContent>
      </Tabs>

      {/* Email dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Global Phishing Template</DialogTitle>
            <DialogDescription>Available to every organization on the platform.</DialogDescription>
          </DialogHeader>
          <form onSubmit={emailForm.handleSubmit(handleCreateEmail)} className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input placeholder="IT Password Reset" {...emailForm.register("name")} />
              {emailForm.formState.errors.name && (
                <p className="text-xs text-destructive">{emailForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Sender Name *</Label>
                <Input placeholder="IT Support" {...emailForm.register("from_name")} />
              </div>
              <div className="space-y-2">
                <Label>Sender Email *</Label>
                <Input type="email" placeholder="itsupport@helpdesk-corp.com" {...emailForm.register("from_email")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject Line *</Label>
              <Input placeholder="Action Required: Reset Your Password" {...emailForm.register("subject")} />
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                rows={8}
                className="font-mono text-xs"
                placeholder={"<p>Dear {{first_name}},</p>\n<p><a href=\"{{tracking_link}}\">Reset Now</a></p>"}
                {...emailForm.register("html_body")}
              />
              <p className="text-xs text-muted-foreground">
                Merge tags: <code className="bg-muted px-1 rounded">{"{{first_name}}"}</code>
                {" "}<code className="bg-muted px-1 rounded">{"{{last_name}}"}</code>
                {" "}<code className="bg-muted px-1 rounded">{"{{tracking_link}}"}</code>
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createEmail.isPending}>
                {createEmail.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving…</> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* SMS dialog */}
      <Dialog open={smsOpen} onOpenChange={setSmsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Global Smishing Template</DialogTitle>
            <DialogDescription>Max 160 characters. Available to every org.</DialogDescription>
          </DialogHeader>
          <form onSubmit={smsForm.handleSubmit(handleCreateSms)} className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input {...smsForm.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>Sender ID / Number</Label>
              <Input placeholder="HR-Dept or +15551234567" {...smsForm.register("sender_id")} />
            </div>
            <div className="space-y-2">
              <Label>Body *</Label>
              <Textarea rows={4} {...smsForm.register("body")} />
              <p className="text-xs text-muted-foreground">
                Merge tags: <code className="bg-muted px-1 rounded">{"{{first_name}}"}</code>
                {" "}<code className="bg-muted px-1 rounded">{"{{tracking_link}}"}</code>
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSmsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createSms.isPending}>
                {createSms.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving…</> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Voice dialog */}
      <Dialog open={voiceOpen} onOpenChange={setVoiceOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Global Vishing Template</DialogTitle>
            <DialogDescription>
              Voice templates wrap a Retell AI agent. Configure the agent prompt in
              Retell first, then paste the agent ID here.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={voiceForm.handleSubmit(handleCreateVoice)} className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input placeholder="IT Help Desk Impersonation" {...voiceForm.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>Retell Agent ID *</Label>
              <Input
                placeholder="agent_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="font-mono text-xs"
                {...voiceForm.register("retell_agent_id")}
              />
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                Find your agent ID in the{" "}
                <a
                  href="https://app.retellai.com/dashboard/agents"
                  target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Retell dashboard → Agents
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Prompt Summary</Label>
              <Textarea
                rows={3}
                placeholder="Brief description of what the agent says (for admin reference)"
                {...voiceForm.register("prompt_summary")}
              />
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              The Retell agent itself is configured outside PhishRx. Make sure it's
              published before referencing it here.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVoiceOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createVoice.isPending}>
                {createVoice.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving…</> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Direct Mail dialog */}
      <Dialog open={dmOpen} onOpenChange={setDmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Global Dishing Template</DialogTitle>
            <DialogDescription>
              Direct-mail templates reference a printable design hosted in Lob.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={dmForm.handleSubmit(handleCreateDm)} className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input placeholder="Fake IRS Notice" {...dmForm.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>Lob Template ID *</Label>
              <Input
                placeholder="tmpl_xxxxxxxxxxxxxxxx"
                className="font-mono text-xs"
                {...dmForm.register("lob_template_id")}
              />
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                Find template IDs in the{" "}
                <a
                  href="https://dashboard.lob.com/#/templates"
                  target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Lob dashboard → Templates
                </a>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={2} {...dmForm.register("description")} />
            </div>
            <div className="space-y-2">
              <Label>QR Code URL Placeholder</Label>
              <Input placeholder="{{qr_url}}" {...dmForm.register("qr_code_url_placeholder")} />
              <p className="text-xs text-muted-foreground">
                Merge variable in your Lob template that should receive the tracking URL.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDmOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createDm.isPending}>
                {createDm.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving…</> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
