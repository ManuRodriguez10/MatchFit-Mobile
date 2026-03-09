-- Create lineups and lineup_players tables with RLS policies
-- These tables were created manually in the dashboard but need migration files

-- =====================================================
-- LINEUPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.lineups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  formation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lineups_team_id ON public.lineups(team_id);
CREATE INDEX IF NOT EXISTS idx_lineups_event_id ON public.lineups(event_id);
CREATE INDEX IF NOT EXISTS idx_lineups_status ON public.lineups(team_id, status);

-- =====================================================
-- LINEUP_PLAYERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.lineup_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lineup_id UUID NOT NULL REFERENCES public.lineups(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position_key TEXT NOT NULL,
  is_starter BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lineup_players_lineup_id ON public.lineup_players(lineup_id);
CREATE INDEX IF NOT EXISTS idx_lineup_players_player_id ON public.lineup_players(player_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineup_players ENABLE ROW LEVEL SECURITY;

-- LINEUPS: Team members can view published lineups, coaches can view all
DROP POLICY IF EXISTS "lineups_select_member" ON public.lineups;
CREATE POLICY "lineups_select_member"
  ON public.lineups FOR SELECT
  TO authenticated
  USING (
    is_team_coach(team_id)
    OR (is_team_player(team_id) AND status = 'published')
  );

-- LINEUPS: Only coaches can create lineups
DROP POLICY IF EXISTS "lineups_insert_coach" ON public.lineups;
CREATE POLICY "lineups_insert_coach"
  ON public.lineups FOR INSERT
  TO authenticated
  WITH CHECK (
    is_team_coach(team_id)
    AND auth.uid() = created_by
  );

-- LINEUPS: Only coaches can update lineups
DROP POLICY IF EXISTS "lineups_update_coach" ON public.lineups;
CREATE POLICY "lineups_update_coach"
  ON public.lineups FOR UPDATE
  TO authenticated
  USING (is_team_coach(team_id))
  WITH CHECK (is_team_coach(team_id));

-- LINEUPS: Only coaches can delete lineups
DROP POLICY IF EXISTS "lineups_delete_coach" ON public.lineups;
CREATE POLICY "lineups_delete_coach"
  ON public.lineups FOR DELETE
  TO authenticated
  USING (is_team_coach(team_id));

-- LINEUP_PLAYERS: Viewable if the parent lineup is viewable
DROP POLICY IF EXISTS "lineup_players_select" ON public.lineup_players;
CREATE POLICY "lineup_players_select"
  ON public.lineup_players FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lineups
      WHERE lineups.id = lineup_players.lineup_id
        AND (
          is_team_coach(lineups.team_id)
          OR (is_team_player(lineups.team_id) AND lineups.status = 'published')
        )
    )
  );

-- LINEUP_PLAYERS: Only coaches can insert
DROP POLICY IF EXISTS "lineup_players_insert_coach" ON public.lineup_players;
CREATE POLICY "lineup_players_insert_coach"
  ON public.lineup_players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lineups
      WHERE lineups.id = lineup_players.lineup_id
        AND is_team_coach(lineups.team_id)
    )
  );

-- LINEUP_PLAYERS: Only coaches can delete
DROP POLICY IF EXISTS "lineup_players_delete_coach" ON public.lineup_players;
CREATE POLICY "lineup_players_delete_coach"
  ON public.lineup_players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lineups
      WHERE lineups.id = lineup_players.lineup_id
        AND is_team_coach(lineups.team_id)
    )
  );

-- ADMIN overrides
DROP POLICY IF EXISTS "lineups_admin_all" ON public.lineups;
CREATE POLICY "lineups_admin_all"
  ON public.lineups FOR ALL
  TO authenticated
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

DROP POLICY IF EXISTS "lineup_players_admin_all" ON public.lineup_players;
CREATE POLICY "lineup_players_admin_all"
  ON public.lineup_players FOR ALL
  TO authenticated
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));
