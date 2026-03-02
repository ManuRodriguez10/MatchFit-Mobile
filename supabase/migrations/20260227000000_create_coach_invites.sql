-- Create coach_invites table for one-time coach invitation codes
CREATE TABLE IF NOT EXISTS public.coach_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  invited_role TEXT NOT NULL DEFAULT 'assistant_coach'
    CHECK (invited_role IN ('assistant_coach', 'head_coach')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast code lookups during redemption
CREATE INDEX IF NOT EXISTS idx_coach_invites_code ON public.coach_invites(code);
CREATE INDEX IF NOT EXISTS idx_coach_invites_team ON public.coach_invites(team_id);

-- RLS
ALTER TABLE public.coach_invites ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read (needed to validate codes during onboarding)
CREATE POLICY "Authenticated users can read coach invites"
  ON public.coach_invites FOR SELECT
  TO authenticated
  USING (true);

-- Only coaches on the team can insert new invites
CREATE POLICY "Team coaches can create invites"
  ON public.coach_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_coaches
      WHERE team_coaches.team_id = coach_invites.team_id
        AND team_coaches.coach_id = auth.uid()
    )
  );

-- Any authenticated user can update (needed to mark code as used during redemption)
CREATE POLICY "Authenticated users can update coach invites"
  ON public.coach_invites FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
