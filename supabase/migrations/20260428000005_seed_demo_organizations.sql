-- ============================================================
-- PhishRx — Demo Organization Seed Data
-- Migration: 20260428000005_seed_demo_organizations
--
-- Creates 3 fully-populated demo organizations:
--   1. Riverside Medical Center  (sarah.johnson@riversidemedical.com)
--   2. Pacific Dental Group      (mike.chen@pacificdental.com)
--   3. Summit Health Partners    (amanda.torres@summithealth.com)
--
-- Auth users created separately via Admin API:
--   SARAH_ID  = 7718d153-c902-4b6e-9d59-6cf0f5f677d8
--   MIKE_ID   = 497f1fd0-2237-4ed6-a850-3cb7bba48fa7
--   AMANDA_ID = 091c6439-aa36-4201-80a0-785435a64ac2
-- ============================================================

-- ── 1. Organizations ─────────────────────────────────────────

INSERT INTO public.organizations (id, name, external_company_id, is_active) VALUES
  ('aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa', 'Riverside Medical Center', 'medcurity-rmc-001', true),
  ('aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa', 'Pacific Dental Group',     'medcurity-pdg-002', true),
  ('aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa', 'Summit Health Partners',   'medcurity-shp-003', true);


-- ── 2. Training Admin Profiles ───────────────────────────────
-- Auth users were created via Admin API; handle_new_user trigger
-- already inserted rows with role='training_admin'. Update them.

UPDATE public.user_profiles SET
  first_name        = 'Sarah',
  last_name         = 'Johnson',
  title             = 'Security & Compliance Manager',
  role              = 'training_admin',
  medcurity_user_id = 'mcu-riverside-001'
WHERE id = '7718d153-c902-4b6e-9d59-6cf0f5f677d8';

UPDATE public.user_profiles SET
  first_name        = 'Mike',
  last_name         = 'Chen',
  title             = 'Office Manager',
  role              = 'training_admin',
  medcurity_user_id = 'mcu-pacific-001'
WHERE id = '497f1fd0-2237-4ed6-a850-3cb7bba48fa7';

UPDATE public.user_profiles SET
  first_name        = 'Amanda',
  last_name         = 'Torres',
  title             = 'IT Director',
  role              = 'training_admin',
  medcurity_user_id = 'mcu-summit-001'
WHERE id = '091c6439-aa36-4201-80a0-785435a64ac2';


-- ── 3. Org Assignments ───────────────────────────────────────

INSERT INTO public.user_organization_assignments
  (user_id, organization_id, role, is_active, assigned_by_integration)
VALUES
  ('7718d153-c902-4b6e-9d59-6cf0f5f677d8', 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa', 'training_admin', true, true),
  ('497f1fd0-2237-4ed6-a850-3cb7bba48fa7', 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa', 'training_admin', true, true),
  ('091c6439-aa36-4201-80a0-785435a64ac2', 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa', 'training_admin', true, true);


-- ── 4. Campaign Packages (subscriptions) ─────────────────────

INSERT INTO public.campaign_packages
  (organization_id, external_subscription_id, channels_enabled, total_seats, used_seats, start_date, end_date, is_active)
VALUES
  (
    'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
    'sub-rmc-2026-001',
    ARRAY['email','sms']::campaign_channel_type[],
    75, 0,
    '2026-01-01T00:00:00Z',
    '2027-01-01T00:00:00Z',
    true
  ),
  (
    'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
    'sub-pdg-2026-001',
    ARRAY['email']::campaign_channel_type[],
    30, 0,
    '2026-01-01T00:00:00Z',
    '2027-01-01T00:00:00Z',
    true
  ),
  (
    'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
    'sub-shp-2026-001',
    ARRAY['email','sms','voice']::campaign_channel_type[],
    120, 0,
    '2026-01-01T00:00:00Z',
    '2027-01-01T00:00:00Z',
    true
  );


-- ── 5. Employees ─────────────────────────────────────────────

-- ── Riverside Medical Center (12 employees) ──────────────────
INSERT INTO public.employees
  (id, organization_id, email, first_name, last_name, department, job_title, is_active)
VALUES
  ('bbbbbbbb-0001-0001-0001-000000000001','aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa','j.kim@riversidemedical.com',        'Jennifer','Kim',       'Nursing',       'Charge Nurse',           true),
  ('bbbbbbbb-0001-0001-0001-000000000002','aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa','d.park@riversidemedical.com',       'David',   'Park',      'Radiology',     'Radiologic Technologist',true),
  ('bbbbbbbb-0001-0001-0001-000000000003','aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa','t.nguyen@riversidemedical.com',     'Tiffany', 'Nguyen',    'Administration','Medical Records Clerk',  true),
  ('bbbbbbbb-0001-0001-0001-000000000004','aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa','r.patel@riversidemedical.com',      'Raj',     'Patel',     'Pharmacy',      'Clinical Pharmacist',    true),
  ('bbbbbbbb-0001-0001-0001-000000000005','aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa','m.wilson@riversidemedical.com',     'Maria',   'Wilson',    'Nursing',       'RN - ICU',               true),
  ('bbbbbbbb-0001-0001-0001-000000000006','aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa','c.omalley@riversidemedical.com',    'Connor',  'O''Malley', 'Finance',       'Billing Specialist',     true),
  ('bbbbbbbb-0001-0001-0001-000000000007','aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa','l.rodriguez@riversidemedical.com',  'Laura',   'Rodriguez', 'Surgery',       'Surgical Tech',          true),
  ('bbbbbbbb-0001-0001-0001-000000000008','aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa','b.thompson@riversidemedical.com',   'Brian',   'Thompson',  'IT',            'Systems Analyst',        true),
  ('bbbbbbbb-0001-0001-0001-000000000009','aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa','a.hassan@riversidemedical.com',     'Amina',   'Hassan',    'Lab',           'Lab Technician',         true),
  ('bbbbbbbb-0001-0001-0001-000000000010','aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa','p.mcallister@riversidemedical.com', 'Patrick', 'McAllister','Administration','Patient Coordinator',    true),
  ('bbbbbbbb-0001-0001-0001-000000000011','aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa','s.james@riversidemedical.com',      'Sheila',  'James',     'HR',            'HR Generalist',          true),
  ('bbbbbbbb-0001-0001-0001-000000000012','aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa','e.chang@riversidemedical.com',      'Ethan',   'Chang',     'Nursing',       'CNA',                    true);

-- ── Pacific Dental Group (8 employees) ───────────────────────
INSERT INTO public.employees
  (id, organization_id, email, first_name, last_name, department, job_title, is_active)
VALUES
  ('bbbbbbbb-0002-0002-0002-000000000001','aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa','k.brooks@pacificdental.com',   'Karen',   'Brooks',   'Clinical',     'Dental Hygienist',   true),
  ('bbbbbbbb-0002-0002-0002-000000000002','aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa','j.santos@pacificdental.com',   'Jorge',   'Santos',   'Clinical',     'Dental Assistant',   true),
  ('bbbbbbbb-0002-0002-0002-000000000003','aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa','h.yoon@pacificdental.com',     'Hannah',  'Yoon',     'Front Desk',   'Receptionist',       true),
  ('bbbbbbbb-0002-0002-0002-000000000004','aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa','t.allen@pacificdental.com',    'Tyler',   'Allen',    'Billing',      'Insurance Coder',    true),
  ('bbbbbbbb-0002-0002-0002-000000000005','aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa','n.pham@pacificdental.com',     'Nancy',   'Pham',     'Clinical',     'Dental Hygienist',   true),
  ('bbbbbbbb-0002-0002-0002-000000000006','aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa','w.moore@pacificdental.com',    'William', 'Moore',    'Clinical',     'Dental Assistant',   true),
  ('bbbbbbbb-0002-0002-0002-000000000007','aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa','g.reyes@pacificdental.com',    'Gloria',  'Reyes',    'Front Desk',   'Scheduling Coord.',  true),
  ('bbbbbbbb-0002-0002-0002-000000000008','aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa','d.scott@pacificdental.com',    'Derek',   'Scott',    'Administration','Practice Manager',  true);

-- ── Summit Health Partners (14 employees) ────────────────────
INSERT INTO public.employees
  (id, organization_id, email, first_name, last_name, department, job_title, is_active)
VALUES
  ('bbbbbbbb-0003-0003-0003-000000000001','aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa','l.foster@summithealth.com',    'Lisa',    'Foster',    'Clinical Ops',  'Nurse Practitioner', true),
  ('bbbbbbbb-0003-0003-0003-000000000002','aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa','a.martin@summithealth.com',    'Aaron',   'Martin',    'IT',            'Network Engineer',   true),
  ('bbbbbbbb-0003-0003-0003-000000000003','aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa','o.white@summithealth.com',     'Olivia',  'White',     'HR',            'Benefits Admin',     true),
  ('bbbbbbbb-0003-0003-0003-000000000004','aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa','k.jackson@summithealth.com',   'Kevin',   'Jackson',   'Finance',       'Controller',         true),
  ('bbbbbbbb-0003-0003-0003-000000000005','aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa','p.lewis@summithealth.com',     'Patricia','Lewis',     'Clinical Ops',  'Medical Assistant',  true),
  ('bbbbbbbb-0003-0003-0003-000000000006','aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa','m.harris@summithealth.com',    'Marcus',  'Harris',    'Compliance',    'Compliance Officer', true),
  ('bbbbbbbb-0003-0003-0003-000000000007','aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa','r.clark@summithealth.com',     'Rachel',  'Clark',     'IT',            'Help Desk Analyst',  true),
  ('bbbbbbbb-0003-0003-0003-000000000008','aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa','v.wright@summithealth.com',    'Victor',  'Wright',    'Administration','Executive Assistant', true),
  ('bbbbbbbb-0003-0003-0003-000000000009','aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa','j.hall@summithealth.com',      'Janet',   'Hall',      'Clinical Ops',  'Phlebotomist',       true),
  ('bbbbbbbb-0003-0003-0003-000000000010','aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa','c.young@summithealth.com',     'Carlos',  'Young',     'Finance',       'AR Specialist',      true),
  ('bbbbbbbb-0003-0003-0003-000000000011','aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa','b.king@summithealth.com',      'Brenda',  'King',      'HR',            'Recruiter',          true),
  ('bbbbbbbb-0003-0003-0003-000000000012','aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa','s.hernandez@summithealth.com', 'Steven',  'Hernandez', 'IT',            'Systems Admin',      true),
  ('bbbbbbbb-0003-0003-0003-000000000013','aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa','d.baker@summithealth.com',     'Diane',   'Baker',     'Clinical Ops',  'Care Coordinator',   true),
  ('bbbbbbbb-0003-0003-0003-000000000014','aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa','f.garcia@summithealth.com',    'Felix',   'Garcia',    'Compliance',    'Privacy Officer',    true);


-- ── 6. Global Email Templates ────────────────────────────────

INSERT INTO public.email_templates
  (id, organization_id, name, subject, from_name, from_email, html_body, difficulty, is_global, created_by)
VALUES
  (
    'cccccccc-0001-0001-0001-000000000001',
    NULL,
    'IT Password Reset Alert',
    'URGENT: Your password expires in 24 hours',
    'IT Help Desk',
    'helpdesk@medcurity-secure.com',
    '<p>Dear {{FIRST_NAME}},</p><p>Your network password will expire in <strong>24 hours</strong>. Click below to reset it now to avoid losing access to patient systems.</p><p><a href="{{PHISHING_LINK}}">Reset My Password Now</a></p><p>If you did not request this, contact IT at ext. 4400.</p><p>IT Help Desk<br>{{PIXEL_URL}}</p>',
    'easy',
    true,
    '3488b45b-f989-403f-99b5-672645495f5d'
  ),
  (
    'cccccccc-0002-0002-0002-000000000002',
    NULL,
    'HR Benefits Enrollment',
    'Action Required: Open Enrollment Closes Friday',
    'HR Benefits Team',
    'benefits@medcurity-hr.net',
    '<p>Hi {{FIRST_NAME}},</p><p>Open enrollment for 2027 benefits closes <strong>this Friday at 5:00 PM</strong>. You have not yet confirmed your selections.</p><p><a href="{{PHISHING_LINK}}">Review & Confirm My Benefits</a></p><p>Questions? Reply to this email.<br>— HR Benefits<br>{{PIXEL_URL}}</p>',
    'medium',
    true,
    '3488b45b-f989-403f-99b5-672645495f5d'
  ),
  (
    'cccccccc-0003-0003-0003-000000000003',
    NULL,
    'DocuSign: Signature Required',
    'DocuSign: Please sign "2026 Policy Acknowledgment"',
    'DocuSign via Medcurity',
    'dse_na4@docusign.net.medcurity-docs.com',
    '<p>{{FIRST_NAME}} {{LAST_NAME}},</p><p>Your organization has sent you a document to review and sign:</p><blockquote><strong>2026 HIPAA & Security Policy Acknowledgment</strong></blockquote><p><a href="{{PHISHING_LINK}}">Review Document</a></p><p>This link expires in 72 hours.<br>{{PIXEL_URL}}</p>',
    'hard',
    true,
    '3488b45b-f989-403f-99b5-672645495f5d'
  );


-- ── 7. Campaigns ─────────────────────────────────────────────

-- Riverside Medical: 1 completed + 1 draft
INSERT INTO public.campaigns
  (id, organization_id, name, description, status, start_date, end_date, created_by)
VALUES
  (
    'dddddddd-0001-0001-0001-000000000001',
    'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
    'Q1 2026 — Password Reset Phish',
    'Baseline phishing awareness test using IT password reset lure.',
    'completed',
    '2026-02-01T09:00:00Z',
    '2026-02-15T17:00:00Z',
    '7718d153-c902-4b6e-9d59-6cf0f5f677d8'
  ),
  (
    'dddddddd-0001-0001-0001-000000000002',
    'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
    'Q2 2026 — Benefits Enrollment Lure',
    'HR-themed simulation targeting open enrollment period.',
    'draft',
    NULL,
    NULL,
    '7718d153-c902-4b6e-9d59-6cf0f5f677d8'
  );

-- Pacific Dental: 1 completed + 1 draft
INSERT INTO public.campaigns
  (id, organization_id, name, description, status, start_date, end_date, created_by)
VALUES
  (
    'dddddddd-0002-0002-0002-000000000001',
    'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
    'Jan 2026 — DocuSign Simulation',
    'Tests awareness of impersonated DocuSign phishing attempts.',
    'completed',
    '2026-01-10T08:00:00Z',
    '2026-01-24T17:00:00Z',
    '497f1fd0-2237-4ed6-a850-3cb7bba48fa7'
  ),
  (
    'dddddddd-0002-0002-0002-000000000002',
    'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
    'Mar 2026 — Password Reset Follow-up',
    'Re-test after January training rollout.',
    'draft',
    NULL,
    NULL,
    '497f1fd0-2237-4ed6-a850-3cb7bba48fa7'
  );

-- Summit Health: 2 completed + 1 draft
INSERT INTO public.campaigns
  (id, organization_id, name, description, status, start_date, end_date, created_by)
VALUES
  (
    'dddddddd-0003-0003-0003-000000000001',
    'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
    'Q4 2025 — IT Reset Baseline',
    'Initial baseline assessment across all departments.',
    'completed',
    '2025-11-01T08:00:00Z',
    '2025-11-15T17:00:00Z',
    '091c6439-aa36-4201-80a0-785435a64ac2'
  ),
  (
    'dddddddd-0003-0003-0003-000000000002',
    'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
    'Q1 2026 — Benefits Enrollment Lure',
    'Follow-up campaign measuring post-training improvement.',
    'completed',
    '2026-02-10T08:00:00Z',
    '2026-02-24T17:00:00Z',
    '091c6439-aa36-4201-80a0-785435a64ac2'
  ),
  (
    'dddddddd-0003-0003-0003-000000000003',
    'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
    'Q2 2026 — DocuSign Multi-Channel',
    'Advanced multi-channel test: email + SMS + voice.',
    'draft',
    NULL,
    NULL,
    '091c6439-aa36-4201-80a0-785435a64ac2'
  );


-- ── 8. Campaign Channels ─────────────────────────────────────

INSERT INTO public.campaign_channels (campaign_id, channel, email_template_id, is_active)
VALUES
  ('dddddddd-0001-0001-0001-000000000001','email','cccccccc-0001-0001-0001-000000000001', true),
  ('dddddddd-0001-0001-0001-000000000002','email','cccccccc-0002-0002-0002-000000000002', true),
  ('dddddddd-0002-0002-0002-000000000001','email','cccccccc-0003-0003-0003-000000000003', true),
  ('dddddddd-0002-0002-0002-000000000002','email','cccccccc-0001-0001-0001-000000000001', true),
  ('dddddddd-0003-0003-0003-000000000001','email','cccccccc-0001-0001-0001-000000000001', true),
  ('dddddddd-0003-0003-0003-000000000002','email','cccccccc-0002-0002-0002-000000000002', true),
  ('dddddddd-0003-0003-0003-000000000003','email','cccccccc-0003-0003-0003-000000000003', true);


-- ── 9. Campaign Targets ──────────────────────────────────────

-- Riverside Q1 (campaign 1): all 12 employees
INSERT INTO public.campaign_targets (campaign_id, employee_id)
SELECT 'dddddddd-0001-0001-0001-000000000001', id
FROM   public.employees
WHERE  organization_id = 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa';

-- Pacific Jan (campaign 1): all 8 employees
INSERT INTO public.campaign_targets (campaign_id, employee_id)
SELECT 'dddddddd-0002-0002-0002-000000000001', id
FROM   public.employees
WHERE  organization_id = 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa';

-- Summit Q4 2025 (campaign 1): all 14 employees
INSERT INTO public.campaign_targets (campaign_id, employee_id)
SELECT 'dddddddd-0003-0003-0003-000000000001', id
FROM   public.employees
WHERE  organization_id = 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa';

-- Summit Q1 2026 (campaign 2): all 14 employees
INSERT INTO public.campaign_targets (campaign_id, employee_id)
SELECT 'dddddddd-0003-0003-0003-000000000002', id
FROM   public.employees
WHERE  organization_id = 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa';


-- ── 10. Campaign Events (Simulated History) ───────────────────
-- Riverside Q1 — 12 sent, 9 opened, 4 clicked/caught

INSERT INTO public.campaign_events (campaign_id, employee_id, channel, event_type, occurred_at)
SELECT 'dddddddd-0001-0001-0001-000000000001', id, 'email', 'sent',
       '2026-02-01T09:05:00Z'::timestamptz + (row_number() OVER () * interval '3 minutes')
FROM   public.employees WHERE organization_id = 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa';

INSERT INTO public.campaign_events (campaign_id, employee_id, channel, event_type, occurred_at)
SELECT 'dddddddd-0001-0001-0001-000000000001', id, 'email', 'opened',
       '2026-02-01T09:30:00Z'::timestamptz + (row_number() OVER () * interval '17 minutes')
FROM   public.employees
WHERE  organization_id = 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa'
LIMIT  9;

INSERT INTO public.campaign_events (campaign_id, employee_id, channel, event_type, occurred_at)
SELECT 'dddddddd-0001-0001-0001-000000000001', id, 'email', 'clicked',
       '2026-02-01T10:15:00Z'::timestamptz + (row_number() OVER () * interval '23 minutes')
FROM   public.employees
WHERE  organization_id = 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa'
LIMIT  4;

INSERT INTO public.campaign_events (campaign_id, employee_id, channel, event_type, occurred_at)
SELECT 'dddddddd-0001-0001-0001-000000000001', id, 'email', 'caught',
       '2026-02-01T10:16:00Z'::timestamptz + (row_number() OVER () * interval '23 minutes')
FROM   public.employees
WHERE  organization_id = 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa'
LIMIT  4;

-- Pacific Jan — 8 sent, 6 opened, 3 clicked/caught
INSERT INTO public.campaign_events (campaign_id, employee_id, channel, event_type, occurred_at)
SELECT 'dddddddd-0002-0002-0002-000000000001', id, 'email', 'sent',
       '2026-01-10T08:05:00Z'::timestamptz + (row_number() OVER () * interval '2 minutes')
FROM   public.employees WHERE organization_id = 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa';

INSERT INTO public.campaign_events (campaign_id, employee_id, channel, event_type, occurred_at)
SELECT 'dddddddd-0002-0002-0002-000000000001', id, 'email', 'opened',
       '2026-01-10T08:45:00Z'::timestamptz + (row_number() OVER () * interval '12 minutes')
FROM   public.employees WHERE organization_id = 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa'
LIMIT  6;

INSERT INTO public.campaign_events (campaign_id, employee_id, channel, event_type, occurred_at)
SELECT 'dddddddd-0002-0002-0002-000000000001', id, 'email', 'clicked',
       '2026-01-10T09:20:00Z'::timestamptz + (row_number() OVER () * interval '18 minutes')
FROM   public.employees WHERE organization_id = 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa'
LIMIT  3;

INSERT INTO public.campaign_events (campaign_id, employee_id, channel, event_type, occurred_at)
SELECT 'dddddddd-0002-0002-0002-000000000001', id, 'email', 'caught',
       '2026-01-10T09:21:00Z'::timestamptz + (row_number() OVER () * interval '18 minutes')
FROM   public.employees WHERE organization_id = 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa'
LIMIT  3;

-- Summit Q4 2025 — 14 sent, 11 opened, 7 clicked/caught (high catch rate baseline)
INSERT INTO public.campaign_events (campaign_id, employee_id, channel, event_type, occurred_at)
SELECT 'dddddddd-0003-0003-0003-000000000001', id, 'email', 'sent',
       '2025-11-01T08:05:00Z'::timestamptz + (row_number() OVER () * interval '2 minutes')
FROM   public.employees WHERE organization_id = 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa';

INSERT INTO public.campaign_events (campaign_id, employee_id, channel, event_type, occurred_at)
SELECT 'dddddddd-0003-0003-0003-000000000001', id, 'email', 'opened',
       '2025-11-01T09:00:00Z'::timestamptz + (row_number() OVER () * interval '10 minutes')
FROM   public.employees WHERE organization_id = 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa'
LIMIT  11;

INSERT INTO public.campaign_events (campaign_id, employee_id, channel, event_type, occurred_at)
SELECT 'dddddddd-0003-0003-0003-000000000001', id, 'email', 'clicked',
       '2025-11-01T09:45:00Z'::timestamptz + (row_number() OVER () * interval '15 minutes')
FROM   public.employees WHERE organization_id = 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa'
LIMIT  7;

INSERT INTO public.campaign_events (campaign_id, employee_id, channel, event_type, occurred_at)
SELECT 'dddddddd-0003-0003-0003-000000000001', id, 'email', 'caught',
       '2025-11-01T09:46:00Z'::timestamptz + (row_number() OVER () * interval '15 minutes')
FROM   public.employees WHERE organization_id = 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa'
LIMIT  7;

-- Summit Q1 2026 — 14 sent, 12 opened, 3 clicked/caught (improvement after training!)
INSERT INTO public.campaign_events (campaign_id, employee_id, channel, event_type, occurred_at)
SELECT 'dddddddd-0003-0003-0003-000000000002', id, 'email', 'sent',
       '2026-02-10T08:05:00Z'::timestamptz + (row_number() OVER () * interval '2 minutes')
FROM   public.employees WHERE organization_id = 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa';

INSERT INTO public.campaign_events (campaign_id, employee_id, channel, event_type, occurred_at)
SELECT 'dddddddd-0003-0003-0003-000000000002', id, 'email', 'opened',
       '2026-02-10T09:00:00Z'::timestamptz + (row_number() OVER () * interval '8 minutes')
FROM   public.employees WHERE organization_id = 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa'
LIMIT  12;

INSERT INTO public.campaign_events (campaign_id, employee_id, channel, event_type, occurred_at)
SELECT 'dddddddd-0003-0003-0003-000000000002', id, 'email', 'clicked',
       '2026-02-10T09:30:00Z'::timestamptz + (row_number() OVER () * interval '20 minutes')
FROM   public.employees WHERE organization_id = 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa'
LIMIT  3;

INSERT INTO public.campaign_events (campaign_id, employee_id, channel, event_type, occurred_at)
SELECT 'dddddddd-0003-0003-0003-000000000002', id, 'email', 'caught',
       '2026-02-10T09:31:00Z'::timestamptz + (row_number() OVER () * interval '20 minutes')
FROM   public.employees WHERE organization_id = 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa'
LIMIT  3;
