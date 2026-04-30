-- ============================================================
-- PhishRx — Real-time campaign stats
-- Migration: 20260428000007_realtime_campaign_stats
--
-- The original schema defined `campaign_stats` as a MATERIALIZED VIEW
-- with a pg_cron refresh job that was left commented out, so the view
-- never got refreshed and every stats card always showed zeros.
--
-- For our scale (~2M events/year), aggregating in real time on every
-- read is plenty fast with the right composite index, and avoids the
-- entire "is the view stale?" failure mode. Drop the materialized
-- view, recreate as a regular view, and add the index that makes
-- the GROUP BY count(*) FILTER (...) cheap.
-- ============================================================

-- 1. Drop the materialized view (and its index)
DROP MATERIALIZED VIEW IF EXISTS campaign_stats;

-- 2. Recreate as a real-time view with the same columns
CREATE VIEW campaign_stats AS
SELECT
  c.id                                                                  AS campaign_id,
  c.organization_id,
  c.name                                                                AS campaign_name,
  ce.channel,
  COUNT(*) FILTER (WHERE ce.event_type = 'sent')                        AS total_sent,
  COUNT(*) FILTER (WHERE ce.event_type = 'delivered')                   AS total_delivered,
  COUNT(*) FILTER (WHERE ce.event_type = 'opened')                      AS total_opened,
  COUNT(*) FILTER (WHERE ce.event_type = 'clicked')                     AS total_clicked,
  COUNT(*) FILTER (WHERE ce.event_type = 'form_submitted')              AS total_form_submitted,
  COUNT(*) FILTER (WHERE ce.event_type = 'caught')                      AS total_caught,
  CASE
    WHEN COUNT(*) FILTER (WHERE ce.event_type = 'sent') = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (WHERE ce.event_type = 'caught')::numeric /
      COUNT(*) FILTER (WHERE ce.event_type = 'sent')::numeric * 100,
      1
    )
  END                                                                    AS catch_rate
FROM campaigns c
LEFT JOIN campaign_events ce ON ce.campaign_id = c.id
GROUP BY c.id, c.organization_id, c.name, ce.channel;

-- 3. Composite index that makes the per-event-type COUNT FILTER fast.
--    Each filtered count effectively becomes an index range scan.
CREATE INDEX IF NOT EXISTS idx_campaign_events_lookup
  ON campaign_events (campaign_id, channel, event_type);

-- 4. Re-grant SELECT to authenticated users (was on the mat view before).
--    Regular views inherit permissions from base tables but we grant
--    explicitly to be safe.
GRANT SELECT ON campaign_stats TO authenticated;

-- ── Notes ────────────────────────────────────────────────────
-- If event volume grows beyond ~10M rows and aggregations get slow,
-- the move is:
--   (a) re-introduce the materialized view, OR
--   (b) maintain a denormalized counters table updated by a trigger
--       on campaign_events INSERT.
-- For now, real-time is the right trade-off.
