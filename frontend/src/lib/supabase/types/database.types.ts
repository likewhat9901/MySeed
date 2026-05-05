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
      tb_bridge_tw: {
        Row: {
          brg_id: string
          tem_id: string
          wid_id: string
        }
        Insert: {
          brg_id?: string
          tem_id: string
          wid_id: string
        }
        Update: {
          brg_id?: string
          tem_id?: string
          wid_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tb_bridge_tw_tem_id_fkey"
            columns: ["tem_id"]
            isOneToOne: false
            referencedRelation: "tb_template"
            referencedColumns: ["tem_id"]
          },
          {
            foreignKeyName: "tb_bridge_tw_wid_id_fkey"
            columns: ["wid_id"]
            isOneToOne: false
            referencedRelation: "tb_widget"
            referencedColumns: ["wid_id"]
          },
        ]
      }
      tb_category: {
        Row: {
          cate_id: string
          cate_name: string
          cate_type: string
          mapping_key: string | null
          mem_id: string
        }
        Insert: {
          cate_id?: string
          cate_name: string
          cate_type: string
          mapping_key?: string | null
          mem_id: string
        }
        Update: {
          cate_id?: string
          cate_name?: string
          cate_type?: string
          mapping_key?: string | null
          mem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tb_category_mem_id_fkey"
            columns: ["mem_id"]
            isOneToOne: false
            referencedRelation: "tb_member"
            referencedColumns: ["mem_id"]
          },
        ]
      }
      tb_file: {
        Row: {
          file_id: string
          file_name: string
          file_path: string
          file_type: string
          mem_id: string
          regist_dt: string | null
        }
        Insert: {
          file_id?: string
          file_name: string
          file_path: string
          file_type: string
          mem_id: string
          regist_dt?: string | null
        }
        Update: {
          file_id?: string
          file_name?: string
          file_path?: string
          file_type?: string
          mem_id?: string
          regist_dt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tb_file_mem_id_fkey"
            columns: ["mem_id"]
            isOneToOne: false
            referencedRelation: "tb_member"
            referencedColumns: ["mem_id"]
          },
        ]
      }
      tb_import_mappings: {
        Row: {
          map_id: string
          map_name: string
          mappings: Json
          mem_id: string
          regist_dt: string
        }
        Insert: {
          map_id?: string
          map_name: string
          mappings?: Json
          mem_id: string
          regist_dt?: string
        }
        Update: {
          map_id?: string
          map_name?: string
          mappings?: Json
          mem_id?: string
          regist_dt?: string
        }
        Relationships: [
          {
            foreignKeyName: "tb_import_mappings_mem_id_fkey"
            columns: ["mem_id"]
            isOneToOne: false
            referencedRelation: "tb_member"
            referencedColumns: ["mem_id"]
          },
        ]
      }
      tb_ledger: {
        Row: {
          cover_url: string | null
          led_id: string
          led_name: string
          mem_id: string
          regist_dt: string | null
          tem_id: string | null
        }
        Insert: {
          cover_url?: string | null
          led_id?: string
          led_name: string
          mem_id: string
          regist_dt?: string | null
          tem_id?: string | null
        }
        Update: {
          cover_url?: string | null
          led_id?: string
          led_name?: string
          mem_id?: string
          regist_dt?: string | null
          tem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tb_ledger_mem_id_fkey"
            columns: ["mem_id"]
            isOneToOne: false
            referencedRelation: "tb_member"
            referencedColumns: ["mem_id"]
          },
        ]
      }
      tb_member: {
        Row: {
          mem_id: string
          mem_type: string | null
          name: string
          profile_image: string | null
          regist_dt: string | null
        }
        Insert: {
          mem_id: string
          mem_type?: string | null
          name: string
          profile_image?: string | null
          regist_dt?: string | null
        }
        Update: {
          mem_id?: string
          mem_type?: string | null
          name?: string
          profile_image?: string | null
          regist_dt?: string | null
        }
        Relationships: []
      }
      tb_record: {
        Row: {
          cate_id: string | null
          data: Json
          data_type: string
          file_id: string | null
          led_id: string
          rec_id: string
          regist_dt: string | null
        }
        Insert: {
          cate_id?: string | null
          data: Json
          data_type: string
          file_id?: string | null
          led_id: string
          rec_id?: string
          regist_dt?: string | null
        }
        Update: {
          cate_id?: string | null
          data?: Json
          data_type?: string
          file_id?: string | null
          led_id?: string
          rec_id?: string
          regist_dt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tb_record_cate_id_fkey"
            columns: ["cate_id"]
            isOneToOne: false
            referencedRelation: "tb_category"
            referencedColumns: ["cate_id"]
          },
          {
            foreignKeyName: "tb_record_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "tb_file"
            referencedColumns: ["file_id"]
          },
          {
            foreignKeyName: "tb_record_led_id_fkey"
            columns: ["led_id"]
            isOneToOne: false
            referencedRelation: "tb_ledger"
            referencedColumns: ["led_id"]
          },
        ]
      }
      tb_template: {
        Row: {
          is_public: boolean | null
          page_list: Json | null
          tem_id: string
          tem_name: string
        }
        Insert: {
          is_public?: boolean | null
          page_list?: Json | null
          tem_id?: string
          tem_name: string
        }
        Update: {
          is_public?: boolean | null
          page_list?: Json | null
          tem_id?: string
          tem_name?: string
        }
        Relationships: []
      }
      tb_widget: {
        Row: {
          config_schema: Json | null
          wid_id: string
          wid_name: string
          wid_type: string
        }
        Insert: {
          config_schema?: Json | null
          wid_id?: string
          wid_name: string
          wid_type: string
        }
        Update: {
          config_schema?: Json | null
          wid_id?: string
          wid_name?: string
          wid_type?: string
        }
        Relationships: []
      }
      tb_widget_config: {
        Row: {
          aggregation: string | null
          con_id: string
          data_binding: Json
          filters: Json | null
          led_id: string
          position: Json | null
          wid_id: string
        }
        Insert: {
          aggregation?: string | null
          con_id?: string
          data_binding: Json
          filters?: Json | null
          led_id: string
          position?: Json | null
          wid_id: string
        }
        Update: {
          aggregation?: string | null
          con_id?: string
          data_binding?: Json
          filters?: Json | null
          led_id?: string
          position?: Json | null
          wid_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tb_widget_config_led_id_fkey"
            columns: ["led_id"]
            isOneToOne: false
            referencedRelation: "tb_ledger"
            referencedColumns: ["led_id"]
          },
          {
            foreignKeyName: "tb_widget_config_wid_id_fkey"
            columns: ["wid_id"]
            isOneToOne: false
            referencedRelation: "tb_widget"
            referencedColumns: ["wid_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_ledger: {
        Args: { p_led_name?: string; p_mem_id: string }
        Returns: {
          led_id: string
        }[]
      }
      delete_import_mapping:
        | { Args: { p_map_id: string }; Returns: undefined }
        | { Args: { p_payload: Json }; Returns: undefined }
      delete_ledger: { Args: { p_led_id: string }; Returns: undefined }
      get_canvas_widgets: {
        Args: { p_led_id: string }
        Returns: {
          con_id: string
          position: Json
          wid_type: string
        }[]
      }
      get_import_mappings:
        | {
            Args: { p_mem_id: string }
            Returns: {
              map_id: string
              map_name: string
              mappings: Json
              regist_dt: string
            }[]
          }
        | {
            Args: { p_payload: Json }
            Returns: {
              map_id: string
              map_name: string
              mappings: Json
              regist_dt: string
            }[]
          }
      get_my_ledgers: {
        Args: { p_mem_id: string }
        Returns: {
          cover_url: string
          led_id: string
          led_name: string
          regist_dt: string
        }[]
      }
      get_or_create_ledger: {
        Args: { p_mem_id: string }
        Returns: {
          led_id: string
          led_name: string
        }[]
      }
      get_widget_data: {
        Args: { p_led_id: string; p_widget_type: string }
        Returns: {
          data: Json
          data_type: string
          rec_id: string
          regist_dt: string
        }[]
      }
      register_import_file:
        | {
            Args: { p_file_name: string; p_file_path: string; p_mem_id: string }
            Returns: {
              file_id: string
            }[]
          }
        | {
            Args: { p_payload: Json }
            Returns: {
              file_id: string
            }[]
          }
      rename_ledger: {
        Args: { p_led_id: string; p_led_name: string }
        Returns: undefined
      }
      replace_canvas_widgets: {
        Args: { p_configs: Json; p_led_id: string }
        Returns: undefined
      }
      save_import_mapping:
        | {
            Args: {
              p_map_id: string
              p_map_name: string
              p_mappings: Json
              p_mem_id: string
            }
            Returns: {
              map_id: string
            }[]
          }
        | {
            Args: { p_payload: Json }
            Returns: {
              map_id: string
            }[]
          }
      update_ledger_cover: {
        Args: { p_cover_url?: string; p_led_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
