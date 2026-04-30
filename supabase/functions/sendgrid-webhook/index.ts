// supabase/functions/sendgrid-webhook/index.ts
// Public endpoint receiving SendGrid Event Webhook POSTs.
//
// Each request contains a JSON array of events (delivered/open/click/bounce/etc.).
// Every event includes our `custom_args.target_id` (set in launch-campaign) so
// we can map it back to the originating campaign_target row.
//
// Configure in SendGrid:
//   Settings → Mail Settings → Event Webhook
//   URL: https://<project>.supabase.co/functions/v1/sendgrid-webhook
//   Select: delivered, open, click, bounce, dropped, spamreport, unsubscribe

import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import {
  adminClient, lookupTarget, findTargetByEmployeeContact,
  insertEvent, type EventType,
} from "../_shared/events.ts";

interface SendGridEvent {
  email:        string;
  event:        string;
  timestamp:    number;
  sg_event_id:  string;
  sg_message_id?: string;
  // custom_args is flattened by SendGrid into top-level keys when configured.
  // We set { target_id, channel } in launch-campaign, so they appear here.
  target_id?:   string;
  channel?:     string;
  // bounce / dropped specific
  reason?:      string;
  type?:        string;
  // click specific
  url?:         string;
}

/** Map SendGrid event names to our event_type enum. Returns null if we don't track it. */
function mapEventType(sgEvent: string): EventType | null {
  switch (sgEvent) {
    case "delivered":   return "delivered";
    case "open":        return "opened";
    case "click":       return "clicked";
    case "bounce":      return null;   // record as metadata-only, no funnel state
    case "dropped":     return null;
    case "spamreport":  return null;
    case "unsubscribe": return null;
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
    const events = await req.json() as SendGridEvent[];
    if (!Array.isArray(events)) {
      return errorResponse("Expected array of events");
    }

    const admin = adminClient();
    let inserted = 0;
    let skipped  = 0;

    for (const ev of events) {
      const eventType = mapEventType(ev.event);
      if (!eventType) {
        skipped++;
        continue;
      }

      // Resolve target — prefer custom_args.target_id, fall back to email lookup
      let target: { campaign_id: string; employee_id: string } | null = null;
      if (ev.target_id) {
        target = await lookupTarget(admin, ev.target_id);
      }
      if (!target && ev.email) {
        target = await findTargetByEmployeeContact(admin, { email: ev.email });
      }
      if (!target) {
        skipped++;
        continue;
      }

      await insertEvent(admin, {
        campaign_id:  target.campaign_id,
        employee_id:  target.employee_id,
        channel:      "email",
        event_type:   eventType,
        occurred_at:  new Date(ev.timestamp * 1000).toISOString(),
        metadata: {
          provider:      "sendgrid",
          sg_event_id:   ev.sg_event_id,
          sg_message_id: ev.sg_message_id,
          ...(ev.url     && { url:    ev.url    }),
          ...(ev.reason  && { reason: ev.reason }),
          ...(ev.event   === "click" && { url: ev.url }),
        },
      });
      inserted++;
    }

    return jsonResponse({ success: true, inserted, skipped });
  } catch (err) {
    console.error("sendgrid-webhook error:", err);
    return errorResponse("Internal server error", 500);
  }
});
