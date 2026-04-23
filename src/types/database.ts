// Auto-generated database types placeholder
// Run `supabase gen types typescript --project-id zkbrrlbwwckgqepeozjd` to regenerate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          title: string | null;
          role: "master_admin" | "global_admin" | "training_admin";
          pending_role: string | null;
          medcurity_user_id: string | null;
          is_archived: boolean;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_profiles"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["user_profiles"]["Insert"]>;
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          external_company_id: string | null;
          logo_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["organizations"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
      };
      employees: {
        Row: {
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
        };
        Insert: Omit<Database["public"]["Tables"]["employees"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["employees"]["Insert"]>;
      };
      campaigns: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          status: "draft" | "scheduled" | "active" | "paused" | "completed" | "cancelled";
          start_date: string | null;
          end_date: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["campaigns"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["campaigns"]["Insert"]>;
      };
      campaign_events: {
        Row: {
          id: string;
          campaign_id: string;
          employee_id: string;
          channel: "email" | "sms" | "voice" | "direct_mail";
          event_type: "sent" | "delivered" | "opened" | "clicked" | "form_submitted" | "call_answered" | "call_completed" | "qr_scanned" | "caught";
          metadata: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          occurred_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["campaign_events"]["Row"], "id">;
        Update: never; // Events are immutable
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: "master_admin" | "global_admin" | "training_admin";
      campaign_channel: "email" | "sms" | "voice" | "direct_mail";
      campaign_status: "draft" | "scheduled" | "active" | "paused" | "completed" | "cancelled";
      event_type: "sent" | "delivered" | "opened" | "clicked" | "form_submitted" | "call_answered" | "call_completed" | "qr_scanned" | "caught";
    };
  };
}
