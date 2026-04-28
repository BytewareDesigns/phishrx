-- ============================================================
-- PhishRx — Fix handle_new_user trigger
-- Migration: 20260428000003_fix_handle_new_user
--
-- Problems with the original:
--   1. Missing SET search_path = public — type resolution for custom
--      enums is unreliable without it in SECURITY DEFINER functions.
--   2. COALESCE(expr::user_role, 'training_admin') — PostgreSQL cannot
--      implicitly cast a text literal to a custom enum; this throws
--      "invalid input value for enum user_role" on invite/create.
--   3. No exception handling — any error in the trigger bubbles up as
--      "Database error saving new user" and blocks user creation.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _role public.user_role := 'training_admin';
BEGIN
  -- Safely parse an explicit role from user metadata.
  -- Falls back to training_admin for any invalid or missing value.
  BEGIN
    IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
      _role := (NEW.raw_user_meta_data->>'role')::public.user_role;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    _role := 'training_admin';
  END;

  INSERT INTO public.user_profiles (id, email, role)
  VALUES (NEW.id, NEW.email, _role)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
