-- Fix trigger function with better error handling
-- Run this if you're still getting "Database error saving new user"

-- Drop and recreate the function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_full_name TEXT;
  user_role_val user_role;
BEGIN
  -- Get email (required field)
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email');
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'Email is required for user profile';
  END IF;

  -- Get full name from metadata or default
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User');
  
  -- Get role from metadata or default to 'athlete'
  BEGIN
    user_role_val := COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'athlete');
  EXCEPTION
    WHEN OTHERS THEN
      user_role_val := 'athlete';
  END;

  -- Insert profile (ignore if already exists due to unique constraint)
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, user_email, user_full_name, user_role_val)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the function has the right owner (postgres)
ALTER FUNCTION handle_new_user() OWNER TO postgres;

-- Grant execute permission (though SECURITY DEFINER should handle this)
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;

-- Ensure postgres (function owner) can insert into profiles
-- This is needed for SECURITY DEFINER functions to work with RLS
GRANT INSERT ON public.profiles TO postgres;
