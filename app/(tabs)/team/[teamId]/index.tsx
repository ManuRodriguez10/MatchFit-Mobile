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
            .limit(2),
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
          <View style={styles.panelLarge}>
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
              <View style={styles.emptyPanelState}>
                <Text style={styles.emptyPanelText}>No upcoming events yet.</Text>
              </View>
            ) : (
              upcomingEvents.map((event) => (
                <View key={event.id} style={styles.eventCard}>
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
                </View>
              ))
            )}
          </View>

          <View style={styles.panelSmall}>
            <View style={styles.panelHeaderLeft}>
              <View style={[styles.panelIconWrap, styles.panelIconGreen]}>
                <Ionicons name="clipboard-outline" size={16} color="#fff" />
              </View>
              <View>
                <Text style={styles.panelTitle}>Recent Lineups</Text>
                <Text style={styles.panelSubtitle}>Latest configurations</Text>
              </View>
            </View>

            <View style={styles.emptyPanelState}>
              <Text style={styles.emptyPanelText}>No published lineups yet.</Text>
            </View>

            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => router.push(`/team/${team.id}/lineups`)}
              activeOpacity={0.85}
            >
              <Text style={styles.manageButtonText}>Manage Lineups</Text>
              <Ionicons name="arrow-forward" size={14} color="#334155" />
            </TouchableOpacity>
          </View>
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
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  headerButtonGhost: {
    width: 38,
    height: 38,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 28,
    gap: 14,
  },
  heroRow: {
    marginTop: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helloText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 16,
    fontWeight: '500',
  },
  nameText: {
    color: '#fff',
    fontSize: 36,
    lineHeight: 38,
    fontWeight: '800',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dateChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  metricStrip: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '800',
    marginTop: 6,
  },
  metricTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  metricSubtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  panelRow: {
    gap: 12,
  },
  panelLarge: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  panelSmall: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  panelIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
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
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
  },
  panelSubtitle: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  viewAllText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  eventCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
  },
  eventTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
  manageButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  manageButtonText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyPanelState: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  emptyPanelText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
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
  },
});
