-- ============================================================
-- PhishRx — Capture invite metadata (first_name, last_name)
-- Migration: 20260428000008_invite_user_metadata
--
-- The original handle_new_user trigger only copied email + role from
-- auth.users metadata. When platform admins invite a new training admin
-- via invite-user, the invite carries first_name + last_name in
-- raw_user_meta_data — copy those into user_profiles too so the user's
-- profile is fully populated by the time they accept the invite.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, email, role, first_name, last_name
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'training_admin'
    ),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
