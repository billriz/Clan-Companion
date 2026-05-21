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
          prep_time: number | null;
          cook_time: number | null;
          servings: number | null;
          difficulty: string | null;
          category: string | null;
          tags: string[] | null;
          ingredients: Json;
          instructions: Json;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          description?: string | null;
          image_url?: string | null;
          prep_time?: number | null;
          cook_time?: number | null;
          servings?: number | null;
          difficulty?: string | null;
          category?: string | null;
          tags?: string[] | null;
          ingredients?: Json;
          instructions?: Json;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          description?: string | null;
          image_url?: string | null;
          prep_time?: number | null;
          cook_time?: number | null;
          servings?: number | null;
          difficulty?: string | null;
          category?: string | null;
          tags?: string[] | null;
          ingredients?: Json;
          instructions?: Json;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
