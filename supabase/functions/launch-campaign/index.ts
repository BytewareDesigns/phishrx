// supabase/functions/launch-campaign/index.ts
// Authenticated endpoint that activates a campaign and dispatches sends
// across all configured channels (email, sms, voice, direct_mail).
//
// POST /launch-campaign
// Headers: Authorization: Bearer <user_jwt>
// Body: { campaign_id: string }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  corsHeaders,
  errorResponse,
  handleCors,
  jsonResponse,
} from "../_shared/cors.ts";

// ── Types ─────────────────────────────────────────────────────
interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface CampaignChannel {
  id: string;
  channel: "email" | "sms" | "voice" | "direct_mail";
  email_template_id:      string | null;
  sms_template_id:        string | null;
  voice_template_id:      string | null;
  directmail_template_id: string | null;
}

interface SendResult {
  sent:   number;
  failed: number;
  errors: string[];
}

// ── Tracking URL helpers ──────────────────────────────────────
function trackUrl(
  supabaseUrl: string,
  targetId: string,
  event: "open" | "click" | "submit",
  channel: string,
) {
  return `${supabaseUrl}/functions/v1/track-event?t=${targetId}&e=${event}&ch=${channel}`;
}

// ── Chunking helper ───────────────────────────────────────────
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ── Channel senders ───────────────────────────────────────────

/** SendGrid — batch email via personalizations (max 1000/request) */
async function sendEmails(
  employees: Employee[],
  targetIds: Record<string, string>,   // employeeId → targetId
  template: {
    from_name:  string;
    from_email: string;
    subject:    string;
    html_body:  string;
  },
  supabaseUrl: string,
): Promise<SendResult> {
  const apiKey = Deno.env.get("SENDGRID_API_KEY");
  if (!apiKey) return { sent: 0, failed: employees.length, errors: ["SENDGRID_API_KEY not set"] };

  const result: SendResult = { sent: 0, failed: 0, errors: [] };

  for (const batch of chunk(employees, 1000)) {
    const personalizations = batch.map((emp) => {
      const tid = targetIds[emp.id];
      return {
        to: [{ email: emp.email, name: `${emp.first_name} ${emp.last_name}` }],
        substitutions: {
          "{{FIRST_NAME}}":    emp.first_name,
          "{{LAST_NAME}}":     emp.last_name,
          "{{PHISHING_LINK}}": trackUrl(supabaseUrl, tid, "click", "email"),
          "{{PIXEL_URL}}":     trackUrl(supabaseUrl, tid, "open",  "email"),
        },
      };
    });

    // Inject tracking pixel into every email
    const htmlWithPixel = template.html_body
      .replace(
        "</body>",
        `<img src="{{PIXEL_URL}}" width="1" height="1" style="display:none" /></body>`,
      )
      // If template has no </body> tag, append pixel at end
      + (template.html_body.includes("</body>")
        ? ""
        : `<img src="{{PIXEL_URL}}" width="1" height="1" style="display:none" />`);

    const body = {
      personalizations,
      from:    { email: template.from_email, name: template.from_name },
      subject: template.subject,
      content: [{ type: "text/html", value: htmlWithPixel }],
    };

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      result.sent += batch.length;
    } else {
      const err = await res.text();
      console.error("SendGrid error:", err);
      result.failed += batch.length;
      result.errors.push(`SendGrid: ${res.status} — ${err.slice(0, 200)}`);
    }
  }

  return result;
}

/** Twilio — one SMS per employee (parallelised in batches of 50) */
async function sendSms(
  employees: Employee[],
  targetIds: Record<string, string>,
  template: { body: string; sender_id: string | null },
  supabaseUrl: string,
): Promise<SendResult> {
  const sid    = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token  = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from   = template.sender_id ?? Deno.env.get("TWILIO_FROM_NUMBER");

  if (!sid || !token || !from) {
    return { sent: 0, failed: employees.length, errors: ["Twilio credentials not set"] };
  }

  const result: SendResult = { sent: 0, failed: 0, errors: [] };
  const auth = btoa(`${sid}:${token}`);
  const url  = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

  for (const batch of chunk(employees, 50)) {
    await Promise.all(
      batch.map(async (emp) => {
        if (!emp.phone) {
          result.failed++;
          return;
        }
        const tid         = targetIds[emp.id];
        const trackingUrl = trackUrl(supabaseUrl, tid, "click", "sms");
        const messageBody = template.body
          .replace("{{PHISHING_LINK}}", trackingUrl)
          .replace("{{FIRST_NAME}}", emp.first_name)
          .replace("{{LAST_NAME}}", emp.last_name);

        const params = new URLSearchParams({
          To:   emp.phone,
          From: from,
          Body: messageBody,
        });

        const res = await fetch(url, {
          method:  "POST",
          headers: {
            Authorization:  `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        if (res.ok) {
          result.sent++;
        } else {
          const err = await res.text();
          console.error("Twilio error:", err);
          result.failed++;
          result.errors.push(`Twilio → ${emp.email}: ${res.status}`);
        }
      }),
    );
  }

  return result;
}

/** Retell AI — initiate outbound call per employee */
async function sendVoiceCalls(
  employees: Employee[],
  template: { retell_agent_id: string },
): Promise<SendResult> {
  const apiKey  = Deno.env.get("RETELL_API_KEY");
  const agentId = template.retell_agent_id || Deno.env.get("RETELL_AGENT_ID");
  const fromNum = Deno.env.get("TWILIO_FROM_NUMBER"); // Retell uses Twilio numbers

  if (!apiKey || !agentId) {
    return { sent: 0, failed: employees.length, errors: ["Retell credentials/agent not configured"] };
  }

  const result: SendResult = { sent: 0, failed: 0, errors: [] };

  for (const batch of chunk(employees, 20)) {
    await Promise.all(
      batch.map(async (emp) => {
        if (!emp.phone) {
          result.failed++;
          return;
        }

        const res = await fetch("https://api.retellai.com/v2/create-phone-call", {
          method:  "POST",
          headers: {
            Authorization:  `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from_number: fromNum,
            to_number:   emp.phone,
            agent_id:    agentId,
            metadata: {
              employee_first_name: emp.first_name,
              employee_last_name:  emp.last_name,
              employee_email:      emp.email,
            },
          }),
        });

        if (res.ok) {
          result.sent++;
        } else {
          const err = await res.text();
          console.error("Retell error:", err);
          result.failed++;
          result.errors.push(`Retell → ${emp.email}: ${res.status}`);
        }
      }),
    );
  }

  return result;
}

/** Lob — create physical letter per employee (requires address data) */
async function sendDirectMail(
  employees: Employee[],
  targetIds: Record<string, string>,
  template: { lob_template_id: string; qr_code_url_placeholder: string | null },
  supabaseUrl: string,
): Promise<SendResult> {
  const apiKey  = Deno.env.get("LOB_API_KEY");
  const fromZip = Deno.env.get("LOB_FROM_ZIP") ?? "10001"; // Default sender ZIP

  if (!apiKey) {
    return { sent: 0, failed: employees.length, errors: ["LOB_API_KEY not set"] };
  }

  const result: SendResult = { sent: 0, failed: 0, errors: [] };
  const auth = btoa(`${apiKey}:`);

  for (const emp of employees) {
    if (!emp.address_line1 || !emp.city || !emp.state || !emp.zip) {
      result.failed++;
      result.errors.push(`Lob → ${emp.email}: missing address`);
      continue;
    }

    const tid     = targetIds[emp.id];
    const qrUrl   = trackUrl(supabaseUrl, tid, "click", "direct_mail");

    const body = new URLSearchParams({
      description:             `PhishRx — ${emp.first_name} ${emp.last_name}`,
      "to[name]":              `${emp.first_name} ${emp.last_name}`,
      "to[address_line1]":     emp.address_line1,
      "to[address_line2]":     emp.address_line2 ?? "",
      "to[address_city]":      emp.city,
      "to[address_state]":     emp.state,
      "to[address_zip]":       emp.zip,
      "to[address_country]":   "US",
      "from[name]":            "Compliance Department",
      "from[address_line1]":   "350 5th Ave",
      "from[address_city]":    "New York",
      "from[address_state]":   "NY",
      "from[address_zip]":     fromZip,
      "from[address_country]": "US",
      template_id:             template.lob_template_id,
      "merge_variables[qr_url]":       qrUrl,
      "merge_variables[first_name]":   emp.first_name,
      "merge_variables[last_name]":    emp.last_name,
    });

    const res = await fetch("https://api.lob.com/v1/letters", {
      method:  "POST",
      headers: {
        Authorization:  `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (res.ok) {
      result.sent++;
    } else {
      const err = await res.text();
      console.error("Lob error:", err);
      result.failed++;
      result.errors.push(`Lob → ${emp.email}: ${res.status}`);
    }
  }

  return result;
}

// ── Main handler ──────────────────────────────────────────────
serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // Require Bearer JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", 401);
    }
    const userJwt = authHeader.slice(7);

    const { campaign_id } = await req.json() as { campaign_id?: string };
    if (!campaign_id) return errorResponse("Missing campaign_id");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // User-context client — respects RLS (verifies the caller can access this campaign)
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Admin client — used for inserts/updates that bypass RLS
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Fetch campaign (RLS ensures user has access)
    const { data: campaign, error: campError } = await userClient
      .from("campaigns")
      .select("id, organization_id, name, status")
      .eq("id", campaign_id)
      .single();

    if (campError || !campaign) {
      return errorResponse("Campaign not found or access denied", 404);
    }

    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      return errorResponse(`Campaign is already ${campaign.status}`);
    }

    // 2. Fetch active campaign channels
    const { data: channels } = await admin
      .from("campaign_channels")
      .select(`
        id, channel,
        email_template_id, sms_template_id,
        voice_template_id, directmail_template_id
      `)
      .eq("campaign_id", campaign_id)
      .eq("is_active", true);

    if (!channels || channels.length === 0) {
      return errorResponse("Campaign has no active channels configured");
    }

    // 3. Fetch all active employees for the org
    const { data: employees } = await admin
      .from("employees")
      .select("id, first_name, last_name, email, phone, address_line1, address_line2, city, state, zip")
      .eq("organization_id", campaign.organization_id)
      .eq("is_active", true);

    if (!employees || employees.length === 0) {
      return errorResponse("No active employees found for this organization");
    }

    // 4. Upsert campaign_targets (skip duplicates)
    const targetRows = employees.map((e: Employee) => ({
      campaign_id,
      employee_id: e.id,
    }));

    await admin.from("campaign_targets").upsert(targetRows, {
      onConflict: "campaign_id,employee_id",
      ignoreDuplicates: true,
    });

    // Fetch all target IDs (including pre-existing ones)
    const { data: targets } = await admin
      .from("campaign_targets")
      .select("id, employee_id")
      .eq("campaign_id", campaign_id);

    // Build employee → target lookup
    const targetIds: Record<string, string> = {};
    (targets ?? []).forEach((t: { id: string; employee_id: string }) => {
      targetIds[t.employee_id] = t.id;
    });

    // 5. Update campaign status to active
    await admin.from("campaigns").update({
      status:     "active",
      start_date: new Date().toISOString(),
    }).eq("id", campaign_id);

    // 6. Fan out to each channel
    const results: Record<string, SendResult | null> = {
      email:       null,
      sms:         null,
      voice:       null,
      direct_mail: null,
    };

    for (const ch of channels as CampaignChannel[]) {
      if (ch.channel === "email" && ch.email_template_id) {
        const { data: tpl } = await admin
          .from("email_templates")
          .select("from_name, from_email, subject, html_body")
          .eq("id", ch.email_template_id)
          .single();

        if (tpl) {
          results.email = await sendEmails(employees, targetIds, tpl, supabaseUrl);

          // Record 'sent' events for each employee
          if (results.email.sent > 0) {
            const sentRows = employees
              .filter((e: Employee) => targetIds[e.id])
              .map((e: Employee) => ({
                campaign_id,
                employee_id: e.id,
                channel:     "email",
                event_type:  "sent",
              }));
            await admin.from("campaign_events").insert(sentRows);
          }
        }
      }

      if (ch.channel === "sms" && ch.sms_template_id) {
        const { data: tpl } = await admin
          .from("sms_templates")
          .select("body, sender_id")
          .eq("id", ch.sms_template_id)
          .single();

        if (tpl) {
          results.sms = await sendSms(employees, targetIds, tpl, supabaseUrl);

          if (results.sms.sent > 0) {
            const sentRows = employees
              .filter((e: Employee) => e.phone && targetIds[e.id])
              .map((e: Employee) => ({
                campaign_id,
                employee_id: e.id,
                channel:     "sms",
                event_type:  "sent",
              }));
            await admin.from("campaign_events").insert(sentRows);
          }
        }
      }

      if (ch.channel === "voice" && ch.voice_template_id) {
        const { data: tpl } = await admin
          .from("voice_templates")
          .select("retell_agent_id")
          .eq("id", ch.voice_template_id)
          .single();

        if (tpl) {
          results.voice = await sendVoiceCalls(employees, tpl);

          if (results.voice.sent > 0) {
            const sentRows = employees
              .filter((e: Employee) => e.phone && targetIds[e.id])
              .map((e: Employee) => ({
                campaign_id,
                employee_id: e.id,
                channel:     "voice",
                event_type:  "sent",
              }));
            await admin.from("campaign_events").insert(sentRows);
          }
        }
      }

      if (ch.channel === "direct_mail" && ch.directmail_template_id) {
        const { data: tpl } = await admin
          .from("direct_mail_templates")
          .select("lob_template_id, qr_code_url_placeholder")
          .eq("id", ch.directmail_template_id)
          .single();

        if (tpl) {
          results.direct_mail = await sendDirectMail(employees, targetIds, tpl, supabaseUrl);

          if (results.direct_mail.sent > 0) {
            const sentRows = employees
              .filter((e: Employee) => e.address_line1 && targetIds[e.id])
              .map((e: Employee) => ({
                campaign_id,
                employee_id: e.id,
                channel:     "direct_mail",
                event_type:  "sent",
              }));
            await admin.from("campaign_events").insert(sentRows);
          }
        }
      }
    }

    // 7. Collect any send errors and log them (non-blocking)
    const allErrors = Object.values(results)
      .flatMap((r) => r?.errors ?? []);
    if (allErrors.length > 0) {
      console.warn("Launch errors:", allErrors);
    }

    return jsonResponse({
      success:  true,
      campaign: campaign.name,
      targets:  employees.length,
      sent: {
        email:       results.email?.sent       ?? 0,
        sms:         results.sms?.sent         ?? 0,
        voice:       results.voice?.sent        ?? 0,
        direct_mail: results.direct_mail?.sent  ?? 0,
      },
      errors: allErrors,
    });
  } catch (err) {
    console.error("launch-campaign unhandled:", err);
    return errorResponse("Internal server error", 500);
  }
});
