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

// User role enum
export type UserRole = 'athlete' | 'coach' | 'admin';

// User profile type
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      // Add your view definitions here
    };
    Functions: {
      // Add your function definitions here
    };
    Enums: {
      user_role: 'athlete' | 'coach' | 'admin';
    };
  };
}
