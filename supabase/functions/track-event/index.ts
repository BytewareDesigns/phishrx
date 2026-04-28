// supabase/functions/track-event/index.ts
// Public endpoint — no authentication required.
// Records campaign tracking events (open, click, form_submitted) and
// redirects employees to the training fail page on click/submit.
//
// URL pattern:
//   GET /track-event?t={campaign_target_id}&e={open|click|submit}&ch={email|sms|voice|direct_mail}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// 1×1 transparent GIF (returned for email open-pixel requests)
const TRANSPARENT_GIF = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
  0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
  0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b,
]);

// Default fail-page URL (override with TRACKING_REDIRECT_URL env var)
const FAIL_URL = Deno.env.get("TRACKING_REDIRECT_URL") ??
  "https://phishrx.medcurity.com/fail";

type EventKind = "open" | "click" | "submit";
type Channel = "email" | "sms" | "voice" | "direct_mail";

const EVENT_MAP: Record<EventKind, string> = {
  open:   "opened",
  click:  "clicked",
  submit: "form_submitted",
};

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const url   = new URL(req.url);
    const t     = url.searchParams.get("t");   // campaign_target_id
    const e     = (url.searchParams.get("e") ?? "click") as EventKind;
    const ch    = (url.searchParams.get("ch") ?? "email") as Channel;

    if (!t) {
      return new Response("Bad request", { status: 400, headers: corsHeaders });
    }

    // Validate event kind
    const eventType = EVENT_MAP[e];
    if (!eventType) {
      return new Response("Bad request", { status: 400, headers: corsHeaders });
    }

    // Fetch the campaign target row
    const { data: target, error: targetError } = await admin
      .from("campaign_targets")
      .select("id, campaign_id, employee_id")
      .eq("id", t)
      .maybeSingle();

    if (targetError || !target) {
      // Don't expose details — silently redirect for unknown tokens
      if (e !== "open") {
        return Response.redirect(FAIL_URL, 302);
      }
      return new Response(TRANSPARENT_GIF, {
        headers: { "Content-Type": "image/gif", ...corsHeaders },
      });
    }

    const metadata: Record<string, string> = {
      ip:         req.headers.get("x-forwarded-for") ?? "",
      user_agent: req.headers.get("user-agent")       ?? "",
    };

    // Insert primary event
    await admin.from("campaign_events").insert({
      campaign_id: target.campaign_id,
      employee_id: target.employee_id,
      channel:     ch,
      event_type:  eventType,
      metadata,
      ip_address:  req.headers.get("x-forwarded-for") ?? null,
      user_agent:  req.headers.get("user-agent")       ?? null,
    });

    // For click/submit: also record "caught" + redirect to training page
    if (e === "click" || e === "submit") {
      await admin.from("campaign_events").insert({
        campaign_id: target.campaign_id,
        employee_id: target.employee_id,
        channel:     ch,
        event_type:  "caught",
        metadata,
        ip_address:  req.headers.get("x-forwarded-for") ?? null,
        user_agent:  req.headers.get("user-agent")       ?? null,
      });

      return Response.redirect(FAIL_URL, 302);
    }

    // For open (tracking pixel): return transparent GIF
    return new Response(TRANSPARENT_GIF, {
      headers: {
        "Content-Type":  "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        ...corsHeaders,
      },
    });
  } catch (err) {
    console.error("track-event error:", err);
    // Never show errors to the target employee
    return Response.redirect(FAIL_URL, 302);
  }
});
