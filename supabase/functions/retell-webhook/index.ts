// supabase/functions/retell-webhook/index.ts
// Public endpoint receiving Retell AI call lifecycle webhooks.
//
// Retell sends events for: call_started, call_ended, call_analyzed.
// Each payload includes the metadata we set when initiating the call —
// look for metadata.target_id.
//
// On call_analyzed we also persist the transcript + LLM evaluation to
// the voice_evaluations table for later review.
//
// Configure in Retell dashboard:
//   Webhook URL: https://<project>.supabase.co/functions/v1/retell-webhook

import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import {
  adminClient, lookupTarget, insertEvent, type EventType,
} from "../_shared/events.ts";

interface RetellWebhookEvent {
  event: "call_started" | "call_ended" | "call_analyzed";
  call?: {
    call_id?:           string;
    from_number?:       string;
    to_number?:         string;
    call_status?:       string;
    transcript?:        string;
    call_analysis?:     unknown;
    metadata?: {
      target_id?: string;
      channel?:   string;
      [k: string]: unknown;
    };
  };
}

function mapEvent(retellEvent: string): EventType | null {
  switch (retellEvent) {
    case "call_started":  return "call_answered";
    case "call_ended":    return "call_completed";
    case "call_analyzed": return null; // handled separately — write to voice_evaluations
    default:              return null;
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const payload = await req.json() as RetellWebhookEvent;
    const tid     = payload.call?.metadata?.target_id;

    if (!tid) {
      return jsonResponse({ success: true, skipped: "no target_id in metadata" });
    }

    const admin  = adminClient();
    const target = await lookupTarget(admin, tid);
    if (!target) {
      return jsonResponse({ success: true, skipped: "target not found" });
    }

    // For call_analyzed, persist transcript + analysis and emit a "caught"
    // event if the analysis says the user fell for the social engineering.
    if (payload.event === "call_analyzed") {
      const analysis = payload.call?.call_analysis as Record<string, unknown> | undefined;
      // Common Retell analysis field — check for a boolean indicator;
      // if your custom analyzer uses a different field, adjust here.
      const caughtIndicator =
        analysis?.user_sentiment === "Cooperative" ||
        analysis?.fell_for_phish === true ||
        analysis?.in_voicemail === false && analysis?.user_provided_credentials === true;

      await admin.from("voice_evaluations").insert({
        campaign_id: target.campaign_id,
        employee_id: target.employee_id,
        call_id:     payload.call?.call_id,
        transcript:  payload.call?.transcript ?? null,
        evaluation:  analysis ?? null,
        caught:      Boolean(caughtIndicator),
      });

      if (caughtIndicator) {
        await insertEvent(admin, {
          campaign_id: target.campaign_id,
          employee_id: target.employee_id,
          channel:     "voice",
          event_type:  "caught",
          metadata:    { provider: "retell", call_id: payload.call?.call_id },
        });
      }

      return jsonResponse({ success: true, recorded: "evaluation" });
    }

    // Lifecycle events (call_started, call_ended) → campaign_events row
    const eventType = mapEvent(payload.event);
    if (!eventType) {
      return jsonResponse({ success: true, skipped: payload.event });
    }

    await insertEvent(admin, {
      campaign_id: target.campaign_id,
      employee_id: target.employee_id,
      channel:     "voice",
      event_type:  eventType,
      metadata: {
        provider:    "retell",
        call_id:     payload.call?.call_id,
        call_status: payload.call?.call_status,
      },
    });

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("retell-webhook error:", err);
    return errorResponse("Internal server error", 500);
  }
});
