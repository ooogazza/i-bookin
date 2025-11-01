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
      bookings: {
        Row: {
          booked_by: string
          booked_value: number
          confirmed_by_admin: boolean | null
          created_at: string
          garage_id: string | null
          garage_lift_type: string | null
          id: string
          image_url: string | null
          invoice_number: string | null
          lift_value_id: string | null
          notes: string | null
          percentage: number
          plot_id: string | null
          status: string
        }
        Insert: {
          booked_by: string
          booked_value: number
          confirmed_by_admin?: boolean | null
          created_at?: string
          garage_id?: string | null
          garage_lift_type?: string | null
          id?: string
          image_url?: string | null
          invoice_number?: string | null
          lift_value_id?: string | null
          notes?: string | null
          percentage: number
          plot_id?: string | null
          status?: string
        }
        Update: {
          booked_by?: string
          booked_value?: number
          confirmed_by_admin?: boolean | null
          created_at?: string
          garage_id?: string | null
          garage_lift_type?: string | null
          id?: string
          image_url?: string | null
          invoice_number?: string | null
          lift_value_id?: string | null
          notes?: string | null
          percentage?: number
          plot_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_booked_by_fkey"
            columns: ["booked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_lift_value_id_fkey"
            columns: ["lift_value_id"]
            isOneToOne: false
            referencedRelation: "lift_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "plots"
            referencedColumns: ["id"]
          },
        ]
      }
      developers: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      gang_divisions: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          email: string | null
          id: string
          member_name: string
          member_type: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          email?: string | null
          id?: string
          member_name: string
          member_type: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          email?: string | null
          id?: string
          member_name?: string
          member_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gang_divisions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      garage_types: {
        Row: {
          created_at: string
          cut_ups_value: number
          garage_type: string
          id: string
          lift_1_value: number
          lift_2_value: number
          site_id: string
          snag_patch_ext_value: number
          snag_patch_int_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          cut_ups_value?: number
          garage_type: string
          id?: string
          lift_1_value?: number
          lift_2_value?: number
          site_id: string
          snag_patch_ext_value?: number
          snag_patch_int_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          cut_ups_value?: number
          garage_type?: string
          id?: string
          lift_1_value?: number
          lift_2_value?: number
          site_id?: string
          snag_patch_ext_value?: number
          snag_patch_int_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "garage_types_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      garages: {
        Row: {
          created_at: string
          cut_ups_value: number
          garage_type: string
          garage_type_id: string | null
          id: string
          lift_1_value: number
          lift_2_value: number
          plot_id: string
          snag_patch_ext_value: number
          snag_patch_int_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          cut_ups_value?: number
          garage_type: string
          garage_type_id?: string | null
          id?: string
          lift_1_value?: number
          lift_2_value?: number
          plot_id: string
          snag_patch_ext_value?: number
          snag_patch_int_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          cut_ups_value?: number
          garage_type?: string
          garage_type_id?: string | null
          id?: string
          lift_1_value?: number
          lift_2_value?: number
          plot_id?: string
          snag_patch_ext_value?: number
          snag_patch_int_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "garages_garage_type_id_fkey"
            columns: ["garage_type_id"]
            isOneToOne: false
            referencedRelation: "garage_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garages_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: true
            referencedRelation: "plots"
            referencedColumns: ["id"]
          },
        ]
      }
      house_type_drawings: {
        Row: {
          created_at: string
          display_order: number
          file_name: string
          file_type: string
          file_url: string
          house_type_id: string
          id: string
          preview_url: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          file_name: string
          file_type: string
          file_url: string
          house_type_id: string
          id?: string
          preview_url?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          display_order?: number
          file_name?: string
          file_type?: string
          file_url?: string
          house_type_id?: string
          id?: string
          preview_url?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_type_drawings_house_type_id_fkey"
            columns: ["house_type_id"]
            isOneToOne: false
            referencedRelation: "house_types"
            referencedColumns: ["id"]
          },
        ]
      }
      house_type_price_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          house_type_id: string
          id: string
          lift_type: string
          new_value: number
          notes: string | null
          old_value: number | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          house_type_id: string
          id?: string
          lift_type: string
          new_value: number
          notes?: string | null
          old_value?: number | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          house_type_id?: string
          id?: string
          lift_type?: string
          new_value?: number
          notes?: string | null
          old_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "house_type_price_history_house_type_id_fkey"
            columns: ["house_type_id"]
            isOneToOne: false
            referencedRelation: "house_types"
            referencedColumns: ["id"]
          },
        ]
      }
      house_types: {
        Row: {
          created_at: string
          id: string
          name: string
          price_last_updated: string | null
          site_id: string
          total_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price_last_updated?: string | null
          site_id: string
          total_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price_last_updated?: string | null
          site_id?: string
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_types_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          site_id: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          site_id: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          site_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_views: {
        Row: {
          id: string
          invoice_number: string
          viewed_at: string
          viewed_by: string
        }
        Insert: {
          id?: string
          invoice_number: string
          viewed_at?: string
          viewed_by: string
        }
        Update: {
          id?: string
          invoice_number?: string
          viewed_at?: string
          viewed_by?: string
        }
        Relationships: []
      }
      letterhead_settings: {
        Row: {
          file_name: string
          file_type: string
          file_url: string
          id: string
          is_active: boolean
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          file_name: string
          file_type: string
          file_url: string
          id?: string
          is_active?: boolean
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          is_active?: boolean
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      lift_values: {
        Row: {
          created_at: string
          house_type_id: string
          id: string
          lift_type: Database["public"]["Enums"]["lift_type"]
          updated_at: string
          value: number
        }
        Insert: {
          created_at?: string
          house_type_id: string
          id?: string
          lift_type: Database["public"]["Enums"]["lift_type"]
          updated_at?: string
          value?: number
        }
        Update: {
          created_at?: string
          house_type_id?: string
          id?: string
          lift_type?: Database["public"]["Enums"]["lift_type"]
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "lift_values_house_type_id_fkey"
            columns: ["house_type_id"]
            isOneToOne: false
            referencedRelation: "house_types"
            referencedColumns: ["id"]
          },
        ]
      }
      non_plot_gang_divisions: {
        Row: {
          amount: number
          created_at: string
          email: string | null
          id: string
          invoice_id: string
          member_name: string
          member_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          email?: string | null
          id?: string
          invoice_id: string
          member_name: string
          member_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          email?: string | null
          id?: string
          invoice_id?: string
          member_name?: string
          member_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "non_plot_gang_divisions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "non_plot_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      non_plot_invoices: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          invoice_number: string
          notes: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          invoice_number: string
          notes?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          invoice_number?: string
          notes?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plot_assignment_history: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          plot_id: string
          removed_at: string | null
          removed_by: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          plot_id: string
          removed_at?: string | null
          removed_by?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          plot_id?: string
          removed_at?: string | null
          removed_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plot_assignment_history_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "plots"
            referencedColumns: ["id"]
          },
        ]
      }
      plots: {
        Row: {
          assigned_to: string | null
          created_at: string
          house_type_id: string | null
          id: string
          plot_number: number
          site_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          house_type_id?: string | null
          id?: string
          plot_number: number
          site_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          house_type_id?: string | null
          id?: string
          plot_number?: number
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plots_house_type_id_fkey"
            columns: ["house_type_id"]
            isOneToOne: false
            referencedRelation: "house_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plots_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_gang_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sites: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          developer_id: string | null
          id: string
          location: string | null
          name: string
          number_of_house_types: number
          number_of_plots: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          developer_id?: string | null
          id?: string
          location?: string | null
          name: string
          number_of_house_types?: number
          number_of_plots?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          developer_id?: string | null
          id?: string
          location?: string | null
          name?: string
          number_of_house_types?: number
          number_of_plots?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "developers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_site_assignments: {
        Row: {
          created_at: string
          id: string
          site_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          site_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          site_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_site_assignments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_site_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "standard"
      lift_type:
        | "lift_1"
        | "lift_2"
        | "lift_3"
        | "lift_4"
        | "lift_5"
        | "lift_6"
        | "cut_ups"
        | "snag"
        | "snag_patch"
        | "dod"
        | "snag_patch_int"
        | "snag_patch_ext"
        | "no_ri"
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
      app_role: ["admin", "standard"],
      lift_type: [
        "lift_1",
        "lift_2",
        "lift_3",
        "lift_4",
        "lift_5",
        "lift_6",
        "cut_ups",
        "snag",
        "snag_patch",
        "dod",
        "snag_patch_int",
        "snag_patch_ext",
        "no_ri",
      ],
    },
  },
} as const
