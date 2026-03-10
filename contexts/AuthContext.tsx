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
  ) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
      if (__DEV__) console.error('Error fetching profile:', error);
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

      if (error) {
        // User-friendly error messages
        if (
          error.message?.includes('Invalid login credentials') ||
          error.message?.includes('invalid_credentials') ||
          error.status === 400
        ) {
          throw new Error('Incorrect email or password. Please try again.');
        }
        if (error.message?.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before signing in. Check your inbox for a confirmation link.');
        }
        if (error.message?.includes('Too many requests')) {
          throw new Error('Too many attempts. Please wait a moment and try again.');
        }
        throw new Error('Something went wrong. Please try again.');
      }

      if (data.user) {
        await fetchProfile(data.user.id);
      }
    } catch (error) {
      throw error;
    }
  };

  // Sign up with email, password, full name, and role
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ): Promise<{ needsConfirmation: boolean }> => {
    try {
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
        // User-friendly error messages
        if (
          error.message?.includes('User already registered') ||
          error.message?.includes('already been registered') ||
          error.message?.includes('already registered')
        ) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }

        // Rate limit errors (security feature to prevent abuse)
        if (
          error.message?.includes('For security purposes') ||
          error.message?.includes('rate limit') ||
          error.message?.includes('too many') ||
          error.status === 429
        ) {
          throw new Error('Too many signup attempts. Please wait a few minutes and try again.');
        }

        if (error.message?.includes('Database error') || error.message?.includes('saving new user')) {
          throw new Error(
            'Database setup required. Please apply the database migrations in Supabase.'
          );
        }

        throw error;
      }

      // Check if email confirmation is required
      // Supabase returns a user with no session if confirmation is needed
      const needsConfirmation = !!data.user && !data.session;

      if (data.user && data.session) {
        // User is immediately logged in (email confirmation disabled)
        await new Promise((resolve) => setTimeout(resolve, 500));
        let userProfile = await fetchProfile(data.user.id);

        if (!userProfile) {
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

          if (!insertError && insertedProfile) {
            setProfile(insertedProfile);
          }
        }
      }

      return { needsConfirmation };
    } catch (error) {
      throw error;
    }
  };

  // Mark onboarding as complete for the current user
  const completeOnboarding = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('id', user.id);

      if (error) throw error;

      // Re-fetch profile so root layout re-evaluates routing
      await fetchProfile(user.id);
    } catch (error) {
      if (__DEV__) console.error('Error completing onboarding:', error);
      throw error;
    }
  };

  // Refresh current user's profile from the database
  const refreshProfile = async () => {
    if (!user) return;
    await fetchProfile(user.id);
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
      if (__DEV__) console.error('Error signing out:', error);
      throw error;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    let initialised = false;

    // Get initial session and validate it
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Verify the session is still valid by calling getUser (makes a network request)
        const { data: { user: verifiedUser }, error } = await supabase.auth.getUser();
        if (error || !verifiedUser) {
          // Stale/expired session — clear it and don't set user
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
        } else {
          setSession(session);
          setUser(verifiedUser);
          await fetchProfile(verifiedUser.id);
        }
      }
      initialised = true;
      setLoading(false);
    });

    // Listen for auth changes (skip events before initial validation)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!initialised && event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_OUT') {
        // Session expired or user signed out — clear state
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        // Token silently refreshed — update session, keep user/profile
        setSession(session);
        if (session?.user) setUser(session.user);
        return;
      }

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
    completeOnboarding,
    refreshProfile,
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
