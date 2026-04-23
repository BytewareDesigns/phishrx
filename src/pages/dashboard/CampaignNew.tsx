import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Mail, MessageSquare, Phone, MailOpen } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMyOrganization } from "@/hooks/useMyOrganization";
import { useEmployees } from "@/hooks/useEmployees";
import { useEmailTemplates, useSmsTemplates, useVoiceTemplates, useDirectMailTemplates } from "@/hooks/useTemplates";
import { useCreateCampaign, useAddCampaignChannels, useSetCampaignTargets, useLaunchCampaign } from "@/hooks/useCampaigns";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────
type ChannelKey = "email" | "sms" | "voice" | "direct_mail";

interface WizardState {
  name:        string;
  description: string;
  channels:    ChannelKey[];
  templates: {
    email?:       string;
    sms?:         string;
    voice?:       string;
    direct_mail?: string;
  };
  targetIds:  string[];
  startDate:  string;
  endDate:    string;
}

// ── Step definitions ─────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Details"   },
  { id: 2, label: "Channels"  },
  { id: 3, label: "Templates" },
  { id: 4, label: "Targets"   },
  { id: 5, label: "Schedule"  },
  { id: 6, label: "Review"    },
];

const CHANNEL_CONFIG: Record<ChannelKey, { label: string; icon: React.ElementType; color: string; desc: string }> = {
  email:       { label: "Phishing",  icon: Mail,        color: "text-phishing bg-phishing-light border-phishing/20",  desc: "Email phishing simulations via SendGrid"   },
  sms:         { label: "Smishing",  icon: MessageSquare, color: "text-smishing bg-smishing-light border-smishing/20", desc: "SMS smishing simulations via Twilio"       },
  voice:       { label: "Vishing",   icon: Phone,       color: "text-vishing bg-vishing-light border-vishing/20",    desc: "Voice call simulations via Retell AI"      },
  direct_mail: { label: "Dishing",   icon: MailOpen,    color: "text-dishing bg-dishing-light border-dishing/20",    desc: "Direct mail simulations via Lob"          },
};

// ── Step 1: Details schema ────────────────────────────────────
const detailsSchema = z.object({
  name:        z.string().min(3, "Campaign name must be at least 3 characters."),
  description: z.string().optional(),
});

export default function CampaignNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: org } = useMyOrganization();
  const { data: employees }         = useEmployees(org?.id);
  const { data: emailTemplates }    = useEmailTemplates(org?.id);
  const { data: smsTemplates }      = useSmsTemplates(org?.id);
  const { data: voiceTemplates }    = useVoiceTemplates(org?.id);
  const { data: dmTemplates }       = useDirectMailTemplates(org?.id);

  const createCampaign    = useCreateCampaign();
  const addChannels       = useAddCampaignChannels();
  const setTargets        = useSetCampaignTargets();
  const launchCampaign    = useLaunchCampaign();

  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>({
    name: "", description: "", channels: [], templates: {},
    targetIds: [], startDate: "", endDate: "",
  });
  const [targetSearch, setTargetSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const detailsForm = useForm<z.infer<typeof detailsSchema>>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: state.name, description: state.description },
  });

  // ── Navigation ───────────────────────────────────────────
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  // ── Step 1 submit ─────────────────────────────────────────
  const onDetailsNext = detailsForm.handleSubmit((data) => {
    setState((s) => ({ ...s, name: data.name, description: data.description ?? "" }));
    next();
  });

  // ── Step 2: toggle channel ───────────────────────────────
  const toggleChannel = (ch: ChannelKey) => {
    setState((s) => ({
      ...s,
      channels: s.channels.includes(ch) ? s.channels.filter((c) => c !== ch) : [...s.channels, ch],
    }));
  };

  // ── Step 3: set template ─────────────────────────────────
  const setTemplate = (channel: ChannelKey, templateId: string) => {
    setState((s) => ({ ...s, templates: { ...s.templates, [channel]: templateId } }));
  };

  // ── Step 4: toggle target ────────────────────────────────
  const toggleTarget = (id: string) => {
    setState((s) => ({
      ...s,
      targetIds: s.targetIds.includes(id) ? s.targetIds.filter((t) => t !== id) : [...s.targetIds, id],
    }));
  };
  const toggleAllTargets = () => {
    const visible = filteredEmployees.map((e) => e.id);
    const allSelected = visible.every((id) => state.targetIds.includes(id));
    if (allSelected) {
      setState((s) => ({ ...s, targetIds: s.targetIds.filter((id) => !visible.includes(id)) }));
    } else {
      setState((s) => ({ ...s, targetIds: [...new Set([...s.targetIds, ...visible])] }));
    }
  };

  const filteredEmployees = (employees ?? []).filter(
    (e) => `${e.first_name} ${e.last_name} ${e.email} ${e.department ?? ""}`.toLowerCase().includes(targetSearch.toLowerCase())
  );

  // ── Final submit: create campaign + add channels + targets + launch ──
  const handleLaunch = async (launchNow: boolean) => {
    if (!org?.id || !user?.id) return;
    setIsSubmitting(true);
    try {
      // 1. Create campaign
      const campaign = await createCampaign.mutateAsync({
        organization_id: org.id,
        name:            state.name,
        description:     state.description || undefined,
        start_date:      state.startDate   || undefined,
        end_date:        state.endDate     || undefined,
        created_by:      user.id,
      });

      // 2. Add channels
      const channelRows = state.channels.map((ch) => ({
        channel:               ch,
        email_template_id:     ch === "email"       ? state.templates.email       : undefined,
        sms_template_id:       ch === "sms"         ? state.templates.sms         : undefined,
        voice_template_id:     ch === "voice"       ? state.templates.voice       : undefined,
        directmail_template_id: ch === "direct_mail" ? state.templates.direct_mail : undefined,
      }));
      await addChannels.mutateAsync({ campaignId: campaign.id, channels: channelRows });

      // 3. Set targets
      if (state.targetIds.length > 0) {
        await setTargets.mutateAsync({ campaignId: campaign.id, employeeIds: state.targetIds });
      }

      // 4. Optionally launch
      if (launchNow) {
        await launchCampaign.mutateAsync(campaign.id);
      } else {
        toast.success("Campaign saved as draft.");
      }

      navigate(`/dashboard/campaigns/${campaign.id}`);
    } catch {
      toast.error("Failed to create campaign. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step labels ──────────────────────────────────────────
  const templatesMissing = state.channels.some((ch) => !state.templates[ch]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/campaigns")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Campaigns
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New Campaign</h1>
          <p className="text-sm text-muted-foreground">{org?.name}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold border-2 transition-colors",
              step === s.id ? "border-primary bg-primary text-primary-foreground" :
              step > s.id  ? "border-primary bg-primary/10 text-primary" :
                             "border-muted-foreground/30 text-muted-foreground"
            )}>
              {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
            </div>
            <span className={cn("text-xs hidden sm:block", step === s.id ? "text-foreground font-medium" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-6 bg-muted-foreground/20 mx-1" />}
          </div>
        ))}
      </div>

      {/* ── Step 1: Details ── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>Give your campaign a name and optional description.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onDetailsNext} className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input placeholder="Q2 2026 Security Awareness Test" {...detailsForm.register("name")} />
                {detailsForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{detailsForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={3} placeholder="Optional description…" {...detailsForm.register("description")} />
              </div>
              <div className="flex justify-end">
                <Button type="submit">Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Channels ── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Channels</CardTitle>
            <CardDescription>Choose which phishing simulation types to include in this campaign.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.entries(CHANNEL_CONFIG) as [ChannelKey, typeof CHANNEL_CONFIG[ChannelKey]][]).map(([key, cfg]) => {
                const selected = state.channels.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleChannel(key)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all",
                      selected ? `border-current ${cfg.color}` : "border-border hover:border-muted-foreground/50"
                    )}
                  >
                    <div className={cn("rounded-md p-2 mt-0.5", selected ? cfg.color : "bg-muted")}>
                      <cfg.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{cfg.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{cfg.desc}</p>
                    </div>
                    {selected && <Check className="h-4 w-4 ml-auto text-current shrink-0" />}
                  </button>
                );
              })}
            </div>
            {state.channels.length === 0 && (
              <p className="text-xs text-destructive">Select at least one channel to continue.</p>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={next} disabled={state.channels.length === 0}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Templates ── */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Templates</CardTitle>
            <CardDescription>Choose a phishing template for each selected channel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {state.channels.map((ch) => {
              const cfg = CHANNEL_CONFIG[ch];
              const opts =
                ch === "email"       ? (emailTemplates ?? []) :
                ch === "sms"         ? (smsTemplates ?? [])   :
                ch === "voice"       ? (voiceTemplates ?? []) :
                                       (dmTemplates ?? []);
              return (
                <div key={ch} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("rounded p-1", cfg.color)}>
                      <cfg.icon className="h-3.5 w-3.5" />
                    </div>
                    <Label>{cfg.label} Template *</Label>
                  </div>
                  <Select
                    value={state.templates[ch] ?? ""}
                    onValueChange={(val) => setTemplate(ch, val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template…" />
                    </SelectTrigger>
                    <SelectContent>
                      {opts.length === 0 ? (
                        <SelectItem value="__none" disabled>No templates available</SelectItem>
                      ) : (
                        opts.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
            {templatesMissing && (
              <p className="text-xs text-destructive">Please select a template for each channel.</p>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={next} disabled={templatesMissing}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Targets ── */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Targets</CardTitle>
            <CardDescription>
              Choose which employees will receive the simulation.{" "}
              <span className="font-medium">{state.targetIds.length} selected</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search employees…"
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                className="max-w-xs"
              />
              <Button variant="outline" size="sm" onClick={toggleAllTargets}>
                {filteredEmployees.every((e) => state.targetIds.includes(e.id)) ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
              {filteredEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No employees found.</p>
              ) : (
                filteredEmployees.map((emp) => (
                  <label key={emp.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer">
                    <Checkbox
                      checked={state.targetIds.includes(emp.id)}
                      onCheckedChange={() => toggleTarget(emp.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.email}{emp.department ? ` · ${emp.department}` : ""}</p>
                    </div>
                  </label>
                ))
              )}
            </div>

            {state.targetIds.length === 0 && (
              <p className="text-xs text-destructive">Select at least one target to continue.</p>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={next} disabled={state.targetIds.length === 0}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 5: Schedule ── */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule Campaign</CardTitle>
            <CardDescription>Set when the campaign should run. Messages will be randomized across the window.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="datetime-local"
                  value={state.startDate}
                  onChange={(e) => setState((s) => ({ ...s, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="datetime-local"
                  value={state.endDate}
                  onChange={(e) => setState((s) => ({ ...s, endDate: e.target.value }))}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank to save as a draft without a schedule. You can set the schedule later.
            </p>
            <div className="flex justify-between">
              <Button variant="outline" onClick={back}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={next}>Review <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 6: Review & Launch ── */}
      {step === 6 && (
        <Card>
          <CardHeader>
            <CardTitle>Review &amp; Launch</CardTitle>
            <CardDescription>Review your campaign configuration before launching.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border divide-y">
              <ReviewRow label="Campaign Name" value={state.name} />
              {state.description && <ReviewRow label="Description" value={state.description} />}
              <ReviewRow
                label="Channels"
                value={
                  <div className="flex gap-1 flex-wrap">
                    {state.channels.map((ch) => (
                      <Badge key={ch} variant="outline" className={cn("text-xs", CHANNEL_CONFIG[ch].color)}>
                        {CHANNEL_CONFIG[ch].label}
                      </Badge>
                    ))}
                  </div>
                }
              />
              <ReviewRow label="Targets" value={`${state.targetIds.length} employee(s) selected`} />
              {state.startDate && <ReviewRow label="Start Date" value={new Date(state.startDate).toLocaleString()} />}
              {state.endDate   && <ReviewRow label="End Date"   value={new Date(state.endDate).toLocaleString()} />}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <Button variant="outline" onClick={back} disabled={isSubmitting}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleLaunch(false)} disabled={isSubmitting}>
                  Save as Draft
                </Button>
                <Button onClick={() => handleLaunch(true)} disabled={isSubmitting}>
                  {isSubmitting ? "Launching…" : "Launch Campaign"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-4 py-3">
      <p className="text-sm text-muted-foreground w-32 shrink-0">{label}</p>
      <div className="text-sm font-medium flex-1">{value}</div>
    </div>
  );
}
