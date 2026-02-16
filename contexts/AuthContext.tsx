import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile, UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from database
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      return null;
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await fetchProfile(data.user.id);
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  // Sign up with email, password, full name, and role
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => {
    try {
      console.log('Starting sign up with email:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      });

      if (error) {
        console.error('Supabase auth error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        
        // Provide user-friendly error message for database errors
        if (error.message?.includes('Database error') || error.message?.includes('saving new user')) {
          const friendlyError = new Error(
            'Database setup required!\n\n' +
            'Please apply the database migrations:\n\n' +
            '1. Go to Supabase Dashboard → SQL Editor\n' +
            '2. Run: supabase/migrations/20250217000000_initial_schema.sql\n' +
            '3. Run: supabase/migrations/20250217000001_rls_policies.sql\n\n' +
            'See README.md for detailed instructions.'
          );
          throw friendlyError;
        }
        
        throw error;
      }

      console.log('Sign up successful:', data.user?.id);

      if (data.user) {
        // Wait a bit for the trigger to create the profile
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // Try to fetch the profile (created by trigger)
        let userProfile = await fetchProfile(data.user.id);
        
        // If profile doesn't exist, create it manually (fallback)
        if (!userProfile) {
          console.log('Profile not found, creating manually...');
          const { data: insertedProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email || email,
              full_name: fullName,
              role,
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating profile manually:', insertError);
            console.error('Insert error details:', {
              message: insertError.message,
              code: insertError.code,
              details: insertError.details,
              hint: insertError.hint,
            });
            // Don't throw here - user is created, profile can be fixed later
            // But log the error for debugging
          } else {
            // Set the newly created profile
            setProfile(insertedProfile);
          }
        }
      }
    } catch (error) {
      console.error('Error signing up:', error);
      // Error message is already formatted above if it's a database error
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
