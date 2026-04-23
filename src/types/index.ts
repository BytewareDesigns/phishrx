// ============================================================
// PhishRx — Core TypeScript Types
// ============================================================

export type UserRole = "master_admin" | "global_admin" | "training_admin";

export type CampaignChannel = "email" | "sms" | "voice" | "direct_mail";

export type CampaignStatus = "draft" | "scheduled" | "active" | "paused" | "completed" | "cancelled" | "archived";

export type EventType =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "form_submitted"
  | "call_answered"
  | "call_completed"
  | "qr_scanned"
  | "caught";

// ------------------------------------------------------------
// User / Auth
// ------------------------------------------------------------

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  title: string | null;
  role: UserRole;
  pending_role: string | null;
  medcurity_user_id: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile | null;
}

// ------------------------------------------------------------
// Organization
// ------------------------------------------------------------

export interface Organization {
  id: string;
  name: string;
  external_company_id: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserOrganizationAssignment {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  is_active: boolean;
  assigned_at: string;
  assigned_by_integration: boolean;
}

// ------------------------------------------------------------
// Campaign Package (Integration API subscription)
// ------------------------------------------------------------

export interface CampaignPackage {
  id: string;
  organization_id: string;
  external_subscription_id: string;
  channels_enabled: CampaignChannel[];
  total_seats: number;
  used_seats: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------
// Employees (Targets)
// ------------------------------------------------------------

export interface Employee {
  id: string;
  organization_id: string;
  medcurity_user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  department: string | null;
  job_title: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------
// Templates
// ------------------------------------------------------------

export interface EmailTemplate {
  id: string;
  organization_id: string | null; // null = global template
  name: string;
  subject: string;
  from_name: string;
  from_email: string;
  html_body: string;
  landing_scenario: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  is_global: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmsTemplate {
  id: string;
  organization_id: string | null;
  name: string;
  body: string;
  sender_id: string | null;
  tracking_url_placeholder: string | null;
  is_global: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoiceTemplate {
  id: string;
  organization_id: string | null;
  name: string;
  retell_agent_id: string;
  prompt_summary: string | null;
  is_global: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DirectMailTemplate {
  id: string;
  organization_id: string | null;
  name: string;
  lob_template_id: string;
  description: string | null;
  qr_code_url_placeholder: string | null;
  is_global: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ------------------------------------------------------------
// Campaigns
// ------------------------------------------------------------

export interface Campaign {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignChannelRow {
  id: string;
  campaign_id: string;
  channel: CampaignChannel;
  email_template_id: string | null;
  sms_template_id: string | null;
  voice_template_id: string | null;
  directmail_template_id: string | null;
  is_active: boolean;
  created_at: string;
}

// ------------------------------------------------------------
// Events
// ------------------------------------------------------------

export interface CampaignEvent {
  id: string;
  campaign_id: string;
  employee_id: string;
  channel: CampaignChannel;
  event_type: EventType;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  occurred_at: string;
}

// ------------------------------------------------------------
// Dashboard stats
// ------------------------------------------------------------

export interface CampaignStats {
  campaign_id: string;
  campaign_name: string;
  channel: string;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_form_submitted: number;
  catch_rate: number;
}

export interface OrgRiskSummary {
  organization_id: string;
  total_employees: number;
  total_campaigns: number;
  overall_catch_rate: number;
  highest_risk_department: string | null;
}
