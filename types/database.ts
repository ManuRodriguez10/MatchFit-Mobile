// MatchFit Database Types

export type UserRole = 'athlete' | 'coach' | 'admin';
export type CoachRole = 'head_coach' | 'assistant_coach';
export type PlayerPosition = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
export type EventType = 'game' | 'practice' | 'tournament' | 'meeting';
export type RsvpStatus = 'going' | 'not_going' | 'maybe' | 'no_response';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  onboarding_complete: boolean;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  phone: string | null;
  height_ft: number | null;
  height_in: number | null;
  weight_lbs: number | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamCoach {
  id: string;
  team_id: string;
  coach_id: string;
  role: CoachRole;
  created_at: string;
}

export interface TeamPlayer {
  id: string;
  team_id: string;
  player_id: string;
  jersey_number: number | null;
  positions: PlayerPosition[];
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  team_id: string;
  event_type: EventType;
  title: string | null;
  opponent: string | null;
  location: string | null;
  date: string;
  kickoff_time: string | null;
  notes: string | null;
  created_by: string;
  recurrence_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Rsvp {
  id: string;
  event_id: string;
  player_id: string;
  status: RsvpStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type LineupStatus = 'draft' | 'published';

export interface Lineup {
  id: string;
  team_id: string;
  event_id: string | null;
  title: string;
  formation: string;
  status: LineupStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LineupPlayer {
  id: string;
  lineup_id: string;
  player_id: string;
  position_key: string;   // e.g. "GK", "CB1", "LB", "ST1"
  is_starter: boolean;
  created_at: string;
}

export interface LineupPlayerWithProfile extends LineupPlayer {
  profile: Pick<UserProfile, 'id' | 'full_name' | 'email'>;
  jersey_number: number | null;
  positions: PlayerPosition[];
}

export type CoachInviteRole = 'assistant_coach' | 'head_coach';

export interface CoachInvite {
  id: string;
  team_id: string;
  code: string;
  created_by: string;
  expires_at: string;
  used: boolean;
  invited_role: CoachInviteRole;
  created_at: string;
}

// ── Composite types for joined Supabase queries ───────────────

export interface TeamCoachWithProfile {
  id: string;
  role: CoachRole;
  profile: Pick<UserProfile, 'id' | 'full_name' | 'email'>;
}

export interface TeamPlayerWithProfile {
  id: string;
  jersey_number: number | null;
  positions: PlayerPosition[];
  profile: Pick<UserProfile, 'id' | 'full_name' | 'email'>;
}

export interface TeamWithUserRole {
  teamId: string;
  teamName: string;
  inviteCode: string;
  memberCount: number;
  userRole: CoachRole | 'player';
}
