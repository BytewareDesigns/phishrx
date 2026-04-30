// supabase/functions/lob-webhook/index.ts
// Public endpoint receiving Lob delivery lifecycle webhooks.
//
// Lob sends events like letter.in_transit, letter.processed_for_delivery,
// letter.re-routed, letter.returned_to_sender. Each payload echoes the
// metadata we set on letter creation (see launch-campaign sendDirectMail).
//
// Configure in Lob dashboard:
//   Settings → Webhooks
//   Endpoint: https://<project>.supabase.co/functions/v1/lob-webhook
//   Events: letter.processed_for_delivery, letter.re-routed,
//           letter.returned_to_sender, letter.in_transit

import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import {
  adminClient, lookupTarget, insertEvent, type EventType,
} from "../_shared/events.ts";

interface LobWebhookEvent {
  id:           string;
  event_type?:  { id: string };
  reference_id?: string;
  body?: {
    id?:       string;
    metadata?: {
      target_id?: string;
      channel?:   string;
      [k: string]: unknown;
    };
  };
}

/** Map Lob event_type.id to our event_type. */
function mapLobEvent(lobEventId: string): EventType | null {
  switch (lobEventId) {
    case "letter.processed_for_delivery": return "delivered";
    case "letter.in_transit":             return "sent";
    case "letter.re-routed":              return null;
    case "letter.returned_to_sender":     return null;
    default:                              return null;
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const payload = await req.json() as LobWebhookEvent;
    const lobEventId = payload.event_type?.id;
    if (!lobEventId) {
      return errorResponse("Missing event_type.id");
    }

    const tid = payload.body?.metadata?.target_id;
    if (!tid) {
      return jsonResponse({ success: true, skipped: "no target_id in metadata" });
    }

    const eventType = mapLobEvent(lobEventId);
    if (!eventType) {
      return jsonResponse({ success: true, skipped: lobEventId });
    }

    const admin = adminClient();
    const target = await lookupTarget(admin, tid);
    if (!target) {
      return jsonResponse({ success: true, skipped: "target not found" });
    }

    await insertEvent(admin, {
      campaign_id: target.campaign_id,
      employee_id: target.employee_id,
      channel:     "direct_mail",
      event_type:  eventType,
      metadata: {
        provider:    "lob",
        lob_event:   lobEventId,
        letter_id:   payload.body?.id,
        reference:   payload.reference_id,
      },
    });

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("lob-webhook error:", err);
    return errorResponse("Internal server error", 500);
  }
});
