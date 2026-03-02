-- Add unique constraint on (event_id, player_id) for RSVP upsert support
ALTER TABLE public.rsvps
  ADD CONSTRAINT rsvps_event_player_unique UNIQUE (event_id, player_id);
