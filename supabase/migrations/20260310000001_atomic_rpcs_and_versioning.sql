-- Atomic RPC functions and optimistic locking for lineups
-- Safe to re-run: uses CREATE OR REPLACE and IF NOT EXISTS

-- =====================================================
-- 1. Optimistic locking: version column on lineups
-- =====================================================

ALTER TABLE public.lineups
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Auto-increment version on every update
CREATE OR REPLACE FUNCTION increment_lineup_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lineups_version ON public.lineups;
CREATE TRIGGER trg_lineups_version
  BEFORE UPDATE ON public.lineups
  FOR EACH ROW EXECUTE FUNCTION increment_lineup_version();

-- =====================================================
-- 2. Atomic team creation: team + coach in one transaction
-- =====================================================

CREATE OR REPLACE FUNCTION create_team_with_coach(
  p_team_name TEXT,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team RECORD;
BEGIN
  -- Validate inputs
  IF p_team_name IS NULL OR length(trim(p_team_name)) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'Team name must be at least 2 characters');
  END IF;

  IF length(trim(p_team_name)) > 50 THEN
    RETURN json_build_object('success', false, 'error', 'Team name must be 50 characters or less');
  END IF;

  -- Create team
  INSERT INTO teams (name, created_by)
  VALUES (trim(p_team_name), p_user_id)
  RETURNING id, invite_code INTO v_team;

  -- Add creator as head coach
  INSERT INTO team_coaches (team_id, coach_id, role)
  VALUES (v_team.id, p_user_id, 'head_coach');

  RETURN json_build_object(
    'success', true,
    'team_id', v_team.id,
    'invite_code', v_team.invite_code
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =====================================================
-- 3. Atomic lineup publish: validate + publish in one step
-- =====================================================

CREATE OR REPLACE FUNCTION publish_lineup(
  p_lineup_id UUID,
  p_expected_version INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lineup RECORD;
  v_starter_count INTEGER;
  v_updated_count INTEGER;
BEGIN
  -- Get lineup
  SELECT id, team_id, status, version
  INTO v_lineup
  FROM lineups
  WHERE id = p_lineup_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Lineup not found');
  END IF;

  -- Verify caller is a coach on this team
  IF NOT is_team_coach(v_lineup.team_id) THEN
    RETURN json_build_object('success', false, 'error', 'Only coaches can publish lineups');
  END IF;

  -- Optimistic locking check
  IF p_expected_version IS NOT NULL AND v_lineup.version != p_expected_version THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This lineup was edited by another coach. Please reload and try again.',
      'code', 'VERSION_CONFLICT'
    );
  END IF;

  -- Count starters
  SELECT COUNT(*) INTO v_starter_count
  FROM lineup_players
  WHERE lineup_id = p_lineup_id AND is_starter = true;

  IF v_starter_count < 11 THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Need 11 starters to publish (currently %s)', v_starter_count),
      'starters', v_starter_count
    );
  END IF;

  -- Publish (trigger auto-increments version)
  UPDATE lineups
  SET status = 'published'
  WHERE id = p_lineup_id;

  RETURN json_build_object('success', true, 'version', v_lineup.version + 1);
END;
$$;
