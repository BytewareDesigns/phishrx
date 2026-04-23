-- ============================================================
-- PhishRx — Initial Database Schema
-- Migration: 20260423000001_initial_schema
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- fuzzy search on names/emails

-- ── Enums ────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('master_admin', 'global_admin', 'training_admin');

CREATE TYPE campaign_channel_type AS ENUM ('email', 'sms', 'voice', 'direct_mail');

CREATE TYPE campaign_status AS ENUM (
  'draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'
);

CREATE TYPE event_type AS ENUM (
  'sent',
  'delivered',
  'opened',
  'clicked',
  'form_submitted',
  'call_answered',
  'call_completed',
  'qr_scanned',
  'caught'
);

-- ── Organizations ─────────────────────────────────────────────
CREATE TABLE organizations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  external_company_id TEXT UNIQUE,              -- Medcurity billing system ID
  logo_url            TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── User Profiles ─────────────────────────────────────────────
-- Mirrors auth.users — one row per authenticated user
CREATE TABLE user_profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  first_name        TEXT,
  last_name         TEXT,
  phone             TEXT,
  title             TEXT,
  role              user_role NOT NULL DEFAULT 'training_admin',
  pending_role      TEXT CHECK (pending_role IN ('global_admin')),
  medcurity_user_id TEXT UNIQUE,
  is_archived       BOOLEAN NOT NULL DEFAULT false,
  archived_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── User ↔ Organization Assignments ──────────────────────────
CREATE TABLE user_organization_assignments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role                    user_role NOT NULL,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  assigned_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by_integration BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, organization_id)
);

-- ── Campaign Packages (Integration API subscriptions) ─────────
CREATE TABLE campaign_packages (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_subscription_id TEXT NOT NULL,
  channels_enabled         campaign_channel_type[] NOT NULL DEFAULT '{email}',
  total_seats              INTEGER NOT NULL CHECK (total_seats > 0),
  used_seats               INTEGER NOT NULL DEFAULT 0 CHECK (used_seats >= 0),
  start_date               TIMESTAMPTZ NOT NULL,
  end_date                 TIMESTAMPTZ NOT NULL,
  is_active                BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, external_subscription_id),
  CONSTRAINT seats_not_exceeded     CHECK (used_seats <= total_seats),
  CONSTRAINT valid_date_range       CHECK (end_date > start_date)
);

-- ── Employees (Phishing Targets) ─────────────────────────────
CREATE TABLE employees (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  medcurity_user_id TEXT,
  email             TEXT NOT NULL,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  phone             TEXT,
  department        TEXT,
  job_title         TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, email)
);

-- ── Email Templates ───────────────────────────────────────────
CREATE TABLE email_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,  -- NULL = global
  name              TEXT NOT NULL,
  subject           TEXT NOT NULL,
  from_name         TEXT NOT NULL,
  from_email        TEXT NOT NULL,
  html_body         TEXT NOT NULL,
  landing_scenario  TEXT,             -- maps to domain-router scenario key
  is_global         BOOLEAN NOT NULL DEFAULT false,
  created_by        UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SMS Templates ─────────────────────────────────────────────
CREATE TABLE sms_templates (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id            UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name                       TEXT NOT NULL,
  body                       TEXT NOT NULL,
  tracking_url_placeholder   TEXT,
  is_global                  BOOLEAN NOT NULL DEFAULT false,
  created_by                 UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Voice Templates ───────────────────────────────────────────
CREATE TABLE voice_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  retell_agent_id TEXT NOT NULL,
  prompt_summary  TEXT,
  is_global       BOOLEAN NOT NULL DEFAULT false,
  created_by      UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Direct Mail Templates ─────────────────────────────────────
CREATE TABLE direct_mail_templates (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  lob_template_id          TEXT NOT NULL,
  description              TEXT,
  qr_code_url_placeholder  TEXT,
  is_global                BOOLEAN NOT NULL DEFAULT false,
  created_by               UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Campaigns ─────────────────────────────────────────────────
CREATE TABLE campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  status          campaign_status NOT NULL DEFAULT 'draft',
  start_date      TIMESTAMPTZ,
  end_date        TIMESTAMPTZ,
  created_by      UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Campaign Channels (which channels are in each campaign) ───
CREATE TABLE campaign_channels (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id           UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  channel               campaign_channel_type NOT NULL,
  email_template_id     UUID REFERENCES email_templates(id)       ON DELETE SET NULL,
  sms_template_id       UUID REFERENCES sms_templates(id)         ON DELETE SET NULL,
  voice_template_id     UUID REFERENCES voice_templates(id)        ON DELETE SET NULL,
  directmail_template_id UUID REFERENCES direct_mail_templates(id) ON DELETE SET NULL,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, channel)
);

-- ── Campaign Targets (which employees are in each campaign) ───
CREATE TABLE campaign_targets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id)  ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id)   ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, employee_id)
);

-- ── Scheduled Messages (queued per channel) ───────────────────
CREATE TABLE scheduled_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES campaigns(id)  ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id)   ON DELETE CASCADE,
  channel         campaign_channel_type NOT NULL,
  scheduled_for   TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','sent','failed')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scheduled_messages_pending
  ON scheduled_messages (scheduled_for)
  WHERE status = 'pending';

-- ── Campaign Events (unified immutable tracking) ───────────────
CREATE TABLE campaign_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id)  ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id)   ON DELETE CASCADE,
  channel     campaign_channel_type NOT NULL,
  event_type  event_type NOT NULL,
  metadata    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partition-friendly index for dashboard queries
CREATE INDEX idx_campaign_events_campaign   ON campaign_events (campaign_id, occurred_at DESC);
CREATE INDEX idx_campaign_events_employee   ON campaign_events (employee_id, occurred_at DESC);
CREATE INDEX idx_campaign_events_type       ON campaign_events (event_type);

-- ── Voice Evaluations (Retell AI post-call) ───────────────────
CREATE TABLE voice_evaluations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id)  ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id)   ON DELETE CASCADE,
  call_id     TEXT UNIQUE,                        -- Retell call_id
  transcript  TEXT,
  evaluation  JSONB,                              -- Retell scoring payload
  caught      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SSO Nonces (replay attack prevention) ────────────────────
CREATE TABLE sso_nonces (
  nonce     TEXT PRIMARY KEY,
  used_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id   UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

-- ── Audit Log ─────────────────────────────────────────────────
CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   UUID,
  old_data      JSONB,
  new_data      JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Triggers: updated_at ─────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_campaign_packages_updated_at
  BEFORE UPDATE ON campaign_packages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Trigger: auto-create user_profile on auth.users insert ───
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'training_admin'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── RLS: Enable on all tables ─────────────────────────────────
ALTER TABLE organizations                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organization_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_packages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_templates               ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_mail_templates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_channels             ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_targets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_evaluations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_nonces                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                     ENABLE ROW LEVEL SECURITY;

-- ── Helper: get calling user's role ──────────────────────────
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── Helper: get calling user's org IDs ───────────────────────
CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY(
    SELECT organization_id
    FROM user_organization_assignments
    WHERE user_id = auth.uid() AND is_active = true
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── RLS Policies ─────────────────────────────────────────────

-- user_profiles: users can read/update their own profile
CREATE POLICY "users_read_own_profile" ON user_profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_own_profile" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "platform_admins_read_all_profiles" ON user_profiles
  FOR SELECT USING (get_my_role() IN ('master_admin', 'global_admin'));

CREATE POLICY "platform_admins_update_all_profiles" ON user_profiles
  FOR UPDATE USING (get_my_role() IN ('master_admin', 'global_admin'));

-- organizations: platform admins see all; training_admin sees their own
CREATE POLICY "platform_admins_all_orgs" ON organizations
  FOR ALL USING (get_my_role() IN ('master_admin', 'global_admin'));

CREATE POLICY "training_admin_read_own_org" ON organizations
  FOR SELECT USING (id = ANY(get_my_org_ids()));

-- employees: platform admins see all; training_admin sees their org's
CREATE POLICY "platform_admins_all_employees" ON employees
  FOR ALL USING (get_my_role() IN ('master_admin', 'global_admin'));

CREATE POLICY "training_admin_own_employees" ON employees
  FOR ALL USING (organization_id = ANY(get_my_org_ids()));

-- campaigns: platform admins see all; training_admin sees their org's
CREATE POLICY "platform_admins_all_campaigns" ON campaigns
  FOR ALL USING (get_my_role() IN ('master_admin', 'global_admin'));

CREATE POLICY "training_admin_own_campaigns" ON campaigns
  FOR ALL USING (organization_id = ANY(get_my_org_ids()));

-- campaign_events: platform admins see all; training_admin sees their org's
CREATE POLICY "platform_admins_all_events" ON campaign_events
  FOR SELECT USING (get_my_role() IN ('master_admin', 'global_admin'));

CREATE POLICY "training_admin_own_events" ON campaign_events
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE organization_id = ANY(get_my_org_ids())
    )
  );

-- campaign_packages: platform admins see all; training_admin sees their org's
CREATE POLICY "platform_admins_all_packages" ON campaign_packages
  FOR ALL USING (get_my_role() IN ('master_admin', 'global_admin'));

CREATE POLICY "training_admin_read_own_packages" ON campaign_packages
  FOR SELECT USING (organization_id = ANY(get_my_org_ids()));

-- Templates: platform admins + org-scoped training admins
CREATE POLICY "email_templates_access" ON email_templates
  FOR SELECT USING (
    is_global = true
    OR organization_id = ANY(get_my_org_ids())
    OR get_my_role() IN ('master_admin', 'global_admin')
  );
CREATE POLICY "email_templates_write" ON email_templates
  FOR ALL USING (
    organization_id = ANY(get_my_org_ids())
    OR get_my_role() IN ('master_admin', 'global_admin')
  );

CREATE POLICY "sms_templates_access" ON sms_templates
  FOR SELECT USING (
    is_global = true
    OR organization_id = ANY(get_my_org_ids())
    OR get_my_role() IN ('master_admin', 'global_admin')
  );
CREATE POLICY "sms_templates_write" ON sms_templates
  FOR ALL USING (
    organization_id = ANY(get_my_org_ids())
    OR get_my_role() IN ('master_admin', 'global_admin')
  );

CREATE POLICY "voice_templates_access" ON voice_templates
  FOR SELECT USING (
    is_global = true
    OR organization_id = ANY(get_my_org_ids())
    OR get_my_role() IN ('master_admin', 'global_admin')
  );
CREATE POLICY "voice_templates_write" ON voice_templates
  FOR ALL USING (
    organization_id = ANY(get_my_org_ids())
    OR get_my_role() IN ('master_admin', 'global_admin')
  );

CREATE POLICY "directmail_templates_access" ON direct_mail_templates
  FOR SELECT USING (
    is_global = true
    OR organization_id = ANY(get_my_org_ids())
    OR get_my_role() IN ('master_admin', 'global_admin')
  );
CREATE POLICY "directmail_templates_write" ON direct_mail_templates
  FOR ALL USING (
    organization_id = ANY(get_my_org_ids())
    OR get_my_role() IN ('master_admin', 'global_admin')
  );

-- audit_log: platform admins only
CREATE POLICY "platform_admins_read_audit" ON audit_log
  FOR SELECT USING (get_my_role() IN ('master_admin', 'global_admin'));

-- sso_nonces: service role only (Edge Functions use service_role key)
CREATE POLICY "service_role_sso_nonces" ON sso_nonces
  FOR ALL USING (false);  -- blocked for all JWT users; service_role bypasses RLS

-- ── Materialized View: Campaign Stats ─────────────────────────
CREATE MATERIALIZED VIEW campaign_stats AS
SELECT
  c.id                                             AS campaign_id,
  c.organization_id,
  c.name                                           AS campaign_name,
  ce.channel,
  COUNT(*) FILTER (WHERE ce.event_type = 'sent')          AS total_sent,
  COUNT(*) FILTER (WHERE ce.event_type = 'delivered')     AS total_delivered,
  COUNT(*) FILTER (WHERE ce.event_type = 'opened')        AS total_opened,
  COUNT(*) FILTER (WHERE ce.event_type = 'clicked')       AS total_clicked,
  COUNT(*) FILTER (WHERE ce.event_type = 'form_submitted') AS total_form_submitted,
  COUNT(*) FILTER (WHERE ce.event_type = 'caught')        AS total_caught,
  CASE
    WHEN COUNT(*) FILTER (WHERE ce.event_type = 'sent') = 0 THEN 0
    ELSE ROUND(
      COUNT(*) FILTER (WHERE ce.event_type = 'caught')::numeric /
      COUNT(*) FILTER (WHERE ce.event_type = 'sent')::numeric * 100,
      1
    )
  END                                              AS catch_rate
FROM campaigns c
LEFT JOIN campaign_events ce ON ce.campaign_id = c.id
GROUP BY c.id, c.organization_id, c.name, ce.channel;

CREATE UNIQUE INDEX idx_campaign_stats ON campaign_stats (campaign_id, channel);

-- ── pg_cron: Refresh stats every 15 minutes ───────────────────
-- Uncomment once pg_cron extension is enabled on the project:
-- SELECT cron.schedule(
--   'refresh-campaign-stats',
--   '*/15 * * * *',
--   'REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_stats'
-- );

-- ── pg_cron: Expire SSO nonces ────────────────────────────────
-- SELECT cron.schedule(
--   'expire-sso-nonces',
--   '*/5 * * * *',
--   'DELETE FROM sso_nonces WHERE used_at < NOW() - INTERVAL ''10 minutes'''
-- );
