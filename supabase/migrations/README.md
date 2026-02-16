# Database Migrations

This directory contains Supabase database migrations for the MatchFit Mobile app.

## Migration Files

- `20250217000000_initial_schema.sql` - Initial database schema with core tables
- `20250217000001_rls_policies.sql` - Row Level Security policies with helper functions

## How to Apply Migrations

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file
4. Paste and run the SQL

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link your project (first time only)
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push

# Or apply a specific migration
supabase db push --file supabase/migrations/20250217000000_initial_schema.sql
```

### Option 3: Copy-Paste Individual Sections

You can also copy and run sections individually in the SQL Editor:

1. Extensions and Enums
2. Tables
3. Indexes
4. Functions
5. Triggers
6. Row Level Security (RLS) policies

## Schema Overview

### Tables

1. **profiles** - User profiles (extends auth.users)
2. **teams** - Sports teams with auto-generated invite codes
3. **team_coaches** - Coach assignments to teams
4. **team_players** - Player roster with jersey numbers and positions
5. **events** - Team events (games, practices, tournaments, meetings)
6. **rsvps** - Player responses to events

### Key Features

- ✅ Auto-generated 6-character invite codes for teams
- ✅ Timezone-aware event scheduling (TIMESTAMPTZ)
- ✅ Row Level Security (RLS) on all tables
- ✅ Automatic timestamp updates
- ✅ Foreign key constraints and indexes
- ✅ Cascading deletes where appropriate

### Enums

- `user_role`: athlete, coach, admin
- `coach_role`: head_coach, assistant_coach
- `player_position`: goalkeeper, defender, midfielder, forward
- `event_type`: game, practice, tournament, meeting
- `rsvp_status`: going, not_going, maybe, no_response

## RLS Helper Functions

The RLS policies migration provides several helper functions:

- `is_team_coach(team_id)` - Check if user is a coach for a team
- `is_head_coach(team_id)` - Check if user is a head coach for a team
- `is_team_player(team_id)` - Check if user is a player on a team
- `is_team_member(team_id)` - Check if user is a member (coach or player)
- `has_role(role)` - Check if user has a specific role (athlete/coach/admin)
- `is_team_creator(team_id)` - Check if user created a team

These functions are used throughout the RLS policies to enforce proper access control.

## Access Control Summary

### Profiles
- ✅ Users can view their own profile
- ✅ Users can view profiles of teammates
- ✅ Users can update only their own profile

### Teams
- ✅ Members can view their teams
- ✅ Coaches/admins can create teams
- ✅ Creators and head coaches can update teams
- ✅ Only creators can delete teams

### Team Coaches
- ✅ Members can view coaches
- ✅ Creators and head coaches can add/remove coaches
- ⚠️ Coaches cannot remove themselves

### Team Players
- ✅ Members can view players
- ✅ Coaches can add/update/remove players

### Events
- ✅ Members can view team events
- ✅ Coaches can create/update/delete events

### RSVPs
- ✅ Members can view all RSVPs for team events
- ✅ Players can manage only their own RSVPs
- ✅ Players can only RSVP to events for teams they're on

### Admin Override
- 🔐 Admins have full access to all tables

## Testing the Schema

After applying the migration, you can test with:

```sql
-- Create a test coach profile (run after signing up a user)
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  'your-user-id-from-auth',
  'coach@test.com',
  'Test Coach',
  'coach'
);

-- Create a test team (invite_code will be auto-generated)
INSERT INTO teams (name, created_by)
VALUES ('Test Team', 'your-user-id-from-auth');

-- Check the invite code was generated
SELECT name, invite_code FROM teams;
```

## Rollback

If you need to rollback this migration:

```sql
-- Drop all tables (in reverse order of dependencies)
DROP TABLE IF EXISTS rsvps CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS team_players CASCADE;
DROP TABLE IF EXISTS team_coaches CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop enums
DROP TYPE IF EXISTS rsvp_status;
DROP TYPE IF EXISTS event_type;
DROP TYPE IF EXISTS player_position;
DROP TYPE IF EXISTS coach_role;
DROP TYPE IF EXISTS user_role;

-- Drop functions
DROP FUNCTION IF EXISTS generate_invite_code();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS set_invite_code();
```

## Notes

- The `profiles` table is automatically populated when users sign up via the `handle_new_user()` trigger
- Invite codes are automatically generated when creating teams
- All timestamps are stored with timezone information (TIMESTAMPTZ)
- RLS policies ensure users can only access data for teams they belong to
