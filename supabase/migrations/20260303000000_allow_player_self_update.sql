-- Allow players to update their own team_players row (jersey number, positions, etc.)
DROP POLICY IF EXISTS "team_players_update_self" ON team_players;
CREATE POLICY "team_players_update_self"
  ON team_players FOR UPDATE
  USING (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);
