# Roadmap

Planned work for MatchFit Mobile, roughly in priority order. Estimates are focused working hours.

**Total: ~58 hours**

## 1. Fix and harden (≈14h)

| Item | Type | Est. |
|------|------|------|
| Fix the 62 TypeScript errors reported by `tsc --noEmit` (mostly in `app/`, plus `LinearGradient` color tuples in `StatCard`, `TeamCard`, `PlayerSelector`) | Bug fix | 4h |
| Generate Supabase types with `supabase gen types typescript` so `lib/supabase.ts` gets a real `Database` type and queries are type-checked end to end | Refactor | 2h |
| Add a `typecheck` and `lint` script (ESLint + `eslint-config-expo`) and fix what they flag | Tooling | 3h |
| GitHub Actions CI: `npm ci`, typecheck, lint, Jest on every push and PR | Tooling | 2h |
| Audit every RLS policy against the coach / player roles with SQL tests (pgTAP or Supabase test helpers), especially coach invites and lineup publishing | Tests / security | 3h |

## 2. Offline-first sync (≈12h)

Work in progress on the `wip/offline-sync` branch (`SyncContext`, `useOfflineMutation`, a persisted mutation queue and a sync engine).

| Item | Type | Est. |
|------|------|------|
| Finish the mutation queue: retry with backoff, dedupe, and drop or flag mutations that fail permanently | Feature | 4h |
| Conflict handling for RSVPs and lineups, using the existing lineup versioning to detect stale writes | Feature | 3h |
| Show pending-sync state in the UI (offline banner count, per-item "not synced yet" badge) | Feature | 2h |
| Unit tests for the queue and sync engine with a mocked Supabase client and network state | Tests | 3h |

## 3. Features (≈18h)

| Item | Type | Est. |
|------|------|------|
| Push notifications (Expo Notifications) for new events, lineup published, and RSVP reminders 24h before kickoff | Feature | 6h |
| Attendance stats per player across a season (RSVP history, games started) on the team dashboard | Feature | 4h |
| Calendar export / subscribe (ICS) for a team's events | Feature | 3h |
| Roster import from a `.csv` file picker in addition to paste, with a preview and per-row validation errors | Feature | 3h |
| Email change and account deletion from the profile screen | Feature | 2h |

## 4. Testing (≈8h)

Current coverage is 90 Jest tests across 4 suites, all on pure utilities (formatting, validation, event helpers, throttling).

| Item | Type | Est. |
|------|------|------|
| Component tests with React Native Testing Library for login/signup, onboarding role selection, and the lineup builder | Tests | 4h |
| End-to-end smoke test with Maestro: sign up → create team → create event → RSVP → publish lineup | Tests | 4h |

## 5. Platform and release (≈6h)

| Item | Type | Est. |
|------|------|------|
| Adopt Continuous Native Generation: move native config into `app.json` / config plugins and stop committing `ios/` (it currently differs from what `expo prebuild` generates for SDK 54) | Refactor | 2h |
| Verify and fix the Android build on an emulator | Bug fix | 2h |
| EAS Build profiles (development / preview / production) and a TestFlight preview build | Release | 2h |

## Docs

- Add an architecture section to the README (navigation groups, auth flow, data access, offline layer) once offline sync lands.
- Document the coach / player permission model alongside the RLS policies.
