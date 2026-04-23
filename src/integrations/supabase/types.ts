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
      game_participations: {
        Row: {
          created_at: string
          entries: number
          final_amount: number
          game_id: string
          id: string
          is_winner: boolean
          ko_points: number
          player_name: string
          player_nickname: string
          position: number | null
          profit_loss: number
          profit_percentage: number
          ranking_points: number
          rebuys: number
          temp_player_id: string | null
          total_invested: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entries?: number
          final_amount?: number
          game_id: string
          id?: string
          is_winner?: boolean
          ko_points?: number
          player_name: string
          player_nickname: string
          position?: number | null
          profit_loss?: number
          profit_percentage?: number
          ranking_points?: number
          rebuys?: number
          temp_player_id?: string | null
          total_invested?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entries?: number
          final_amount?: number
          game_id?: string
          id?: string
          is_winner?: boolean
          ko_points?: number
          player_name?: string
          player_nickname?: string
          position?: number | null
          profit_loss?: number
          profit_percentage?: number
          ranking_points?: number
          rebuys?: number
          temp_player_id?: string | null
          total_invested?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_participations_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_participations_temp_player_id_fkey"
            columns: ["temp_player_id"]
            isOneToOne: false
            referencedRelation: "temporary_players"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          buy_in: number
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          house_fee: number
          id: string
          name: string
          rebuy_value: number
          season_year: number
          status: Database["public"]["Enums"]["game_status"]
          total_pot: number
          type: Database["public"]["Enums"]["game_type"]
          updated_at: string
        }
        Insert: {
          buy_in: number
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          house_fee?: number
          id?: string
          name: string
          rebuy_value: number
          season_year: number
          status?: Database["public"]["Enums"]["game_status"]
          total_pot?: number
          type: Database["public"]["Enums"]["game_type"]
          updated_at?: string
        }
        Update: {
          buy_in?: number
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          house_fee?: number
          id?: string
          name?: string
          rebuy_value?: number
          season_year?: number
          status?: Database["public"]["Enums"]["game_status"]
          total_pot?: number
          type?: Database["public"]["Enums"]["game_type"]
          updated_at?: string
        }
        Relationships: []
      }
      link_requests: {
        Row: {
          id: string
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["link_request_status"]
          temp_player_id: string
          user_id: string
        }
        Insert: {
          id?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["link_request_status"]
          temp_player_id: string
          user_id: string
        }
        Update: {
          id?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["link_request_status"]
          temp_player_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_requests_temp_player_id_fkey"
            columns: ["temp_player_id"]
            isOneToOne: false
            referencedRelation: "temporary_players"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          achievements: string[]
          achievements_rr_count: Json
          achievements_rr_progress: Json
          achievements_seasonal: Json
          achievements_unlocked: string[]
          avatar_url: string | null
          created_at: string
          current_rank: number | null
          experience_points: number
          full_name: string | null
          gender: Database["public"]["Enums"]["player_gender"] | null
          id: string
          level: number
          nickname: string | null
          phone: string | null
          profile_completed: boolean
          updated_at: string
          xp: number
        }
        Insert: {
          achievements?: string[]
          achievements_rr_count?: Json
          achievements_rr_progress?: Json
          achievements_seasonal?: Json
          achievements_unlocked?: string[]
          avatar_url?: string | null
          created_at?: string
          current_rank?: number | null
          experience_points?: number
          full_name?: string | null
          gender?: Database["public"]["Enums"]["player_gender"] | null
          id: string
          level?: number
          nickname?: string | null
          phone?: string | null
          profile_completed?: boolean
          updated_at?: string
          xp?: number
        }
        Update: {
          achievements?: string[]
          achievements_rr_count?: Json
          achievements_rr_progress?: Json
          achievements_seasonal?: Json
          achievements_unlocked?: string[]
          avatar_url?: string | null
          created_at?: string
          current_rank?: number | null
          experience_points?: number
          full_name?: string | null
          gender?: Database["public"]["Enums"]["player_gender"] | null
          id?: string
          level?: number
          nickname?: string | null
          phone?: string | null
          profile_completed?: boolean
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      public_rankings: {
        Row: {
          avatar_url: string | null
          buy_ins: number
          games_played: number
          id: string
          kos: number
          player_name: string | null
          player_nickname: string
          player_ref_id: string
          player_type: Database["public"]["Enums"]["player_ref_type"]
          position: number
          prev_position: number | null
          rebuys: number
          season_year: number
          total_points: number
          total_profit: number
          updated_at: string
          wins: number
        }
        Insert: {
          avatar_url?: string | null
          buy_ins?: number
          games_played?: number
          id?: string
          kos?: number
          player_name?: string | null
          player_nickname: string
          player_ref_id: string
          player_type: Database["public"]["Enums"]["player_ref_type"]
          position: number
          prev_position?: number | null
          rebuys?: number
          season_year: number
          total_points?: number
          total_profit?: number
          updated_at?: string
          wins?: number
        }
        Update: {
          avatar_url?: string | null
          buy_ins?: number
          games_played?: number
          id?: string
          kos?: number
          player_name?: string | null
          player_nickname?: string
          player_ref_id?: string
          player_type?: Database["public"]["Enums"]["player_ref_type"]
          position?: number
          prev_position?: number | null
          rebuys?: number
          season_year?: number
          total_points?: number
          total_profit?: number
          updated_at?: string
          wins?: number
        }
        Relationships: []
      }
      season_champions: {
        Row: {
          champion_avatar_url: string | null
          champion_metric_value: number
          champion_nickname: string
          champion_player_ref_id: string
          champion_player_type: Database["public"]["Enums"]["player_ref_type"]
          closed_at: string
          closed_by: string | null
          id: string
          metric_mode: string
          season_year: number
        }
        Insert: {
          champion_avatar_url?: string | null
          champion_metric_value?: number
          champion_nickname: string
          champion_player_ref_id: string
          champion_player_type: Database["public"]["Enums"]["player_ref_type"]
          closed_at?: string
          closed_by?: string | null
          id?: string
          metric_mode?: string
          season_year: number
        }
        Update: {
          champion_avatar_url?: string | null
          champion_metric_value?: number
          champion_nickname?: string
          champion_player_ref_id?: string
          champion_player_type?: Database["public"]["Enums"]["player_ref_type"]
          closed_at?: string
          closed_by?: string | null
          id?: string
          metric_mode?: string
          season_year?: number
        }
        Relationships: []
      }
      temporary_players: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          full_name: string | null
          gender: Database["public"]["Enums"]["player_gender"] | null
          id: string
          nickname: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["player_gender"] | null
          id?: string
          nickname: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["player_gender"] | null
          id?: string
          nickname?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      app_role: "admin" | "user"
      game_status: "scheduled" | "finished"
      game_type: "tournament" | "cash"
      link_request_status: "pending" | "approved" | "rejected"
      player_gender: "male" | "female" | "other"
      player_ref_type: "user" | "temp"
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
      app_role: ["admin", "user"],
      game_status: ["scheduled", "finished"],
      game_type: ["tournament", "cash"],
      link_request_status: ["pending", "approved", "rejected"],
      player_gender: ["male", "female", "other"],
      player_ref_type: ["user", "temp"],
    },
  },
} as const
