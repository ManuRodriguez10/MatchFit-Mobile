-- Allow coaches to insert themselves into team_coaches when they have a valid coach invite code
DROP POLICY IF EXISTS "team_coaches_insert_via_invite" ON team_coaches;
CREATE POLICY "team_coaches_insert_via_invite"
  ON public.team_coaches FOR INSERT
  TO authenticated
  WITH CHECK (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.coach_invites
      WHERE coach_invites.team_id = team_coaches.team_id
        AND coach_invites.used = false
        AND coach_invites.expires_at > now()
    )
  );
