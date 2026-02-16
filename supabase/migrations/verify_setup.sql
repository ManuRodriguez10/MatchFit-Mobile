-- MatchFit Database Setup Verification Script
-- Run this in your Supabase SQL Editor to verify migrations are applied correctly

-- Check if profiles table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles')
    THEN '✅ profiles table exists'
    ELSE '❌ profiles table MISSING - Run initial_schema.sql'
  END as profiles_table_check;

-- Check if trigger exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM pg_trigger 
      WHERE tgname = 'on_auth_user_created'
    )
    THEN '✅ on_auth_user_created trigger exists'
    ELSE '❌ on_auth_user_created trigger MISSING - Run initial_schema.sql'
  END as trigger_check;

-- Check if trigger function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
    )
    THEN '✅ handle_new_user function exists'
    ELSE '❌ handle_new_user function MISSING - Run initial_schema.sql'
  END as function_check;

-- Check if RLS is enabled
SELECT 
  CASE 
    WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles')
    THEN '✅ RLS is enabled on profiles table'
    ELSE '❌ RLS NOT enabled on profiles table - Run rls_policies.sql'
  END as rls_check;

-- Check if INSERT policy exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM pg_policies 
      WHERE tablename = 'profiles' AND policyname = 'profiles_insert_own'
    )
    THEN '✅ profiles_insert_own policy exists'
    ELSE '❌ profiles_insert_own policy MISSING - Run rls_policies.sql'
  END as insert_policy_check;

-- Show current profiles count (if any)
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles')
    THEN (SELECT COUNT(*)::text || ' profile(s) found' FROM profiles)
    ELSE 'Table does not exist'
  END as profiles_count;
