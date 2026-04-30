-- ============================================================
-- PhishRx — Audit log writes
-- Migration: 20260428000009_audit_log_writes
--
-- The audit_log table existed with RLS enabled and only a SELECT
-- policy for platform admins, so writes were blocked for everyone.
-- This migration:
--   1. Adds an INSERT policy so any authenticated user can write
--      audit rows for actions they take (actor_id = auth.uid()).
--   2. Adds composite indexes for the audit log viewer's filters.
-- ============================================================

-- Allow any authenticated user to INSERT audit rows attributed to themselves.
-- They cannot write rows attributed to OTHER users (actor_id mismatch).
CREATE POLICY "users_write_own_audit" ON audit_log
  FOR INSERT WITH CHECK (actor_id = auth.uid());

-- Indexes for the audit viewer:
--   * Most queries filter by date range — most-recent first
--   * Per-actor and per-resource filters for drill-down
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON audit_log (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_resource
  ON audit_log (resource_type, resource_id, created_at DESC);
