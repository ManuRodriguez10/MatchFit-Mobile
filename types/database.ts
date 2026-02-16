/**
 * Database type definitions for Supabase
 *
 * TODO: Generate actual types from your Supabase schema using:
 * npx supabase gen types typescript --project-id your-project-id > types/database.ts
 *
 * Or use the Supabase CLI:
 * supabase gen types typescript --linked > types/database.ts
 */

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
      // Add your table definitions here
      // Example:
      // profiles: {
      //   Row: {
      //     id: string;
      //     email: string;
      //     created_at: string;
      //   };
      //   Insert: {
      //     id?: string;
      //     email: string;
      //     created_at?: string;
      //   };
      //   Update: {
      //     id?: string;
      //     email?: string;
      //     created_at?: string;
      //   };
      // };
    };
    Views: {
      // Add your view definitions here
    };
    Functions: {
      // Add your function definitions here
    };
    Enums: {
      // Add your enum definitions here
    };
  };
}
