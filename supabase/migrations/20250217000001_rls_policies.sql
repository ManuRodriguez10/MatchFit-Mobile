-- MatchFit RLS Policies Migration
-- Created: 2025-02-17
-- Description: Row Level Security policies for all tables with helper functions

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if the current user is a coach for a specific team
CREATE OR REPLACE FUNCTION is_team_coach(p_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_coaches
    WHERE team_id = p_team_id
    AND coach_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if the current user is a head coach for a specific team
CREATE OR REPLACE FUNCTION is_head_coach(p_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_coaches
    WHERE team_id = p_team_id
    AND coach_id = auth.uid()
    AND role = 'head_coach'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if the current user is a player on a specific team
CREATE OR REPLACE FUNCTION is_team_player(p_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_players
    WHERE team_id = p_team_id
    AND player_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if the current user is a team member (coach or player)
CREATE OR REPLACE FUNCTION is_team_member(p_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_team_coach(p_team_id) OR is_team_player(p_team_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if the current user has a specific role
CREATE OR REPLACE FUNCTION has_role(p_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = p_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if the current user is the team creator
CREATE OR REPLACE FUNCTION is_team_creator(p_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM teams
    WHERE id = p_team_id
    AND created_by = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DROP EXISTING POLICIES (if any)
-- =====================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view other profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Teams policies
DROP POLICY IF EXISTS "Anyone can view teams they're part of" ON teams;
DROP POLICY IF EXISTS "Coaches can create teams" ON teams;
DROP POLICY IF EXISTS "Team creators can update their teams" ON teams;
DROP POLICY IF EXISTS "Team creators can delete their teams" ON teams;

-- Team coaches policies
DROP POLICY IF EXISTS "Anyone can view coaches of their teams" ON team_coaches;
DROP POLICY IF EXISTS "Team creators and head coaches can manage coaches" ON team_coaches;
DROP POLICY IF EXISTS "Coaches can add themselves to teams with invite code" ON team_coaches;

-- Team players policies
DROP POLICY IF EXISTS "Anyone can view players of their teams" ON team_players;
DROP POLICY IF EXISTS "Coaches can manage team players" ON team_players;

-- Events policies
DROP POLICY IF EXISTS "Anyone can view events for their teams" ON events;
DROP POLICY IF EXISTS "Coaches can create events for their teams" ON events;
DROP POLICY IF EXISTS "Coaches can update events for their teams" ON events;
DROP POLICY IF EXISTS "Coaches can delete events for their teams" ON events;

-- RSVPs policies
DROP POLICY IF EXISTS "Anyone can view RSVPs for their team events" ON rsvps;
DROP POLICY IF EXISTS "Players can manage their own RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Players can create their own RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Players can update their own RSVPs" ON rsvps;
DROP POLICY IF EXISTS "Players can delete their own RSVPs" ON rsvps;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- SELECT: Users can view their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- SELECT: Users can view profiles of people on their teams
DROP POLICY IF EXISTS "profiles_select_team_members" ON profiles;
CREATE POLICY "profiles_select_team_members"
  ON profiles FOR SELECT
  USING (
    id IN (
      -- Get all coaches from user's teams
      SELECT coach_id
      FROM team_coaches
      WHERE team_id IN (
        SELECT team_id FROM team_coaches WHERE coach_id = auth.uid()
        UNION
        SELECT team_id FROM team_players WHERE player_id = auth.uid()
      )
      UNION
      -- Get all players from user's teams
      SELECT player_id
      FROM team_players
      WHERE team_id IN (
        SELECT team_id FROM team_coaches WHERE coach_id = auth.uid()
        UNION
        SELECT team_id FROM team_players WHERE player_id = auth.uid()
      )
    )
  );

-- UPDATE: Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT: Users can insert their own profile (handled by trigger, but policy needed)
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- TEAMS POLICIES
-- =====================================================

-- SELECT: Users can view teams they're part of
DROP POLICY IF EXISTS "teams_select_member" ON teams;
CREATE POLICY "teams_select_member"
  ON teams FOR SELECT
  USING (is_team_member(id) OR created_by = auth.uid());

-- INSERT: Coaches and admins can create teams
DROP POLICY IF EXISTS "teams_insert_coach" ON teams;
CREATE POLICY "teams_insert_coach"
  ON teams FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (has_role('coach') OR has_role('admin'))
  );

-- UPDATE: Team creators and head coaches can update teams
DROP POLICY IF EXISTS "teams_update_authorized" ON teams;
CREATE POLICY "teams_update_authorized"
  ON teams FOR UPDATE
  USING (is_team_creator(id) OR is_head_coach(id))
  WITH CHECK (is_team_creator(id) OR is_head_coach(id));

-- DELETE: Only team creators can delete teams
DROP POLICY IF EXISTS "teams_delete_creator" ON teams;
CREATE POLICY "teams_delete_creator"
  ON teams FOR DELETE
  USING (is_team_creator(id));

-- =====================================================
-- TEAM_COACHES POLICIES
-- =====================================================

-- SELECT: Team members can view coaches
DROP POLICY IF EXISTS "team_coaches_select_member" ON team_coaches;
CREATE POLICY "team_coaches_select_member"
  ON team_coaches FOR SELECT
  USING (is_team_member(team_id));

-- INSERT: Team creators and head coaches can add coaches
DROP POLICY IF EXISTS "team_coaches_insert_authorized" ON team_coaches;
CREATE POLICY "team_coaches_insert_authorized"
  ON team_coaches FOR INSERT
  WITH CHECK (
    is_team_creator(team_id) OR is_head_coach(team_id)
  );

-- UPDATE: Team creators and head coaches can update coach roles
DROP POLICY IF EXISTS "team_coaches_update_authorized" ON team_coaches;
CREATE POLICY "team_coaches_update_authorized"
  ON team_coaches FOR UPDATE
  USING (is_team_creator(team_id) OR is_head_coach(team_id))
  WITH CHECK (is_team_creator(team_id) OR is_head_coach(team_id));

-- DELETE: Team creators and head coaches can remove coaches (except themselves)
DROP POLICY IF EXISTS "team_coaches_delete_authorized" ON team_coaches;
CREATE POLICY "team_coaches_delete_authorized"
  ON team_coaches FOR DELETE
  USING (
    (is_team_creator(team_id) OR is_head_coach(team_id))
    AND coach_id != auth.uid() -- Can't remove yourself
  );

-- =====================================================
-- TEAM_PLAYERS POLICIES
-- =====================================================

-- SELECT: Team members can view players
DROP POLICY IF EXISTS "team_players_select_member" ON team_players;
CREATE POLICY "team_players_select_member"
  ON team_players FOR SELECT
  USING (is_team_member(team_id));

-- INSERT: Coaches can add players to their teams
DROP POLICY IF EXISTS "team_players_insert_coach" ON team_players;
CREATE POLICY "team_players_insert_coach"
  ON team_players FOR INSERT
  WITH CHECK (is_team_coach(team_id));

-- UPDATE: Coaches can update player details
DROP POLICY IF EXISTS "team_players_update_coach" ON team_players;
CREATE POLICY "team_players_update_coach"
  ON team_players FOR UPDATE
  USING (is_team_coach(team_id))
  WITH CHECK (is_team_coach(team_id));

-- DELETE: Coaches can remove players from teams
DROP POLICY IF EXISTS "team_players_delete_coach" ON team_players;
CREATE POLICY "team_players_delete_coach"
  ON team_players FOR DELETE
  USING (is_team_coach(team_id));

-- =====================================================
-- EVENTS POLICIES
-- =====================================================

-- SELECT: Team members can view events for their teams
DROP POLICY IF EXISTS "events_select_member" ON events;
CREATE POLICY "events_select_member"
  ON events FOR SELECT
  USING (is_team_member(team_id));

-- INSERT: Coaches can create events for their teams
DROP POLICY IF EXISTS "events_insert_coach" ON events;
CREATE POLICY "events_insert_coach"
  ON events FOR INSERT
  WITH CHECK (
    is_team_coach(team_id)
    AND auth.uid() = created_by
  );

-- UPDATE: Coaches can update events for their teams
DROP POLICY IF EXISTS "events_update_coach" ON events;
CREATE POLICY "events_update_coach"
  ON events FOR UPDATE
  USING (is_team_coach(team_id))
  WITH CHECK (is_team_coach(team_id));

-- DELETE: Coaches can delete events for their teams
DROP POLICY IF EXISTS "events_delete_coach" ON events;
CREATE POLICY "events_delete_coach"
  ON events FOR DELETE
  USING (is_team_coach(team_id));

-- =====================================================
-- RSVPS POLICIES
-- =====================================================

-- SELECT: Team members can view RSVPs for their team events
DROP POLICY IF EXISTS "rsvps_select_member" ON rsvps;
CREATE POLICY "rsvps_select_member"
  ON rsvps FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM events
      WHERE events.id = rsvps.event_id
      AND is_team_member(events.team_id)
    )
  );

-- INSERT: Players can create RSVPs for their team events
DROP POLICY IF EXISTS "rsvps_insert_player" ON rsvps;
CREATE POLICY "rsvps_insert_player"
  ON rsvps FOR INSERT
  WITH CHECK (
    auth.uid() = player_id
    AND EXISTS (
      SELECT 1
      FROM events
      WHERE events.id = event_id
      AND is_team_player(events.team_id)
    )
  );

-- UPDATE: Players can update their own RSVPs
DROP POLICY IF EXISTS "rsvps_update_own" ON rsvps;
CREATE POLICY "rsvps_update_own"
  ON rsvps FOR UPDATE
  USING (auth.uid() = player_id)
  WITH CHECK (auth.uid() = player_id);

-- DELETE: Players can delete their own RSVPs
DROP POLICY IF EXISTS "rsvps_delete_own" ON rsvps;
CREATE POLICY "rsvps_delete_own"
  ON rsvps FOR DELETE
  USING (auth.uid() = player_id);

-- =====================================================
-- ADMIN OVERRIDE POLICIES
-- =====================================================

-- Admins can view all data
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
CREATE POLICY "profiles_admin_all"
  ON profiles FOR ALL
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

DROP POLICY IF EXISTS "teams_admin_all" ON teams;
CREATE POLICY "teams_admin_all"
  ON teams FOR ALL
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

DROP POLICY IF EXISTS "team_coaches_admin_all" ON team_coaches;
CREATE POLICY "team_coaches_admin_all"
  ON team_coaches FOR ALL
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

DROP POLICY IF EXISTS "team_players_admin_all" ON team_players;
CREATE POLICY "team_players_admin_all"
  ON team_players FOR ALL
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

DROP POLICY IF EXISTS "events_admin_all" ON events;
CREATE POLICY "events_admin_all"
  ON events FOR ALL
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

DROP POLICY IF EXISTS "rsvps_admin_all" ON rsvps;
CREATE POLICY "rsvps_admin_all"
  ON rsvps FOR ALL
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION is_team_coach(UUID) IS 'Check if current user is a coach for the specified team';
COMMENT ON FUNCTION is_head_coach(UUID) IS 'Check if current user is a head coach for the specified team';
COMMENT ON FUNCTION is_team_player(UUID) IS 'Check if current user is a player on the specified team';
COMMENT ON FUNCTION is_team_member(UUID) IS 'Check if current user is a member (coach or player) of the specified team';
COMMENT ON FUNCTION has_role(user_role) IS 'Check if current user has the specified role';
COMMENT ON FUNCTION is_team_creator(UUID) IS 'Check if current user created the specified team';
