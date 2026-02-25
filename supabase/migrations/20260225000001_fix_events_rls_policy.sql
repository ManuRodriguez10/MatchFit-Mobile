-- Fix events INSERT RLS policy to allow team creators and coaches to create events
DROP POLICY IF EXISTS "events_insert_coach" ON events;

CREATE POLICY "events_insert_coach"
  ON events FOR INSERT
  WITH CHECK (
    (is_team_coach(team_id) OR is_team_creator(team_id))
    AND auth.uid() = created_by
  );
