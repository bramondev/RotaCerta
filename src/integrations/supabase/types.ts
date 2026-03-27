export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      community_posts: {
        Row: {
          city: string
          created_at: string
          date: string
          description: string
          dislikes: number | null
          id: string
          ideal_time: string | null
          likes: number | null
          location: string
          state: string
          time: string
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
          user_id: string
          user_votes: Json | null
        }
        Insert: {
          city: string
          created_at?: string
          date: string
          description: string
          dislikes?: number | null
          id?: string
          ideal_time?: string | null
          likes?: number | null
          location: string
          state: string
          time: string
          type: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          user_id: string
          user_votes?: Json | null
        }
        Update: {
          city?: string
          created_at?: string
          date?: string
          description?: string
          dislikes?: number | null
          id?: string
          ideal_time?: string | null
          likes?: number | null
          location?: string
          state?: string
          time?: string
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string
          user_id?: string
          user_votes?: Json | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          details: Json | null
          document_number: string | null
          expiration_date: string | null
          id: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          document_number?: string | null
          expiration_date?: string | null
          id?: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          document_number?: string | null
          expiration_date?: string | null
          id?: string
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fuel_entries: {
        Row: {
          consumption: number
          created_at: string
          date: string
          fuel_type: Database["public"]["Enums"]["fuel_type"]
          id: string
          kilometers_driven: number
          liters: number
          price_per_liter: number
          total_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          consumption: number
          created_at?: string
          date?: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          kilometers_driven: number
          liters: number
          price_per_liter: number
          total_cost: number
          updated_at?: string
          user_id: string
        }
        Update: {
          consumption?: number
          created_at?: string
          date?: string
          fuel_type?: Database["public"]["Enums"]["fuel_type"]
          id?: string
          kilometers_driven?: number
          liters?: number
          price_per_liter?: number
          total_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_transactions: {
        Row: {
          amount: number
          created_at: string
          goal_id: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          goal_id: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          goal_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_transactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: Database["public"]["Enums"]["goal_category"]
          created_at: string
          current_amount: number
          deadline: string
          id: string
          name: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["goal_category"]
          created_at?: string
          current_amount?: number
          deadline: string
          id?: string
          name: string
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["goal_category"]
          created_at?: string
          current_amount?: number
          deadline?: string
          id?: string
          name?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      maintenance: {
        Row: {
          category: Database["public"]["Enums"]["maintenance_category"]
          cost: number
          created_at: string
          date: string
          description: string | null
          id: string
          is_future: boolean | null
          mileage: number
          subtype: Database["public"]["Enums"]["maintenance_subtype"]
          type: Database["public"]["Enums"]["maintenance_type"] | null
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["maintenance_category"]
          cost?: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          is_future?: boolean | null
          mileage: number
          subtype?: Database["public"]["Enums"]["maintenance_subtype"]
          type?: Database["public"]["Enums"]["maintenance_type"] | null
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["maintenance_category"]
          cost?: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          is_future?: boolean | null
          mileage?: number
          subtype?: Database["public"]["Enums"]["maintenance_subtype"]
          type?: Database["public"]["Enums"]["maintenance_type"] | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      transaction_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          id: string
          mileage: number
          model: string
          plate: string
          status: string
          type: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          mileage: number
          model: string
          plate: string
          status: string
          type: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          mileage?: number
          model?: string
          plate?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      document_type: "cnh" | "crlv" | "ipva" | "seguro" | "outros"
      fuel_type: "gas" | "gasoline" | "ethanol" | "diesel"
      goal_category: "maintenance" | "tax" | "savings" | "equipment" | "other"
      maintenance_category: "corrective" | "preventive"
      maintenance_subtype:
        | "emergency_corrective"
        | "planned_corrective"
        | "predictive_corrective"
        | "scheduled_preventive"
        | "condition_based_preventive"
        | "proactive_preventive"
      maintenance_type:
        | "oil_change"
        | "tire_change"
        | "brake_service"
        | "general_service"
        | "other"
      post_type:
        | "route_tip"
        | "police_alert"
        | "danger_point"
        | "gas_station"
        | "safety_tip"
        | "other"
        | "food_spot"
      transaction_type: "income" | "expense"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
