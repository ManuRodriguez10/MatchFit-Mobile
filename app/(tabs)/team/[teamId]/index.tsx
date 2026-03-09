import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useGlobalSearchParams, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import StatCard from '@/components/ui/StatCard';
import GradientText from '@/components/ui/GradientText';

interface TeamSummary {
  id: string;
  name: string;
}

interface EventSummary {
  id: string;
  event_type: string;
  title: string | null;
  opponent: string | null;
  location: string | null;
  date: string;
  kickoff_time: string | null;
  rsvpResponded?: number;
  totalPlayers?: number;
  myRsvpStatus?: 'going' | 'not_going' | null;
}

interface MyLineup {
  id: string;
  title: string;
  formation: string;
  position_key: string;
  is_starter: boolean;
  event_date: string | null;
}

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatKickoffTime(kickoffTime: string | null) {
  if (!kickoffTime) return 'TBD';
  const parsed = new Date(kickoffTime);
  if (Number.isNaN(parsed.getTime())) return kickoffTime;
  return parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const eventTypeConfig: Record<string, { tone: 'red' | 'blue' | 'cream' | 'lavender'; label: string }> = {
  game: { tone: 'red', label: 'Game' },
  practice: { tone: 'blue', label: 'Practice' },
  tournament: { tone: 'cream', label: 'Tournament' },
  meeting: { tone: 'lavender', label: 'Meeting' },
};

export default function TeamDashboardScreen() {
  const { teamId } = useGlobalSearchParams<{ teamId: string }>();
  const { profile } = useAuth();
  const isCoach = profile?.role === 'coach';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [publishedLineupCount, setPublishedLineupCount] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<EventSummary[]>([]);
  const [recentLineups, setRecentLineups] = useState<{ id: string; title: string; formation: string; status: string }[]>([]);
  const [myLineups, setMyLineups] = useState<MyLineup[]>([]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const firstName = profile?.first_name ?? profile?.full_name?.split(' ')[0] ?? (isCoach ? 'Coach' : 'Player');
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  const load = useCallback(async () => {
    if (!teamId) { setLoading(false); return; }
    setError(null);
    try {
      const baseQueries = [
        supabase.from('teams').select('id, name').eq('id', teamId).single(),
        supabase.from('team_players').select('id', { count: 'exact', head: true }).eq('team_id', teamId),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('team_id', teamId).gte('date', today),
        supabase.from('events').select('id, event_type, title, opponent, location, date, kickoff_time').eq('team_id', teamId).eq('date', today).order('kickoff_time', { ascending: true }),
        supabase.from('lineups').select('id', { count: 'exact', head: true }).eq('team_id', teamId).eq('status', 'published'),
        supabase.from('lineups').select('id, title, formation, status').eq('team_id', teamId).order('updated_at', { ascending: false }).limit(2),
      ] as const;

      const playerLineupQuery = !isCoach && profile?.id
        ? supabase
            .from('lineup_players')
            .select('id, position_key, is_starter, lineups!inner(id, title, formation, status, event_id, events!inner(date))')
            .eq('player_id', profile.id)
            .eq('lineups.team_id', teamId)
            .eq('lineups.status', 'published')
            .gte('lineups.events.date', today)
        : null;

      const [teamRes, playersRes, eventsCountRes, eventsRes, lineupsCountRes, lineupsRes, myLineupsRes] = await Promise.all([
        ...baseQueries,
        playerLineupQuery ?? Promise.resolve(null),
      ]);

      if (teamRes.error) throw teamRes.error;

      const totalPlayersCount = playersRes.count ?? 0;
      setTeam(teamRes.data);
      setPlayerCount(totalPlayersCount);
      setEventCount(eventsCountRes.count ?? 0);
      setPublishedLineupCount(lineupsCountRes.count ?? 0);
      setRecentLineups(lineupsRes.data ?? []);

      // Fetch RSVP counts for today's games and meetings
      const todayEvents = (eventsRes.data ?? []) as EventSummary[];
      const rsvpEventIds = todayEvents
        .filter(e => e.event_type !== 'practice')
        .map(e => e.id);

      if (rsvpEventIds.length > 0) {
        const { data: rsvpData } = await supabase
          .from('rsvps')
          .select('event_id, player_id, status')
          .in('event_id', rsvpEventIds);

        if (rsvpData) {
          const countMap: Record<string, number> = {};
          const playerRsvpMap: Record<string, string> = {};
          for (const r of rsvpData as any[]) {
            countMap[r.event_id] = (countMap[r.event_id] ?? 0) + 1;
            if (profile?.id && r.player_id === profile.id) {
              playerRsvpMap[r.event_id] = r.status;
            }
          }
          for (const ev of todayEvents) {
            if (ev.event_type !== 'practice') {
              ev.rsvpResponded = countMap[ev.id] ?? 0;
              ev.totalPlayers = totalPlayersCount;
              ev.myRsvpStatus = (playerRsvpMap[ev.id] as 'going' | 'not_going') ?? null;
            }
          }
        }
      }

      setUpcomingEvents(todayEvents);

      if (myLineupsRes && 'data' in myLineupsRes && myLineupsRes.data) {
        const mapped: MyLineup[] = myLineupsRes.data.map((row: any) => ({
          id: row.lineups.id,
          title: row.lineups.title,
          formation: row.lineups.formation,
          position_key: row.position_key,
          is_starter: row.is_starter,
          event_date: row.lineups.events?.date ?? null,
        }));
        setMyLineups(mapped);
      }
    } catch {
      setError('Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teamId, today, isCoach, profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <LinearGradient colors={Gradients.primary as unknown as string[]} style={styles.gradient}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.stateText}>Loading dashboard...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error || !team) {
    return (
      <LinearGradient colors={Gradients.primary as unknown as string[]} style={styles.gradient}>
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={44} color="rgba(255,255,255,0.8)" />
          <Text style={styles.stateText}>{error ?? 'Team not found.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={Gradients.primary as unknown as string[]}
      style={styles.gradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
    >
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <GradientText
          text={team.name}
          style={styles.headerTitle}
          colors={['#FFFFFF', '#D4EBFC']}
        />
        <View style={styles.headerButtonGhost} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" />
        }
      >
        {/* Hero greeting */}
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.helloText}>{`${getGreeting()}, `}</Text>
            <GradientText
              text={firstName}
              style={styles.nameText}
              colors={['#FFFFFF', '#D4EBFC']}
            />
          </View>
          <View style={styles.dateChip}>
            <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
            <Text style={styles.dateChipText}>{todayLabel}</Text>
          </View>
        </View>

        {/* Today's Events — center of attention */}
        <Card padded={false} style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.panelHeaderLeft}>
              <View style={[styles.panelIconWrap, { backgroundColor: Colors.primary }]}>
                <Ionicons name="calendar-outline" size={16} color="#fff" />
              </View>
              <View>
                <Text style={styles.panelTitle}>Today's Events</Text>
                <Text style={styles.panelSubtitle}>What's on today</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push(`/team/${team.id}/events`)} activeOpacity={0.8}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>

          {upcomingEvents.length === 0 ? (
            <Card muted style={styles.emptyCard}>
              <Text style={styles.emptyText}>No events scheduled for today.</Text>
            </Card>
          ) : (
            upcomingEvents.map(event => {
              const config = eventTypeConfig[event.event_type] || eventTypeConfig.practice;
              const displayTitle = event.title
                || (event.event_type === 'game' && event.opponent ? `vs ${event.opponent}` : null)
                || config.label;
              const isRsvpEvent = event.event_type !== 'practice' && event.totalPlayers != null;
              const needsPlayerRsvp = !isCoach && isRsvpEvent && !event.myRsvpStatus;
              const playerSaidYes = !isCoach && event.myRsvpStatus === 'going';
              const playerSaidNo = !isCoach && event.myRsvpStatus === 'not_going';

              return (
                <TouchableOpacity
                  key={event.id}
                  onPress={() => router.push({ pathname: '/team/event-detail', params: { teamId, eventId: event.id } })}
                  activeOpacity={0.7}
                >
                  <Card muted style={styles.eventCard}>
                    <View style={styles.eventTop}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{displayTitle}</Text>
                      <Chip label={config.label} tone={config.tone} />
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                      <Text style={styles.metaText}>Time: {formatKickoffTime(event.kickoff_time)}</Text>
                    </View>
                    {event.location ? (
                      <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                        <Text style={styles.metaText}>{event.location}</Text>
                      </View>
                    ) : null}
                    {isCoach && isRsvpEvent && (
                      <>
                        <View style={styles.metaRow}>
                          <Ionicons name="people-outline" size={12} color={Colors.textMuted} />
                          <Text style={styles.metaText}>
                            RSVP: {event.rsvpResponded ?? 0}/{event.totalPlayers} responded
                          </Text>
                        </View>
                        {((event.totalPlayers ?? 0) - (event.rsvpResponded ?? 0)) > 0 && (
                          <View style={styles.rsvpWarningRow}>
                            <Ionicons name="alert-circle" size={14} color="#F59E0B" />
                            <Text style={styles.rsvpWarningText}>
                              {(event.totalPlayers ?? 0) - (event.rsvpResponded ?? 0)} player{((event.totalPlayers ?? 0) - (event.rsvpResponded ?? 0)) === 1 ? '' : 's'} still missing RSVP
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                    {playerSaidYes && (
                      <View style={styles.rsvpYesRow}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.rsvpYesText}>RSVP: Yes</Text>
                      </View>
                    )}
                    {playerSaidNo && (
                      <View style={styles.rsvpNoRow}>
                        <Ionicons name="close-circle" size={14} color="#EF4444" />
                        <Text style={styles.rsvpNoText}>RSVP: No</Text>
                      </View>
                    )}
                    {needsPlayerRsvp && (
                      <View style={styles.rsvpWarningRow}>
                        <Ionicons name="alert-circle" size={14} color="#F59E0B" />
                        <Text style={styles.rsvpWarningText}>You still need to RSVP</Text>
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
        </Card>

        {/* Stat cards */}
        <View style={styles.statRow}>
          {isCoach ? (
            <>
              <StatCard icon="people-outline" value={playerCount} label="Team Players" gradient={Gradients.statBlue} />
              <StatCard icon="calendar-outline" value={eventCount} label="Upcoming" gradient={Gradients.statEmerald} />
              <StatCard icon="clipboard-outline" value={publishedLineupCount} label="Lineups" gradient={Gradients.statPurple} />
            </>
          ) : (
            <>
              <StatCard icon="calendar-outline" value={eventCount} label="Upcoming" gradient={Gradients.statEmerald} />
              <StatCard icon="clipboard-outline" value={myLineups.length} label="My Lineups" gradient={Gradients.statPurple} />
              <StatCard icon="people-outline" value={playerCount} label="Teammates" gradient={Gradients.statBlue} />
            </>
          )}
        </View>

        {/* Quick Actions (coach only) */}
        {isCoach && (
          <View>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickActionBtn}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/team/create-event', params: { teamId } })}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: Colors.emeraldSoft }]}>
                  <Ionicons name="add-circle-outline" size={18} color={Colors.emerald} />
                </View>
                <Text style={styles.quickActionLabel}>Create Event</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtn}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/team/select-game', params: { teamId } })}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: Colors.purpleSoft }]}>
                  <Ionicons name="clipboard-outline" size={18} color={Colors.purple} />
                </View>
                <Text style={styles.quickActionLabel}>Build Lineup</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtn}
                activeOpacity={0.8}
                onPress={() => router.push(`/team/${team.id}/roster`)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: Colors.blueSoft }]}>
                  <Ionicons name="people-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.quickActionLabel}>Roster</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionBtn}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/team/invite-players', params: { teamId } })}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: Colors.amberSoft }]}>
                  <Ionicons name="share-outline" size={18} color={Colors.amber} />
                </View>
                <Text style={styles.quickActionLabel}>Invite</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* My Lineup Status (player only) */}
        {!isCoach && (
          <Card padded={false} style={styles.panel}>
            <View style={styles.panelHeader}>
              <View style={styles.panelHeaderLeft}>
                <View style={[styles.panelIconWrap, { backgroundColor: Colors.emerald }]}>
                  <Ionicons name="football-outline" size={16} color="#fff" />
                </View>
                <View>
                  <Text style={styles.panelTitle}>My Lineup Status</Text>
                  <Text style={styles.panelSubtitle}>Upcoming selections</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push(`/team/${team.id}/lineups`)} activeOpacity={0.8}>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            </View>

            {myLineups.length === 0 ? (
              <Card muted style={styles.emptyCard}>
                <Text style={styles.emptyText}>You haven't been selected in any upcoming lineups yet.</Text>
              </Card>
            ) : (
              myLineups.map(lineup => (
                <TouchableOpacity
                  key={lineup.id}
                  onPress={() => router.push(`/team/${team.id}/lineups`)}
                  activeOpacity={0.7}
                >
                  <Card muted style={styles.eventCard}>
                    <View style={styles.eventTop}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{lineup.title}</Text>
                      <Chip label="Published" tone="mint" />
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="shirt-outline" size={12} color={Colors.textMuted} />
                      <Text style={styles.metaText}>Position: {lineup.position_key}</Text>
                      <Chip
                        label={lineup.is_starter ? 'Starter' : 'Sub'}
                        tone={lineup.is_starter ? 'emerald' : 'lavender'}
                        style={styles.starterChip}
                      />
                    </View>
                    {lineup.event_date && (
                      <View style={styles.metaRow}>
                        <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                        <Text style={styles.metaText}>Match: {formatDate(lineup.event_date)}</Text>
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              ))
            )}

            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => router.push(`/team/${team.id}/lineups`)}
              activeOpacity={0.85}
            >
              <Text style={styles.manageButtonText}>View Lineups</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.textPrimary} />
            </TouchableOpacity>
          </Card>
        )}

        {/* Recent Lineups (coach only) */}
        {isCoach && (
          <Card padded={false} style={styles.panel}>
            <View style={styles.panelHeaderLeft}>
              <View style={[styles.panelIconWrap, { backgroundColor: Colors.emerald }]}>
                <Ionicons name="clipboard-outline" size={16} color="#fff" />
              </View>
              <View>
                <Text style={styles.panelTitle}>Recent Lineups</Text>
                <Text style={styles.panelSubtitle}>Latest configurations</Text>
              </View>
            </View>

            {recentLineups.length === 0 ? (
              <Card muted style={styles.emptyCard}>
                <Text style={styles.emptyText}>No published lineups yet.</Text>
              </Card>
            ) : (
              recentLineups.map(lineup => (
                <TouchableOpacity
                  key={lineup.id}
                  onPress={() => router.push({ pathname: '/team/lineup-builder', params: { teamId, lineupId: lineup.id } })}
                  activeOpacity={0.7}
                >
                  <Card muted style={styles.eventCard}>
                    <View style={styles.eventTop}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{lineup.title}</Text>
                      <Chip
                        label={lineup.status === 'published' ? 'Published' : 'Draft'}
                        tone={lineup.status === 'published' ? 'mint' : 'lavender'}
                      />
                    </View>
                    <Text style={styles.metaText}>Formation: {lineup.formation}</Text>
                  </Card>
                </TouchableOpacity>
              ))
            )}

            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => router.push(`/team/${team.id}/lineups`)}
              activeOpacity={0.85}
            >
              <Text style={styles.manageButtonText}>Manage Lineups</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.textPrimary} />
            </TouchableOpacity>
          </Card>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  decorCircle1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.05)', top: -80, right: -60,
  },
  decorCircle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: 120, left: -40,
  },
  header: {
    paddingTop: 62, paddingHorizontal: 20, paddingBottom: 6,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerButton: {
    width: 42, height: 42, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  headerButtonGhost: { width: 42, height: 42 },
  headerTitle: {
    color: '#fff', fontSize: 20, fontFamily: UI.typography.bold,
    flex: 1, textAlign: 'center', paddingHorizontal: 10,
  },
  content: {
    paddingHorizontal: 20, paddingTop: 30, paddingBottom: 120, gap: 16,
  },
  heroRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', gap: 12, marginBottom: 8,
  },
  helloText: {
    color: 'rgba(255,255,255,0.92)', fontSize: 15, fontFamily: UI.typography.medium,
  },
  nameText: {
    color: '#fff', fontSize: 34, lineHeight: 36, fontFamily: UI.typography.bold,
  },
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: UI.radius.lg,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  dateChipText: {
    color: Colors.textPrimary, fontSize: 13, fontFamily: UI.typography.semibold,
  },
  statRow: {
    flexDirection: 'row', gap: 10,
  },
  quickActionsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: UI.typography.bold,
    marginBottom: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    color: '#fff',
    fontSize: 11,
    fontFamily: UI.typography.bold,
    textAlign: 'center',
  },
  panel: {
    padding: UI.spacing.md, gap: 12, borderRadius: 24,
  },
  panelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  panelHeaderLeft: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, paddingRight: 8,
  },
  panelIconWrap: {
    width: 40, height: 40, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  panelTitle: {
    color: Colors.textPrimary, fontSize: 20, fontFamily: UI.typography.bold,
  },
  panelSubtitle: {
    color: Colors.textSecondary, fontSize: 13, fontFamily: UI.typography.medium,
  },
  viewAllText: {
    color: Colors.primary, fontSize: 13, fontFamily: UI.typography.bold,
  },
  eventCard: {
    borderRadius: UI.radius.lg, paddingHorizontal: 12, paddingVertical: 11,
    gap: 5, shadowOpacity: 0, elevation: 0,
  },
  eventTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  eventTitle: {
    color: Colors.textPrimary, fontSize: 15, fontFamily: UI.typography.bold, flex: 1,
  },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  metaText: {
    color: Colors.textSecondary, fontSize: 13, fontFamily: UI.typography.medium,
  },
  rsvpYesRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#D1FAE5', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5, marginTop: 2,
  },
  rsvpYesText: {
    color: '#065F46', fontSize: 12, fontFamily: UI.typography.bold,
  },
  rsvpNoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FEE2E2', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5, marginTop: 2,
  },
  rsvpNoText: {
    color: '#991B1B', fontSize: 12, fontFamily: UI.typography.bold,
  },
  rsvpWarningRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FEF3C7', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5, marginTop: 2,
  },
  rsvpWarningText: {
    color: '#92400E', fontSize: 12, fontFamily: UI.typography.bold,
  },
  starterChip: {
    marginLeft: 'auto',
  },
  manageButton: {
    borderRadius: UI.radius.lg, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted, paddingHorizontal: 12, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  manageButtonText: {
    color: Colors.textPrimary, fontSize: 15, fontFamily: UI.typography.bold,
  },
  emptyCard: {
    paddingVertical: 18, alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, shadowOpacity: 0, elevation: 0,
  },
  emptyText: {
    color: Colors.textSecondary, fontSize: 14, fontFamily: UI.typography.medium,
  },
  centerState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24,
  },
  stateText: {
    color: '#fff', fontSize: 16, fontFamily: UI.typography.medium, textAlign: 'center',
  },
  retryButton: {
    marginTop: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  retryButtonText: {
    color: '#fff', fontSize: 14, fontFamily: UI.typography.bold,
  },
});
