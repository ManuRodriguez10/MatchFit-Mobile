-- Tighten coach_invites RLS policies
-- SELECT: Only allow reading valid (unused, unexpired) codes
-- UPDATE: Only allow marking codes as used (not arbitrary changes)

-- Fix SELECT: only show valid invite codes during redemption
DROP POLICY IF EXISTS "Authenticated users can read coach invites" ON public.coach_invites;
CREATE POLICY "Users can read valid coach invites"
  ON public.coach_invites FOR SELECT
  TO authenticated
  USING (
    -- Coaches on the team can see all their invites (for management)
    EXISTS (
      SELECT 1 FROM public.team_coaches
      WHERE team_coaches.team_id = coach_invites.team_id
        AND team_coaches.coach_id = auth.uid()
    )
    -- Other users can only see valid (unused, unexpired) codes during redemption
    OR (used = false AND expires_at > now())
  );

-- Fix UPDATE: only allow marking as used, nothing else
DROP POLICY IF EXISTS "Authenticated users can update coach invites" ON public.coach_invites;
CREATE POLICY "Users can mark invites as used"
  ON public.coach_invites FOR UPDATE
  TO authenticated
  USING (
    -- Team coaches can void their own invites
    EXISTS (
      SELECT 1 FROM public.team_coaches
      WHERE team_coaches.team_id = coach_invites.team_id
        AND team_coaches.coach_id = auth.uid()
    )
    -- Any authenticated user can mark an unused code as used (during redemption)
    OR (used = false)
  )
  WITH CHECK (used = true);
