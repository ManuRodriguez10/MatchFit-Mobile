-- Performance indexes for common query patterns
-- Safe to re-run: uses IF NOT EXISTS

-- Events by team + date (dashboard "today's events", calendar, upcoming games)
CREATE INDEX IF NOT EXISTS idx_events_team_date
  ON events (team_id, date);

-- RSVPs by event (RSVP counts, attendance lists)
CREATE INDEX IF NOT EXISTS idx_rsvps_event
  ON rsvps (event_id);

-- Lineup players by lineup (starter/sub counts, lineup rendering)
CREATE INDEX IF NOT EXISTS idx_lineup_players_lineup
  ON lineup_players (lineup_id);

-- Team players by team (roster, player counts)
CREATE INDEX IF NOT EXISTS idx_team_players_team
  ON team_players (team_id);

-- Team coaches by team (roster, coach listings)
CREATE INDEX IF NOT EXISTS idx_team_coaches_team
  ON team_coaches (team_id);

-- Lineups by team + status (published lineups count, draft lookup)
CREATE INDEX IF NOT EXISTS idx_lineups_team_status
  ON lineups (team_id, status);

-- Lineups by event (check if game has lineup)
CREATE INDEX IF NOT EXISTS idx_lineups_event
  ON lineups (event_id);
