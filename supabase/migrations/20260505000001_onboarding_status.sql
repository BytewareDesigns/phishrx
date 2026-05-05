-- ============================================================
-- PhishRx — Onboarding completion tracking
-- Migration: 20260505000001_onboarding_status
--
-- New training admins land on a guided 5-step Getting Started page
-- the first time they enter their org's dashboard. Once they reach
-- the "watch live results" step (i.e. they've successfully launched
-- their first campaign), we stamp this column so the auto-redirect
-- from /dashboard → /dashboard/getting-started stops firing.
--
-- Master/global admins can also see this column in the org detail
-- page to know which client orgs have actually completed setup.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Stamp existing orgs that already have a launched campaign — they're
-- effectively past onboarding even though the column didn't exist when
-- they got there. Avoids forcing real users back through Getting Started.
UPDATE organizations o
SET onboarding_completed_at = COALESCE(
  (
    SELECT MIN(c.created_at)
    FROM campaigns c
    WHERE c.organization_id = o.id
      AND c.status <> 'draft'
  ),
  NULL
)
WHERE onboarding_completed_at IS NULL;

COMMENT ON COLUMN organizations.onboarding_completed_at IS
  'Stamped when a training admin first reaches the "view results" step of '
  'Getting Started, indicating their org is past first-time setup.';
