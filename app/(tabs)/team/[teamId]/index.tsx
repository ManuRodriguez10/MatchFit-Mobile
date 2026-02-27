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
}

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
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
    if (!teamId) return;
    setError(null);
    try {
      const [teamRes, playersRes, eventsCountRes, eventsRes, lineupsCountRes, lineupsRes] = await Promise.all([
        supabase.from('teams').select('id, name').eq('id', teamId).single(),
        supabase.from('team_players').select('id', { count: 'exact', head: true }).eq('team_id', teamId),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('team_id', teamId).gte('date', today),
        supabase.from('events').select('id, event_type, title, opponent, location, date, kickoff_time').eq('team_id', teamId).gte('date', today).order('date', { ascending: true }).limit(3),
        supabase.from('lineups').select('id', { count: 'exact', head: true }).eq('team_id', teamId).eq('status', 'published'),
        supabase.from('lineups').select('id, title, formation, status').eq('team_id', teamId).order('updated_at', { ascending: false }).limit(2),
      ]);

      if (teamRes.error) throw teamRes.error;

      setTeam(teamRes.data);
      setPlayerCount(playersRes.count ?? 0);
      setEventCount(eventsCountRes.count ?? 0);
      setUpcomingEvents(eventsRes.data ?? []);
      setPublishedLineupCount(lineupsCountRes.count ?? 0);
      setRecentLineups(lineupsRes.data ?? []);
    } catch {
      setError('Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teamId, today]);

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

        {/* Stat cards */}
        <View style={styles.statRow}>
          <StatCard icon="people-outline" value={playerCount} label="Team Players" gradient={Gradients.statBlue} />
          <StatCard icon="calendar-outline" value={eventCount} label="Upcoming" gradient={Gradients.statEmerald} />
          <StatCard icon="clipboard-outline" value={publishedLineupCount} label="Lineups" gradient={Gradients.statPurple} />
        </View>

        {/* Upcoming Events */}
        <Card padded={false} style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.panelHeaderLeft}>
              <View style={[styles.panelIconWrap, { backgroundColor: Colors.primary }]}>
                <Ionicons name="calendar-outline" size={16} color="#fff" />
              </View>
              <View>
                <Text style={styles.panelTitle}>Upcoming Events</Text>
                <Text style={styles.panelSubtitle}>Your schedule at a glance</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push(`/team/${team.id}/events`)} activeOpacity={0.8}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>

          {upcomingEvents.length === 0 ? (
            <Card muted style={styles.emptyCard}>
              <Text style={styles.emptyText}>No upcoming events yet.</Text>
            </Card>
          ) : (
            upcomingEvents.map(event => {
              const config = eventTypeConfig[event.event_type] || eventTypeConfig.practice;
              const displayTitle = event.title
                || (event.event_type === 'game' && event.opponent ? `vs ${event.opponent}` : null)
                || config.label;

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
                      <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                      <Text style={styles.metaText}>
                        {formatDate(event.date)}
                        {event.kickoff_time ? ` at ${event.kickoff_time}` : ''}
                      </Text>
                    </View>
                    {event.location ? (
                      <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                        <Text style={styles.metaText}>{event.location}</Text>
                      </View>
                    ) : null}
                  </Card>
                </TouchableOpacity>
              );
            })
          )}
        </Card>

        {/* Recent Lineups */}
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
                onPress={() => {
                  if (isCoach) {
                    router.push({ pathname: '/team/lineup-builder', params: { teamId, lineupId: lineup.id } });
                  }
                }}
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
