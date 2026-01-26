export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ad_banners: {
        Row: {
          active: boolean
          created_at: string
          desktop_only: boolean
          id: string
          image_url: string
          mobile_image_url: string | null
          position: string
          redirect_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          desktop_only?: boolean
          id?: string
          image_url: string
          mobile_image_url?: string | null
          position: string
          redirect_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          desktop_only?: boolean
          id?: string
          image_url?: string
          mobile_image_url?: string | null
          position?: string
          redirect_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          certification_status: boolean | null
          certification_validated_at: string | null
          certification_validated_by: string | null
          company_name: string
          created_at: string | null
          description: string | null
          drone_types: string[] | null
          email: string | null
          experience_years: number | null
          featured_until: string | null
          id: string
          instagram_url: string | null
          instagram_username: string | null
          is_featured: boolean | null
          linkedin_url: string | null
          linkedin_username: string | null
          location: string | null
          logo_url: string | null
          max_company_pilots: number | null
          phone: string | null
          region: string | null
          services: string[] | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          certification_status?: boolean | null
          certification_validated_at?: string | null
          certification_validated_by?: string | null
          company_name: string
          created_at?: string | null
          description?: string | null
          drone_types?: string[] | null
          email?: string | null
          experience_years?: number | null
          featured_until?: string | null
          id?: string
          instagram_url?: string | null
          instagram_username?: string | null
          is_featured?: boolean | null
          linkedin_url?: string | null
          linkedin_username?: string | null
          location?: string | null
          logo_url?: string | null
          max_company_pilots?: number | null
          phone?: string | null
          region?: string | null
          services?: string[] | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          certification_status?: boolean | null
          certification_validated_at?: string | null
          certification_validated_by?: string | null
          company_name?: string
          created_at?: string | null
          description?: string | null
          drone_types?: string[] | null
          email?: string | null
          experience_years?: number | null
          featured_until?: string | null
          id?: string
          instagram_url?: string | null
          instagram_username?: string | null
          is_featured?: boolean | null
          linkedin_url?: string | null
          linkedin_username?: string | null
          location?: string | null
          logo_url?: string | null
          max_company_pilots?: number | null
          phone?: string | null
          region?: string | null
          services?: string[] | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_certification_validated_by_fkey"
            columns: ["certification_validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_pilot_invitations: {
        Row: {
          company_id: string
          created_at: string
          email_sent: boolean | null
          email_sent_at: string | null
          id: string
          invitation_token: string | null
          invited_at: string
          invited_by: string
          message: string | null
          pilot_email: string
          pilot_id: string | null
          responded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          invitation_token?: string | null
          invited_at?: string
          invited_by: string
          message?: string | null
          pilot_email: string
          pilot_id?: string | null
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          invitation_token?: string | null
          invited_at?: string
          invited_by?: string
          message?: string | null
          pilot_email?: string
          pilot_id?: string | null
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_pilot_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_pilot_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_pilot_invitations_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_pilots: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          pilot_id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          pilot_id: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          pilot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_pilots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_pilots_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "pilots"
            referencedColumns: ["id"]
          },
        ]
      }
      diploma_qr_tokens: {
        Row: {
          associated_at: string | null
          created_at: string | null
          diploma_id: string | null
          id: string
          token: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          associated_at?: string | null
          created_at?: string | null
          diploma_id?: string | null
          id?: string
          token: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          associated_at?: string | null
          created_at?: string | null
          diploma_id?: string | null
          id?: string
          token?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diploma_qr_tokens_diploma_id_fkey"
            columns: ["diploma_id"]
            isOneToOne: false
            referencedRelation: "diplomas"
            referencedColumns: ["id"]
          },
        ]
      }
      diplomas: {
        Row: {
          certificate_number: string | null
          city: string | null
          course_date: string
          course_hours: string | null
          course_title: string
          created_at: string | null
          id: string
          instructor_name: string | null
          student_name: string
          updated_at: string | null
        }
        Insert: {
          certificate_number?: string | null
          city?: string | null
          course_date: string
          course_hours?: string | null
          course_title: string
          created_at?: string | null
          id?: string
          instructor_name?: string | null
          student_name: string
          updated_at?: string | null
        }
        Update: {
          certificate_number?: string | null
          city?: string | null
          course_date?: string
          course_hours?: string | null
          course_title?: string
          created_at?: string | null
          id?: string
          instructor_name?: string | null
          student_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      flight_logs: {
        Row: {
          created_at: string
          duration_hours: number | null
          file_name: string
          file_url: string
          flight_date: string | null
          flight_hours: number | null
          id: string
          location: string | null
          notes: string | null
          purpose: string | null
          rejection_observations: string | null
          status: string
          updated_at: string
          uploaded_at: string
          user_id: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string
          duration_hours?: number | null
          file_name: string
          file_url: string
          flight_date?: string | null
          flight_hours?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          purpose?: string | null
          rejection_observations?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string
          duration_hours?: number | null
          file_name?: string
          file_url?: string
          flight_date?: string | null
          flight_hours?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          purpose?: string | null
          rejection_observations?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_portfolio: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          thumbnail_url: string | null
          title: string | null
          type: string
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          thumbnail_url?: string | null
          title?: string | null
          type: string
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          thumbnail_url?: string | null
          title?: string | null
          type?: string
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      pilot_services: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          pilot_id: string
          price_per_hour: number | null
          service_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          pilot_id: string
          price_per_hour?: number | null
          service_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          pilot_id?: string
          price_per_hour?: number | null
          service_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_services_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "pilots"
            referencedColumns: ["id"]
          },
        ]
      }
      pilots: {
        Row: {
          certification_academy: string | null
          certification_status: boolean | null
          certifications: string[] | null
          created_at: string | null
          id: string
          phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          certification_academy?: string | null
          certification_status?: boolean | null
          certifications?: string[] | null
          created_at?: string | null
          id?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          certification_academy?: string | null
          certification_status?: boolean | null
          certifications?: string[] | null
          created_at?: string | null
          id?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          favicon_url: string
          id: string
          logo_url: string
          platform_name: string
          primary_color: string
          secondary_color: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          favicon_url?: string
          id?: string
          logo_url?: string
          platform_name?: string
          primary_color?: string
          secondary_color?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          favicon_url?: string
          id?: string
          logo_url?: string
          platform_name?: string
          primary_color?: string
          secondary_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_contacts: {
        Row: {
          contact_email: string
          contact_name: string
          contact_phone: string | null
          contacted_at: string | null
          id: string
          message: string | null
          profile_id: string
          status: string | null
        }
        Insert: {
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          contacted_at?: string | null
          id?: string
          message?: string | null
          profile_id: string
          status?: string | null
        }
        Update: {
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          contacted_at?: string | null
          id?: string
          message?: string | null
          profile_id?: string
          status?: string | null
        }
        Relationships: []
      }
      profile_slug_history: {
        Row: {
          created_at: string
          deactivated_at: string | null
          id: string
          is_current: boolean
          slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deactivated_at?: string | null
          id?: string
          is_current?: boolean
          slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          deactivated_at?: string | null
          id?: string
          is_current?: boolean
          slug?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          id: string
          profile_id: string
          user_agent: string | null
          viewed_at: string | null
          viewer_ip: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          user_agent?: string | null
          viewed_at?: string | null
          viewer_ip?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          user_agent?: string | null
          viewed_at?: string | null
          viewer_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_provider: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          drone_types: string[] | null
          email: string | null
          experience_years: number | null
          full_name: string | null
          id: string
          instagram_url: string | null
          instagram_username: string | null
          linkedin_url: string | null
          linkedin_username: string | null
          location: string | null
          phone: string | null
          public_profile_slug: string | null
          region: string | null
          slug_updated_at: string | null
          specialties: string[] | null
          updated_at: string | null
          user_type: string | null
        }
        Insert: {
          auth_provider?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          drone_types?: string[] | null
          email?: string | null
          experience_years?: number | null
          full_name?: string | null
          id: string
          instagram_url?: string | null
          instagram_username?: string | null
          linkedin_url?: string | null
          linkedin_username?: string | null
          location?: string | null
          phone?: string | null
          public_profile_slug?: string | null
          region?: string | null
          slug_updated_at?: string | null
          specialties?: string[] | null
          updated_at?: string | null
          user_type?: string | null
        }
        Update: {
          auth_provider?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          drone_types?: string[] | null
          email?: string | null
          experience_years?: number | null
          full_name?: string | null
          id?: string
          instagram_url?: string | null
          instagram_username?: string | null
          linkedin_url?: string | null
          linkedin_username?: string | null
          location?: string | null
          phone?: string | null
          public_profile_slug?: string | null
          region?: string | null
          slug_updated_at?: string | null
          specialties?: string[] | null
          updated_at?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      user_certifications: {
        Row: {
          certificate_type: string | null
          created_at: string
          file_name: string
          file_url: string
          id: string
          rejection_observations: string | null
          status: string
          updated_at: string
          uploaded_at: string
          user_id: string
          validated_at: string | null
        }
        Insert: {
          certificate_type?: string | null
          created_at?: string
          file_name: string
          file_url: string
          id?: string
          rejection_observations?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          user_id: string
          validated_at?: string | null
        }
        Update: {
          certificate_type?: string | null
          created_at?: string
          file_name?: string
          file_url?: string
          id?: string
          rejection_observations?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          user_id?: string
          validated_at?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["admin_permission"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["admin_permission"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["admin_permission"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          featured_until: string | null
          id: string
          payment_method: string | null
          plan_name: string
          renewal_date: string | null
          reveniu_plan_id: string | null
          reveniu_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
          whatsapp_priority_support: boolean | null
        }
        Insert: {
          created_at?: string
          featured_until?: string | null
          id?: string
          payment_method?: string | null
          plan_name?: string
          renewal_date?: string | null
          reveniu_plan_id?: string | null
          reveniu_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          whatsapp_priority_support?: boolean | null
        }
        Update: {
          created_at?: string
          featured_until?: string | null
          id?: string
          payment_method?: string | null
          plan_name?: string
          renewal_date?: string | null
          reveniu_plan_id?: string | null
          reveniu_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          whatsapp_priority_support?: boolean | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          payload: Json
          processed: boolean | null
          webhook_type: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload: Json
          processed?: boolean | null
          webhook_type: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json
          processed?: boolean | null
          webhook_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_company_invitation: {
        Args: { invitation_id_param: string }
        Returns: Json
      }
      accept_company_invitation_with_pro:
        | { Args: { invitation_id_param: string }; Returns: Json }
        | {
            Args: { invitation_id_param: string; pilot_id_param?: string }
            Returns: Json
          }
      can_add_company_pilot: {
        Args: { company_id_param: string }
        Returns: boolean
      }
      can_pilot_join_company: {
        Args: { pilot_user_id: string }
        Returns: boolean
      }
      check_plan_feature: {
        Args: { feature_name: string; user_id_param: string }
        Returns: boolean
      }
      delete_user: { Args: { target_user_id: string }; Returns: undefined }
      get_invitation_by_token: { Args: { token_param: string }; Returns: Json }
      get_user_permissions: { Args: { _user_id: string }; Returns: string[] }
      get_user_plan: { Args: { user_id_param: string }; Returns: string }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["admin_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      reject_company_invitation: {
        Args: { invitation_id_param: string }
        Returns: Json
      }
      send_company_pilot_invitation: {
        Args: {
          company_id_param: string
          message_param?: string
          pilot_email_param: string
        }
        Returns: Json
      }
    }
    Enums: {
      admin_permission:
        | "create_diplomas"
        | "manage_certificates"
        | "view_users"
        | "view_companies"
        | "view_notifications"
        | "manage_banners"
      user_role: "pilot" | "company" | "admin" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_permission: [
        "create_diplomas",
        "manage_certificates",
        "view_users",
        "view_companies",
        "view_notifications",
        "manage_banners",
      ],
      user_role: ["pilot", "company", "admin", "super_admin"],
    },
  },
} as const
