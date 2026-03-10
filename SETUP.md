# MatchFit Mobile — Setup Guide

## Prerequisites

- Node.js 18+
- npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator
- A Supabase project (https://supabase.com)

## 1. Environment Variables

Create a `.env` file in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_SENTRY_DSN=https://your-sentry-dsn-here (optional, for error tracking)
```

Get these from your Supabase dashboard under **Settings > API**.

## 2. Install Dependencies

```bash
npm install
```

## 3. Database Migrations

Run the following SQL files **in order** in the Supabase SQL Editor (Dashboard > SQL Editor):

| # | File | Purpose |
|---|------|---------|
| 1 | `20250217000000_initial_schema.sql` | Core tables: profiles, teams, team_coaches, team_players, events, rsvps |
| 2 | `20250217000001_rls_policies.sql` | Row Level Security policies |
| 3 | `20250217000002_fix_trigger.sql` | Fix profile creation trigger |
| 4 | `20250218000000_add_onboarding_flag.sql` | Add onboarding_complete to profiles |
| 5 | `20250219000000_player_profile_fields.sql` | Player profile fields (height, weight, DOB, etc.) |
| 6 | `20260220000001_add_event_title.sql` | Add title column to events |
| 7 | `20260220000002_add_event_recurrence.sql` | Add recurrence support for events |
| 8 | `20260225000000_add_venue_to_events.sql` | Add venue (home/away) to events |
| 9 | `20260225000001_fix_events_rls_policy.sql` | Fix events RLS for team members |
| 10 | `20260225000002_auto_add_creator_as_coach.sql` | Auto-add team creator as head_coach |
| 11 | `20260227000000_create_coach_invites.sql` | Coach invite codes table |
| 12 | `20260301000000_add_rsvp_unique_constraint.sql` | Unique constraint on RSVPs |
| 13 | `20260303000000_allow_player_self_update.sql` | Allow players to update own profile |
| 14 | `20260307000000_allow_coach_join_via_invite.sql` | RLS for coach joining via invite code |
| 15 | `20260309000000_create_lineup_tables.sql` | Lineups and lineup_players tables |
| 16 | `20260309000001_fix_coach_invites_rls.sql` | Tighten coach_invites RLS |
| 17 | `20260309000002_atomic_team_delete.sql` | Atomic team deletion RPC |
| 18 | `20260310000000_add_performance_indexes.sql` | Performance indexes for common queries |
| 19 | `20260310000001_atomic_rpcs_and_versioning.sql` | Atomic RPCs (create_team_with_coach, publish_lineup) + lineup versioning |

All migrations use `IF NOT EXISTS` / `CREATE OR REPLACE` and are safe to re-run.

## 4. Run the App

```bash
npx expo start
```

- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan the QR code with Expo Go for a physical device

## 5. Supabase Auth Configuration

In your Supabase dashboard under **Authentication > Settings**:

- **Email confirmations**: Enable or disable based on your preference
- **Site URL**: Set to your app's deep link scheme if using email confirmation

## Project Structure

```
app/                    # Expo Router screens
  (auth)/               # Login & signup
  (onboarding)/         # First-time user flow
  (tabs)/               # Main app (team management)
    team/
      [teamId]/         # Team-specific screens (dashboard, events, lineups, etc.)
components/             # Reusable UI components
contexts/               # React contexts (AuthContext)
constants/              # Colors, UI constants
hooks/                  # Custom hooks
lib/                    # Supabase client
types/                  # TypeScript types
supabase/migrations/    # SQL migration files
```
