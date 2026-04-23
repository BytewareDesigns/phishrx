// ============================================================
// PhishRx — Supabase Database Types
// Run `supabase gen types typescript --project-id zkbrrlbwwckgqepeozjd` to regenerate
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type UserRole       = "master_admin" | "global_admin" | "training_admin";
type CampaignChannel = "email" | "sms" | "voice" | "direct_mail";
type CampaignStatus  = "draft" | "scheduled" | "active" | "paused" | "completed" | "cancelled" | "archived";
type EventType       = "sent" | "delivered" | "opened" | "clicked" | "form_submitted" | "call_answered" | "call_completed" | "qr_scanned" | "caught";
type Difficulty      = "easy" | "medium" | "hard";

// ── Helper to build Insert / Update from Row ──────────────────
type Insert<T, RequiredKeys extends keyof T = never> =
  Omit<T, "id" | "created_at" | "updated_at"> &
  Partial<{ medcurity_user_id: string | null; logo_url: string | null; external_company_id: string | null }>;

export interface Database {
  public: {
    Tables: {

      // ── organizations ────────────────────────────────────────
      organizations: {
        Row: {
          id:                  string;
          name:                string;
          external_company_id: string | null;
          logo_url:            string | null;
          is_active:           boolean;
          created_at:          string;
          updated_at:          string;
        };
        Insert: {
          id?:                  string;
          name:                 string;
          external_company_id?: string | null;
          logo_url?:            string | null;
          is_active?:           boolean;
          created_at?:          string;
          updated_at?:          string;
        };
        Update: {
          id?:                  string;
          name?:                string;
          external_company_id?: string | null;
          logo_url?:            string | null;
          is_active?:           boolean;
          created_at?:          string;
          updated_at?:          string;
        };
      };

      // ── user_profiles ────────────────────────────────────────
      user_profiles: {
        Row: {
          id:                  string;
          email:               string;
          first_name:          string | null;
          last_name:           string | null;
          phone:               string | null;
          title:               string | null;
          role:                UserRole;
          pending_role:        string | null;
          medcurity_user_id:   string | null;
          is_archived:         boolean;
          archived_at:         string | null;
          created_at:          string;
          updated_at:          string;
        };
        Insert: {
          id?:                  string;
          email:                string;
          first_name?:          string | null;
          last_name?:           string | null;
          phone?:               string | null;
          title?:               string | null;
          role?:                UserRole;
          pending_role?:        string | null;
          medcurity_user_id?:   string | null;
          is_archived?:         boolean;
          archived_at?:         string | null;
          created_at?:          string;
          updated_at?:          string;
        };
        Update: {
          id?:                  string;
          email?:               string;
          first_name?:          string | null;
          last_name?:           string | null;
          phone?:               string | null;
          title?:               string | null;
          role?:                UserRole;
          pending_role?:        string | null;
          medcurity_user_id?:   string | null;
          is_archived?:         boolean;
          archived_at?:         string | null;
          created_at?:          string;
          updated_at?:          string;
        };
      };

      // ── user_organization_assignments ─────────────────────────
      user_organization_assignments: {
        Row: {
          id:                      string;
          user_id:                 string;
          organization_id:         string;
          role:                    UserRole;
          is_active:               boolean;
          assigned_at:             string;
          assigned_by_integration: boolean;
        };
        Insert: {
          id?:                      string;
          user_id:                  string;
          organization_id:          string;
          role?:                    UserRole;
          is_active?:               boolean;
          assigned_at?:             string;
          assigned_by_integration?: boolean;
        };
        Update: {
          id?:                      string;
          user_id?:                 string;
          organization_id?:         string;
          role?:                    UserRole;
          is_active?:               boolean;
          assigned_at?:             string;
          assigned_by_integration?: boolean;
        };
      };

      // ── campaign_packages ─────────────────────────────────────
      campaign_packages: {
        Row: {
          id:                       string;
          organization_id:          string;
          external_subscription_id: string;
          channels_enabled:         CampaignChannel[];
          total_seats:              number;
          used_seats:               number;
          start_date:               string;
          end_date:                 string;
          is_active:                boolean;
          created_at:               string;
          updated_at:               string;
        };
        Insert: {
          id?:                       string;
          organization_id:           string;
          external_subscription_id:  string;
          channels_enabled?:         CampaignChannel[];
          total_seats?:              number;
          used_seats?:               number;
          start_date:                string;
          end_date:                  string;
          is_active?:                boolean;
          created_at?:               string;
          updated_at?:               string;
        };
        Update: Partial<Database["public"]["Tables"]["campaign_packages"]["Insert"]>;
      };

      // ── employees ─────────────────────────────────────────────
      employees: {
        Row: {
          id:                string;
          organization_id:   string;
          medcurity_user_id: string | null;
          email:             string;
          first_name:        string;
          last_name:         string;
          phone:             string | null;
          department:        string | null;
          job_title:         string | null;
          is_active:         boolean;
          created_at:        string;
          updated_at:        string;
        };
        Insert: {
          id?:                string;
          organization_id:    string;
          medcurity_user_id?: string | null;
          email:              string;
          first_name:         string;
          last_name:          string;
          phone?:             string | null;
          department?:        string | null;
          job_title?:         string | null;
          is_active?:         boolean;
          created_at?:        string;
          updated_at?:        string;
        };
        Update: Partial<Database["public"]["Tables"]["employees"]["Insert"]>;
      };

      // ── email_templates ───────────────────────────────────────
      email_templates: {
        Row: {
          id:               string;
          organization_id:  string | null;
          name:             string;
          subject:          string;
          from_name:        string;
          from_email:       string;
          html_body:        string;
          landing_scenario: string | null;
          difficulty:       Difficulty | null;
          is_global:        boolean;
          created_by:       string | null;
          created_at:       string;
          updated_at:       string;
        };
        Insert: {
          id?:               string;
          organization_id?:  string | null;
          name:              string;
          subject:           string;
          from_name:         string;
          from_email:        string;
          html_body:         string;
          landing_scenario?: string | null;
          difficulty?:       Difficulty | null;
          is_global?:        boolean;
          created_by?:       string | null;
          created_at?:       string;
          updated_at?:       string;
        };
        Update: Partial<Database["public"]["Tables"]["email_templates"]["Insert"]>;
      };

      // ── sms_templates ─────────────────────────────────────────
      sms_templates: {
        Row: {
          id:                       string;
          organization_id:          string | null;
          name:                     string;
          body:                     string;
          sender_id:                string | null;
          tracking_url_placeholder: string | null;
          is_global:                boolean;
          created_by:               string | null;
          created_at:               string;
          updated_at:               string;
        };
        Insert: {
          id?:                       string;
          organization_id?:          string | null;
          name:                      string;
          body:                      string;
          sender_id?:                string | null;
          tracking_url_placeholder?: string | null;
          is_global?:                boolean;
          created_by?:               string | null;
          created_at?:               string;
          updated_at?:               string;
        };
        Update: Partial<Database["public"]["Tables"]["sms_templates"]["Insert"]>;
      };

      // ── voice_templates ───────────────────────────────────────
      voice_templates: {
        Row: {
          id:              string;
          organization_id: string | null;
          name:            string;
          retell_agent_id: string;
          prompt_summary:  string | null;
          is_global:       boolean;
          created_by:      string | null;
          created_at:      string;
          updated_at:      string;
        };
        Insert: {
          id?:              string;
          organization_id?: string | null;
          name:             string;
          retell_agent_id:  string;
          prompt_summary?:  string | null;
          is_global?:       boolean;
          created_by?:      string | null;
          created_at?:      string;
          updated_at?:      string;
        };
        Update: Partial<Database["public"]["Tables"]["voice_templates"]["Insert"]>;
      };

      // ── direct_mail_templates ─────────────────────────────────
      direct_mail_templates: {
        Row: {
          id:                      string;
          organization_id:         string | null;
          name:                    string;
          lob_template_id:         string;
          description:             string | null;
          qr_code_url_placeholder: string | null;
          is_global:               boolean;
          created_by:              string | null;
          created_at:              string;
          updated_at:              string;
        };
        Insert: {
          id?:                      string;
          organization_id?:         string | null;
          name:                     string;
          lob_template_id:          string;
          description?:             string | null;
          qr_code_url_placeholder?: string | null;
          is_global?:               boolean;
          created_by?:              string | null;
          created_at?:              string;
          updated_at?:              string;
        };
        Update: Partial<Database["public"]["Tables"]["direct_mail_templates"]["Insert"]>;
      };

      // ── campaigns ─────────────────────────────────────────────
      campaigns: {
        Row: {
          id:              string;
          organization_id: string;
          name:            string;
          description:     string | null;
          status:          CampaignStatus;
          start_date:      string | null;
          end_date:        string | null;
          created_by:      string | null;
          created_at:      string;
          updated_at:      string;
        };
        Insert: {
          id?:              string;
          organization_id:  string;
          name:             string;
          description?:     string | null;
          status?:          CampaignStatus;
          start_date?:      string | null;
          end_date?:        string | null;
          created_by?:      string | null;
          created_at?:      string;
          updated_at?:      string;
        };
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Insert"]>;
      };

      // ── campaign_channels ─────────────────────────────────────
      campaign_channels: {
        Row: {
          id:                     string;
          campaign_id:            string;
          channel:                CampaignChannel;
          email_template_id:      string | null;
          sms_template_id:        string | null;
          voice_template_id:      string | null;
          directmail_template_id: string | null;
          is_active:              boolean;
          created_at:             string;
        };
        Insert: {
          id?:                     string;
          campaign_id:             string;
          channel:                 CampaignChannel;
          email_template_id?:      string | null;
          sms_template_id?:        string | null;
          voice_template_id?:      string | null;
          directmail_template_id?: string | null;
          is_active?:              boolean;
          created_at?:             string;
        };
        Update: Partial<Database["public"]["Tables"]["campaign_channels"]["Insert"]>;
      };

      // ── campaign_targets ──────────────────────────────────────
      campaign_targets: {
        Row: {
          id:          string;
          campaign_id: string;
          employee_id: string;
          created_at:  string;
        };
        Insert: {
          id?:          string;
          campaign_id:  string;
          employee_id:  string;
          created_at?:  string;
        };
        Update: Partial<Database["public"]["Tables"]["campaign_targets"]["Insert"]>;
      };

      // ── campaign_events ───────────────────────────────────────
      campaign_events: {
        Row: {
          id:          string;
          campaign_id: string;
          employee_id: string;
          channel:     CampaignChannel;
          event_type:  EventType;
          metadata:    Json | null;
          ip_address:  string | null;
          user_agent:  string | null;
          occurred_at: string;
        };
        Insert: {
          id?:          string;
          campaign_id:  string;
          employee_id:  string;
          channel:      CampaignChannel;
          event_type:   EventType;
          metadata?:    Json | null;
          ip_address?:  string | null;
          user_agent?:  string | null;
          occurred_at?: string;
        };
        Update: never; // Events are immutable
      };

      // ── sso_nonces ────────────────────────────────────────────
      sso_nonces: {
        Row: {
          id:         string;
          nonce:      string;
          user_id:    string;
          used:       boolean;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?:         string;
          nonce:       string;
          user_id:     string;
          used?:       boolean;
          expires_at:  string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sso_nonces"]["Insert"]>;
      };

    }; // end Tables

    Views: {
      campaign_stats: {
        Row: {
          campaign_id:          string;
          campaign_name:        string;
          channel:              string;
          total_sent:           number;
          total_delivered:      number;
          total_opened:         number;
          total_clicked:        number;
          total_form_submitted: number;
          catch_rate:           number;
        };
      };
    };

    Functions: {
      get_my_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole | null;
      };
      get_my_org_ids: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
    };

    Enums: {
      user_role:        UserRole;
      campaign_channel: CampaignChannel;
      campaign_status:  CampaignStatus;
      event_type:       EventType;
      difficulty:       Difficulty;
    };
  };
}
