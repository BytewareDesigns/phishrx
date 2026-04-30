// supabase/functions/twilio-webhook/index.ts
// Public endpoint receiving Twilio Status Callback POSTs.
//
// Twilio sends application/x-www-form-urlencoded with one event per request,
// including MessageSid, MessageStatus, To, From. We pass target_id as a
// query parameter on the StatusCallback URL (set in launch-campaign), so
// extract it from the URL.
//
// Configure: launch-campaign sends StatusCallback=<url>?target_id=<tid> per
// message — Twilio appends body params on top.

import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import {
  adminClient, lookupTarget, findTargetByEmployeeContact,
  insertEvent, type EventType,
} from "../_shared/events.ts";

/** Map Twilio MessageStatus to our event_type. Null = not tracked. */
function mapStatus(status: string): EventType | null {
  switch (status) {
    case "sent":        return "sent";       // we already record sent at launch time, dedup is fine
    case "delivered":   return "delivered";
    case "read":        return "opened";     // WhatsApp / RCS read receipts
    case "failed":      return null;
    case "undelivered": return null;
    default:            return null;
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const url       = new URL(req.url);
    const targetId  = url.searchParams.get("target_id");
    const formData  = await req.formData();

    const status     = formData.get("MessageStatus")?.toString() ?? "";
    const messageSid = formData.get("MessageSid")?.toString();
    const toNumber   = formData.get("To")?.toString();

    const eventType = mapStatus(status);
    if (!eventType) {
      return jsonResponse({ success: true, skipped: status });
    }

    const admin = adminClient();

    // Resolve target — prefer URL param, fall back to phone lookup
    let target: { campaign_id: string; employee_id: string } | null = null;
    if (targetId) {
      target = await lookupTarget(admin, targetId);
    }
    if (!target && toNumber) {
      target = await findTargetByEmployeeContact(admin, { phone: toNumber });
    }
    if (!target) {
      return jsonResponse({ success: true, skipped: "no target" });
    }

    await insertEvent(admin, {
      campaign_id: target.campaign_id,
      employee_id: target.employee_id,
      channel:     "sms",
      event_type:  eventType,
      metadata: {
        provider:    "twilio",
        message_sid: messageSid,
        status,
      },
    });

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("twilio-webhook error:", err);
    return errorResponse("Internal server error", 500);
  }
});
