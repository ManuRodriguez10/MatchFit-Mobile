-- MatchFit Initial Schema Migration
-- Created: 2025-02-17
-- Description: Core tables for teams, players, coaches, events, and RSVPs

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

-- User roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('athlete', 'coach', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Coach roles within a team
DO $$ BEGIN
  CREATE TYPE coach_role AS ENUM ('head_coach', 'assistant_coach');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Player positions
DO $$ BEGIN
  CREATE TYPE player_position AS ENUM (
    'goalkeeper',
    'defender',
    'midfielder',
    'forward'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Event types
DO $$ BEGIN
  CREATE TYPE event_type AS ENUM (
    'game',
    'practice',
    'tournament',
    'meeting'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- RSVP status
DO $$ BEGIN
  CREATE TYPE rsvp_status AS ENUM (
    'going',
    'not_going',
    'maybe',
    'no_response'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABLES
-- =====================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'athlete',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team coaches junction table
CREATE TABLE IF NOT EXISTS team_coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role coach_role NOT NULL DEFAULT 'assistant_coach',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, coach_id)
);

-- Team players junction table
CREATE TABLE IF NOT EXISTS team_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  jersey_number INTEGER,
  positions player_position[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, player_id),
  UNIQUE(team_id, jersey_number)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  opponent TEXT,
  location TEXT,
  date DATE NOT NULL,
  kickoff_time TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RSVPs table
CREATE TABLE IF NOT EXISTS rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status rsvp_status NOT NULL DEFAULT 'no_response',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, player_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON teams(invite_code);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);

-- Team coaches indexes
CREATE INDEX IF NOT EXISTS idx_team_coaches_team_id ON team_coaches(team_id);
CREATE INDEX IF NOT EXISTS idx_team_coaches_coach_id ON team_coaches(coach_id);
CREATE INDEX IF NOT EXISTS idx_team_coaches_role ON team_coaches(role);

-- Team players indexes
CREATE INDEX IF NOT EXISTS idx_team_players_team_id ON team_players(team_id);
CREATE INDEX IF NOT EXISTS idx_team_players_player_id ON team_players(player_id);
CREATE INDEX IF NOT EXISTS idx_team_players_jersey_number ON team_players(team_id, jersey_number);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_team_id ON events(team_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_kickoff_time ON events(kickoff_time);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

-- RSVPs indexes
CREATE INDEX IF NOT EXISTS idx_rsvps_event_id ON rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_player_id ON rsvps(player_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_status ON rsvps(status);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to generate random 6-character invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;

    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM teams WHERE invite_code = result) INTO code_exists;

    -- Exit loop if unique code found
    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user creation
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

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Create the function first, then the trigger
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code = generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_team_invite_code ON teams;
CREATE TRIGGER set_team_invite_code
  BEFORE INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION set_invite_code();

-- Trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Triggers for updated_at timestamp
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_players_updated_at ON team_players;
CREATE TRIGGER update_team_players_updated_at
  BEFORE UPDATE ON team_players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rsvps_updated_at ON rsvps;
CREATE TRIGGER update_rsvps_updated_at
  BEFORE UPDATE ON rsvps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Teams policies
CREATE POLICY "Anyone can view teams they're part of"
  ON teams FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM team_coaches WHERE coach_id = auth.uid()
      UNION
      SELECT team_id FROM team_players WHERE player_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Coaches can create teams"
  ON teams FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('coach', 'admin')
    )
  );

CREATE POLICY "Team creators can update their teams"
  ON teams FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Team creators can delete their teams"
  ON teams FOR DELETE
  USING (created_by = auth.uid());

-- Team coaches policies
CREATE POLICY "Anyone can view coaches of their teams"
  ON team_coaches FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_coaches WHERE coach_id = auth.uid()
      UNION
      SELECT team_id FROM team_players WHERE player_id = auth.uid()
    )
  );

CREATE POLICY "Team creators and head coaches can manage coaches"
  ON team_coaches FOR ALL
  USING (
    team_id IN (
      SELECT id FROM teams WHERE created_by = auth.uid()
      UNION
      SELECT team_id FROM team_coaches
      WHERE coach_id = auth.uid() AND role = 'head_coach'
    )
  );

-- Team players policies
CREATE POLICY "Anyone can view players of their teams"
  ON team_players FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_coaches WHERE coach_id = auth.uid()
      UNION
      SELECT team_id FROM team_players WHERE player_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can manage team players"
  ON team_players FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_coaches WHERE coach_id = auth.uid()
    )
  );

-- Events policies
CREATE POLICY "Anyone can view events for their teams"
  ON events FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_coaches WHERE coach_id = auth.uid()
      UNION
      SELECT team_id FROM team_players WHERE player_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can create events for their teams"
  ON events FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_coaches WHERE coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update events for their teams"
  ON events FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_coaches WHERE coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete events for their teams"
  ON events FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_coaches WHERE coach_id = auth.uid()
    )
  );

-- RSVPs policies
CREATE POLICY "Anyone can view RSVPs for their team events"
  ON rsvps FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE team_id IN (
        SELECT team_id FROM team_coaches WHERE coach_id = auth.uid()
        UNION
        SELECT team_id FROM team_players WHERE player_id = auth.uid()
      )
    )
  );

CREATE POLICY "Players can manage their own RSVPs"
  ON rsvps FOR ALL
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE profiles IS 'User profiles extending auth.users';
COMMENT ON TABLE teams IS 'Sports teams with invite codes';
COMMENT ON TABLE team_coaches IS 'Junction table for team-coach relationships';
COMMENT ON TABLE team_players IS 'Junction table for team-player relationships with jersey numbers';
COMMENT ON TABLE events IS 'Team events (games, practices, tournaments, meetings)';
COMMENT ON TABLE rsvps IS 'Player responses to events';

COMMENT ON COLUMN teams.invite_code IS 'Auto-generated 6-character code for team invites';
COMMENT ON COLUMN team_players.positions IS 'Array of positions player can play';
COMMENT ON COLUMN events.kickoff_time IS 'Event start time with timezone support';
