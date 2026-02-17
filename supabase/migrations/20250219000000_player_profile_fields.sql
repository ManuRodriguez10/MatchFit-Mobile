-- Add player profile fields to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name      TEXT,
  ADD COLUMN IF NOT EXISTS last_name       TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth   DATE,
  ADD COLUMN IF NOT EXISTS nationality     TEXT,
  ADD COLUMN IF NOT EXISTS phone           TEXT,
  ADD COLUMN IF NOT EXISTS height_ft       INTEGER,
  ADD COLUMN IF NOT EXISTS height_in       INTEGER CHECK (height_in >= 0 AND height_in <= 11),
  ADD COLUMN IF NOT EXISTS weight_lbs      INTEGER CHECK (weight_lbs > 0);

-- SECURITY DEFINER function for invite code lookup (avoids widening teams RLS)
CREATE OR REPLACE FUNCTION find_team_by_invite_code(p_code TEXT)
RETURNS TABLE(id UUID, name TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT t.id, t.name FROM teams t WHERE t.invite_code = p_code;
END;
$$;

GRANT EXECUTE ON FUNCTION find_team_by_invite_code(TEXT) TO authenticated;

-- SECURITY DEFINER function for jersey uniqueness check
CREATE OR REPLACE FUNCTION check_jersey_available(p_team_id UUID, p_jersey_number INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM team_players
    WHERE team_id = p_team_id AND jersey_number = p_jersey_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_jersey_available(UUID, INTEGER) TO authenticated;

-- RLS policy: allow players to insert their own row
CREATE POLICY "team_players_insert_self" ON team_players FOR INSERT
WITH CHECK (
  auth.uid() = player_id
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'athlete')
);
