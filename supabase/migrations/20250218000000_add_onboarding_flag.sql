-- Add onboarding_complete flag to profiles table
-- This tracks whether a coach has completed the initial onboarding flow
-- (selecting/creating a team and seeing their invite code)
-- Default FALSE so existing coaches will be prompted to onboard once

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;
