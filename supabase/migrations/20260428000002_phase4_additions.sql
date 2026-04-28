-- ============================================================
-- PhishRx — Phase 4 additions
-- Migration: 20260428000002_phase4_additions
-- ============================================================

-- ── email_templates: add difficulty ──────────────────────────
ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS difficulty TEXT
  CHECK (difficulty IN ('easy', 'medium', 'hard'));

-- ── sms_templates: add sender_id ─────────────────────────────
ALTER TABLE sms_templates
  ADD COLUMN IF NOT EXISTS sender_id TEXT;

-- ── employees: add physical address fields (for direct mail) ─
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS city          TEXT;
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS state         TEXT;
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS zip           TEXT;
