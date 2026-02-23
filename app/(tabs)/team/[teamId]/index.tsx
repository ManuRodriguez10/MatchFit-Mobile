import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import Card from '@/components/ui/Card';

interface TeamSummary {
  id: string;
  name: string;
}

interface EventSummary {
  id: string;
  event_type: string;
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

export default function TeamDashboardScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<TeamSummary | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [publishedLineupCount, setPublishedLineupCount] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<EventSummary[]>([]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const firstName = profile?.first_name ?? profile?.full_name?.split(' ')[0] ?? 'Coach';
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    []
  );

  useEffect(() => {
    if (!teamId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [teamRes, playersRes, eventsCountRes, eventsRes] = await Promise.all([
          supabase.from('teams').select('id, name').eq('id', teamId).single(),
          supabase.from('team_players').select('id', { count: 'exact', head: true }).eq('team_id', teamId),
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('team_id', teamId)
            .gte('date', today),
          supabase
            .from('events')
            .select('id, event_type, opponent, location, date, kickoff_time')
            .eq('team_id', teamId)
            .gte('date', today)
            .order('date', { ascending: true })
            .limit(3),
        ]);

        if (teamRes.error) throw teamRes.error;

        setTeam(teamRes.data);
        setPlayerCount(playersRes.count ?? 0);
        setEventCount(eventsCountRes.count ?? 0);
        setUpcomingEvents(eventsRes.data ?? []);
        setPublishedLineupCount(0);
      } catch {
        setError('Failed to load dashboard. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [teamId, today]);

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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>Go Back</Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {team.name}
        </Text>
        <View style={styles.headerButtonGhost} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.helloText}>Good morning</Text>
            <Text style={styles.nameText}>{firstName}</Text>
          </View>
          <View style={styles.dateChip}>
            <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
            <Text style={styles.dateChipText}>{todayLabel}</Text>
          </View>
        </View>

        <View style={styles.metricStrip}>
          <LinearGradient colors={['#1B85E5', '#1366C8']} style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Ionicons name="people-outline" size={16} color="#fff" />
            </View>
            <Text style={styles.metricValue}>{playerCount}</Text>
            <Text style={styles.metricTitle}>Team Players</Text>
            <Text style={styles.metricSubtitle}>Active roster</Text>
          </LinearGradient>

          <LinearGradient colors={['#1AB58C', '#0D9E88']} style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Ionicons name="calendar-outline" size={16} color="#fff" />
            </View>
            <Text style={styles.metricValue}>{eventCount}</Text>
            <Text style={styles.metricTitle}>Upcoming Events</Text>
            <Text style={styles.metricSubtitle}>Scheduled ahead</Text>
          </LinearGradient>

          <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Ionicons name="clipboard-outline" size={16} color="#fff" />
            </View>
            <Text style={styles.metricValue}>{publishedLineupCount}</Text>
            <Text style={styles.metricTitle}>Published Lineups</Text>
            <Text style={styles.metricSubtitle}>Ready for games</Text>
          </LinearGradient>
        </View>

        <View style={styles.panelRow}>
          <Card padded={false} style={styles.panelLarge}>
            <View style={styles.panelHeader}>
              <View style={styles.panelHeaderLeft}>
                <View style={[styles.panelIconWrap, styles.panelIconBlue]}>
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
              <Card muted style={styles.emptyPanelState}>
                <Text style={styles.emptyPanelText}>No upcoming events yet.</Text>
              </Card>
            ) : (
              upcomingEvents.map((event) => (
                <Card key={event.id} muted style={styles.eventCard}>
                  <Text style={styles.eventTitle}>
                    {event.event_type === 'game' && event.opponent
                      ? `Game vs ${event.opponent}`
                      : event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                  </Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={12} color="#64748B" />
                    <Text style={styles.metaText}>
                      {formatDate(event.date)}
                      {event.kickoff_time ? `, ${event.kickoff_time}` : ''}
                    </Text>
                  </View>
                  {event.location ? (
                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={12} color="#64748B" />
                      <Text style={styles.metaText}>{event.location}</Text>
                    </View>
                  ) : null}
                </Card>
              ))
            )}
          </Card>

          <Card padded={false} style={styles.panelSmall}>
            <View style={styles.panelHeaderLeft}>
              <View style={[styles.panelIconWrap, styles.panelIconGreen]}>
                <Ionicons name="clipboard-outline" size={16} color="#fff" />
              </View>
              <View>
                <Text style={styles.panelTitle}>Recent Lineups</Text>
                <Text style={styles.panelSubtitle}>Latest configurations</Text>
              </View>
            </View>

            <Card muted style={styles.emptyPanelState}>
              <Text style={styles.emptyPanelText}>No published lineups yet.</Text>
            </Card>

            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => router.push(`/team/${team.id}/lineups`)}
              activeOpacity={0.85}
            >
              <Text style={styles.manageButtonText}>Manage Lineups</Text>
              <Ionicons name="arrow-forward" size={14} color="#334155" />
            </TouchableOpacity>
          </Card>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  decorCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -80,
    right: -60,
  },
  decorCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: 120,
    left: -40,
  },
  header: {
    paddingTop: 62,
    paddingHorizontal: 20,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  headerButtonGhost: {
    width: 42,
    height: 42,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 30,
    gap: 16,
  },
  heroRow: {
    marginTop: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 16,
  },
  helloText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: UI.typography.medium,
  },
  nameText: {
    color: '#fff',
    fontSize: 34,
    lineHeight: 35,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: UI.radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  dateChipText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: UI.typography.medium,
  },
  metricStrip: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: UI.radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    minHeight: 138,
  },
  metricIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 29,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
    marginTop: 6,
  },
  metricTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
    marginTop: 2,
  },
  metricSubtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: UI.typography.medium,
    marginTop: 1,
  },
  panelRow: {
    gap: 14,
  },
  panelLarge: {
    padding: UI.spacing.md,
    gap: 12,
    borderRadius: 24,
  },
  panelSmall: {
    padding: UI.spacing.md,
    gap: 12,
    borderRadius: 24,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  panelIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelIconBlue: {
    backgroundColor: '#1D4ED8',
  },
  panelIconGreen: {
    backgroundColor: '#10B981',
  },
  panelTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
  },
  panelSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: UI.typography.medium,
  },
  viewAllText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
  },
  eventCard: {
    borderRadius: UI.radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 6,
    shadowOpacity: 0,
    elevation: 0,
  },
  eventTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: UI.typography.medium,
  },
  manageButton: {
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  manageButtonText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
  },
  emptyPanelState: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    shadowOpacity: 0,
    elevation: 0,
  },
  emptyPanelText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: UI.typography.medium,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  stateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: UI.typography.medium,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
  },
});
