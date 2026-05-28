export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          description: string | null;
          image_url: string | null;
          spoonacular_id: number | null;
          source_url: string | null;
          imported_from: string | null;
          import_source: string | null;
          original_image_url: string | null;
          original_image_path: string | null;
          extraction_confidence: number | null;
          raw_extracted_text: string | null;
          extraction_notes: Json | null;
          source_type: string | null;
          scan_model: string | null;
          prep_time: number | null;
          cook_time: number | null;
          servings: number | null;
          difficulty: string | null;
          category: string | null;
          tags: string[] | null;
          ingredients: Json;
          instructions: Json;
          nutrition: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          description?: string | null;
          image_url?: string | null;
          spoonacular_id?: number | null;
          source_url?: string | null;
          imported_from?: string | null;
          import_source?: string | null;
          original_image_url?: string | null;
          original_image_path?: string | null;
          extraction_confidence?: number | null;
          raw_extracted_text?: string | null;
          extraction_notes?: Json | null;
          source_type?: string | null;
          scan_model?: string | null;
          prep_time?: number | null;
          cook_time?: number | null;
          servings?: number | null;
          difficulty?: string | null;
          category?: string | null;
          tags?: string[] | null;
          ingredients?: Json;
          instructions?: Json;
          nutrition?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          description?: string | null;
          image_url?: string | null;
          spoonacular_id?: number | null;
          source_url?: string | null;
          imported_from?: string | null;
          import_source?: string | null;
          original_image_url?: string | null;
          original_image_path?: string | null;
          extraction_confidence?: number | null;
          raw_extracted_text?: string | null;
          extraction_notes?: Json | null;
          source_type?: string | null;
          scan_model?: string | null;
          prep_time?: number | null;
          cook_time?: number | null;
          servings?: number | null;
          difficulty?: string | null;
          category?: string | null;
          tags?: string[] | null;
          ingredients?: Json;
          instructions?: Json;
          nutrition?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "recipes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      meal_plans: {
        Row: {
          id: string;
          user_id: string | null;
          recipe_id: string | null;
          planned_date: string;
          meal_type: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          recipe_id?: string | null;
          planned_date: string;
          meal_type: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          recipe_id?: string | null;
          planned_date?: string;
          meal_type?: string;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "meal_plans_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meal_plans_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      shopping_list_items: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          quantity: string | null;
          unit: string | null;
          category: string | null;
          checked: boolean | null;
          source: string | null;
          week_start: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          quantity?: string | null;
          unit?: string | null;
          category?: string | null;
          checked?: boolean | null;
          source?: string | null;
          week_start?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          quantity?: string | null;
          unit?: string | null;
          category?: string | null;
          checked?: boolean | null;
          source?: string | null;
          week_start?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      pantry_items: {
        Row: {
          id: string;
          user_id: string;
          household_id: string | null;
          name: string;
          normalized_name: string;
          quantity: number | null;
          unit: string | null;
          category: string | null;
          location: string | null;
          notes: string | null;
          is_staple: boolean;
          low_stock_threshold: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          household_id?: string | null;
          name: string;
          normalized_name: string;
          quantity?: number | null;
          unit?: string | null;
          category?: string | null;
          location?: string | null;
          notes?: string | null;
          is_staple?: boolean;
          low_stock_threshold?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          household_id?: string | null;
          name?: string;
          normalized_name?: string;
          quantity?: number | null;
          unit?: string | null;
          category?: string | null;
          location?: string | null;
          notes?: string | null;
          is_staple?: boolean;
          low_stock_threshold?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pantry_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
