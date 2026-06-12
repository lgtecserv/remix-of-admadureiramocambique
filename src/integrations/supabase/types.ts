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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      asset_requests: {
        Row: {
          approval_comment: string | null
          asset_id: string
          created_at: string
          id: string
          image_url: string | null
          purpose: string
          quantity: number
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          approval_comment?: string | null
          asset_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          purpose: string
          quantity: number
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          approval_comment?: string | null
          asset_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          purpose?: string
          quantity?: number
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "church_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      attendances: {
        Row: {
          created_at: string
          department: Database["public"]["Enums"]["department_type"]
          event_date: string
          event_type: string
          id: string
          leader_id: string
          member_id: string | null
          notes: string | null
          updated_at: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          department: Database["public"]["Enums"]["department_type"]
          event_date?: string
          event_type: string
          id?: string
          leader_id: string
          member_id?: string | null
          notes?: string | null
          updated_at?: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"]
          event_date?: string
          event_type?: string
          id?: string
          leader_id?: string
          member_id?: string | null
          notes?: string | null
          updated_at?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendances_leader_fk"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_adjustments: {
        Row: {
          adjustment_date: string
          amount: number
          created_at: string
          description: string
          id: string
          recorded_by: string
          updated_at: string
        }
        Insert: {
          adjustment_date?: string
          amount: number
          created_at?: string
          description: string
          id?: string
          recorded_by: string
          updated_at?: string
        }
        Update: {
          adjustment_date?: string
          amount?: number
          created_at?: string
          description?: string
          id?: string
          recorded_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      church_assets: {
        Row: {
          condition: string
          created_at: string
          id: string
          image_url: string | null
          leader_id: string
          name: string
          observations: string | null
          quantity: number
          updated_at: string
        }
        Insert: {
          condition: string
          created_at?: string
          id?: string
          image_url?: string | null
          leader_id: string
          name: string
          observations?: string | null
          quantity: number
          updated_at?: string
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          image_url?: string | null
          leader_id?: string
          name?: string
          observations?: string | null
          quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string | null
          id: string
          joined_at: string | null
          last_read_at: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          recorded_by: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description: string
          expense_date: string
          id?: string
          recorded_by: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          recorded_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          address: string | null
          baptism_date: string | null
          birth_date: string | null
          created_at: string
          department: Database["public"]["Enums"]["department_type"]
          full_name: string
          gender: string | null
          id: string
          leader_id: string
          marital_status: string | null
          member_type: string | null
          observations: string | null
          occupation: string | null
          phone_number: string
          photo_url: string | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          baptism_date?: string | null
          birth_date?: string | null
          created_at?: string
          department: Database["public"]["Enums"]["department_type"]
          full_name: string
          gender?: string | null
          id?: string
          leader_id: string
          marital_status?: string | null
          member_type?: string | null
          observations?: string | null
          occupation?: string | null
          phone_number: string
          photo_url?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          baptism_date?: string | null
          birth_date?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"]
          full_name?: string
          gender?: string | null
          id?: string
          leader_id?: string
          marital_status?: string | null
          member_type?: string | null
          observations?: string | null
          occupation?: string | null
          phone_number?: string
          photo_url?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_leader_fk"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          delivered_to: string[] | null
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          read_by: string[] | null
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          delivered_to?: string[] | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          read_by?: string[] | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          delivered_to?: string[] | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          read_by?: string[] | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offerings: {
        Row: {
          amount: number
          created_at: string
          event_date: string
          event_type: string
          id: string
          notes: string | null
          recorded_by: string
          updated_at: string
          verified_by_names: string[] | null
        }
        Insert: {
          amount: number
          created_at?: string
          event_date: string
          event_type: string
          id?: string
          notes?: string | null
          recorded_by: string
          updated_at?: string
          verified_by_names?: string[] | null
        }
        Update: {
          amount?: number
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          notes?: string | null
          recorded_by?: string
          updated_at?: string
          verified_by_names?: string[] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          theme_preference: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          theme_preference?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          theme_preference?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      tithes: {
        Row: {
          amount: number
          created_at: string
          id: string
          member_id: string
          recorded_by: string
          tithe_date: string
          tithe_month: number
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          member_id: string
          recorded_by: string
          tithe_date: string
          tithe_month?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          member_id?: string
          recorded_by?: string
          tithe_date?: string
          tithe_month?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tithes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          id: string
          is_typing: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_settings: {
        Row: {
          alert_sound_name: string | null
          created_at: string
          id: string
          in_conversation_sound_name: string | null
          in_conversation_volume: number | null
          message_sound_enabled: boolean
          message_sound_name: string | null
          notification_sound_enabled: boolean
          sound_enabled: boolean
          sound_name: string
          updated_at: string
          user_id: string
          volume: number
        }
        Insert: {
          alert_sound_name?: string | null
          created_at?: string
          id?: string
          in_conversation_sound_name?: string | null
          in_conversation_volume?: number | null
          message_sound_enabled?: boolean
          message_sound_name?: string | null
          notification_sound_enabled?: boolean
          sound_enabled?: boolean
          sound_name?: string
          updated_at?: string
          user_id: string
          volume?: number
        }
        Update: {
          alert_sound_name?: string | null
          created_at?: string
          id?: string
          in_conversation_sound_name?: string | null
          in_conversation_volume?: number | null
          message_sound_enabled?: boolean
          message_sound_name?: string | null
          notification_sound_enabled?: boolean
          sound_enabled?: boolean
          sound_name?: string
          updated_at?: string
          user_id?: string
          volume?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          department: Database["public"]["Enums"]["department_type"] | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"] | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"] | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_followups: {
        Row: {
          created_at: string
          department: Database["public"]["Enums"]["department_type"]
          followup_date: string
          followup_type: string
          id: string
          leader_id: string
          notes: string | null
          status: string
          updated_at: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          department: Database["public"]["Enums"]["department_type"]
          followup_date?: string
          followup_type: string
          id?: string
          leader_id: string
          notes?: string | null
          status: string
          updated_at?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"]
          followup_date?: string
          followup_type?: string
          id?: string
          leader_id?: string
          notes?: string | null
          status?: string
          updated_at?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_followups_leader_fk"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_followups_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          created_at: string
          department: Database["public"]["Enums"]["department_type"]
          full_name: string
          id: string
          invited_by: string | null
          leader_id: string
          observations: string | null
          phone_number: string
          returned: boolean
          updated_at: string
          visit_date: string
        }
        Insert: {
          created_at?: string
          department: Database["public"]["Enums"]["department_type"]
          full_name: string
          id?: string
          invited_by?: string | null
          leader_id: string
          observations?: string | null
          phone_number: string
          returned?: boolean
          updated_at?: string
          visit_date?: string
        }
        Update: {
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"]
          full_name?: string
          id?: string
          invited_by?: string | null
          leader_id?: string
          observations?: string | null
          phone_number?: string
          returned?: boolean
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitors_leader_fk"
            columns: ["leader_id"]
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
      create_general_chat: { Args: never; Returns: undefined }
      create_missing_notification_settings: { Args: never; Returns: undefined }
      create_private_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_user_department: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["department_type"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { conv_id: string; uid: string }
        Returns: boolean
      }
      is_leader_or_pastor: { Args: { profile_id: string }; Returns: boolean }
      is_same_department_leader: {
        Args: { profile_id: string }
        Returns: boolean
      }
      is_super_admin:
        | { Args: { _email: string }; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
      mark_message_delivered: { Args: { msg_id: string }; Returns: undefined }
      mark_message_read: { Args: { msg_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "pastor" | "leader" | "super_admin"
      department_type:
        | "jovens"
        | "irmas"
        | "varoes"
        | "adolescentes"
        | "criancas"
        | "patrimonio"
        | "tesouraria"
      member_status: "novo" | "ativo" | "inativo"
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
      app_role: ["pastor", "leader", "super_admin"],
      department_type: [
        "jovens",
        "irmas",
        "varoes",
        "adolescentes",
        "criancas",
        "patrimonio",
        "tesouraria",
      ],
      member_status: ["novo", "ativo", "inativo"],
    },
  },
} as const
