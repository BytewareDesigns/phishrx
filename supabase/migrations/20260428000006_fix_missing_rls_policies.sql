-- ============================================================
-- PhishRx — Fix missing RLS policies
-- Migration: 20260428000006_fix_missing_rls_policies
--
-- Several tables had RLS enabled but no policies, meaning all
-- DML was blocked for authenticated users. This migration adds
-- the missing policies so campaign creation and the training-admin
-- org-lookup flow work correctly.
-- ============================================================

-- ── user_organization_assignments ─────────────────────────────
-- Training admins need to read their own assignments so
-- useMyOrganization() can discover which org they belong to.
-- Platform admins need full access for admin management UI.
CREATE POLICY "users_read_own_assignments" ON user_organization_assignments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "platform_admins_all_assignments" ON user_organization_assignments
  FOR ALL USING (get_my_role() IN ('master_admin', 'global_admin'));

-- ── campaign_channels ─────────────────────────────────────────
-- These rows are created as part of the campaign wizard flow.
-- Without policies the upsert silently fails with a 42501 error.
CREATE POLICY "platform_admins_all_campaign_channels" ON campaign_channels
  FOR ALL USING (get_my_role() IN ('master_admin', 'global_admin'));

CREATE POLICY "training_admin_own_campaign_channels" ON campaign_channels
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = ANY(get_my_org_ids())
    )
  );

-- ── campaign_targets ──────────────────────────────────────────
CREATE POLICY "platform_admins_all_campaign_targets" ON campaign_targets
  FOR ALL USING (get_my_role() IN ('master_admin', 'global_admin'));

CREATE POLICY "training_admin_own_campaign_targets" ON campaign_targets
  FOR ALL USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = ANY(get_my_org_ids())
    )
  );

-- ── scheduled_messages ───────────────────────────────────────
CREATE POLICY "platform_admins_all_scheduled_messages" ON scheduled_messages
  FOR ALL USING (get_my_role() IN ('master_admin', 'global_admin'));

CREATE POLICY "training_admin_read_scheduled_messages" ON scheduled_messages
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = ANY(get_my_org_ids())
    )
  );

-- ── voice_evaluations ─────────────────────────────────────────
CREATE POLICY "platform_admins_all_voice_evaluations" ON voice_evaluations
  FOR ALL USING (get_my_role() IN ('master_admin', 'global_admin'));

CREATE POLICY "training_admin_read_voice_evaluations" ON voice_evaluations
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns
      WHERE organization_id = ANY(get_my_org_ids())
    )
  );

-- ── campaign_stats materialized view: grant SELECT to authenticated ──
-- Materialized views don't have RLS but need explicit grants.
GRANT SELECT ON campaign_stats TO authenticated;
