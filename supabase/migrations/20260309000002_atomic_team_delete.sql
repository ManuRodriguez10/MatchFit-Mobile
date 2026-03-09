-- Create a stored procedure for atomic team deletion
-- This ensures all related data is cleaned up in a single transaction

CREATE OR REPLACE FUNCTION delete_team_cascade(p_team_id UUID)
RETURNS void AS $$
BEGIN
  -- Verify the caller is the team creator
  IF NOT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = p_team_id AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the team creator can delete a team';
  END IF;

  -- Delete lineup players for all lineups in this team
  DELETE FROM public.lineup_players
  WHERE lineup_id IN (
    SELECT id FROM public.lineups WHERE team_id = p_team_id
  );

  -- Delete lineups
  DELETE FROM public.lineups WHERE team_id = p_team_id;

  -- Delete RSVPs for all events in this team
  DELETE FROM public.rsvps
  WHERE event_id IN (
    SELECT id FROM public.events WHERE team_id = p_team_id
  );

  -- Delete events
  DELETE FROM public.events WHERE team_id = p_team_id;

  -- Delete coach invites
  DELETE FROM public.coach_invites WHERE team_id = p_team_id;

  -- Delete team players
  DELETE FROM public.team_players WHERE team_id = p_team_id;

  -- Delete team coaches
  DELETE FROM public.team_coaches WHERE team_id = p_team_id;

  -- Delete the team itself
  DELETE FROM public.teams WHERE id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
