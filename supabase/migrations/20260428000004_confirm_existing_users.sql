-- ============================================================
-- PhishRx — Confirm existing unconfirmed auth users (staging)
-- Migration: 20260428000004_confirm_existing_users
--
-- Context:
--   Staging project had mailer_autoconfirm=false initially.
--   Any users created before this migration may have
--   email_confirmed_at = NULL, which causes Supabase to return
--   "Invalid login credentials" (not "Email not confirmed") in
--   newer auth versions — blocking direct password sign-in.
--
--   Production users are created via SSO (email_confirm: true
--   in createUser call), so this only affects staging test accounts.
-- ============================================================

UPDATE auth.users
SET
  email_confirmed_at = NOW(),
  updated_at         = NOW()
WHERE
  email_confirmed_at IS NULL
  AND deleted_at IS NULL;
