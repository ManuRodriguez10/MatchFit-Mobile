-- Debug script to check trigger and function setup
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Check if trigger exists
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- 2. Check if function exists and its definition
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 3. Check if profiles table exists and has correct structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 4. Check RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 5. Check existing policies on profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 6. Test the function manually (this will show any errors)
-- Uncomment and run with a test user ID if you have one
-- SELECT handle_new_user();

-- 7. Check recent errors in Supabase logs
-- Go to: Supabase Dashboard -> Logs -> Postgres Logs
-- Look for errors related to 'handle_new_user' or 'profiles'
