import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Gradients } from '@/constants/colors';

interface EventItem {
  id: string;
  event_type: 'game' | 'practice' | 'tournament' | 'meeting';
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

export default function TeamEventsScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!teamId) return;

    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('events')
          .select('id, event_type, opponent, location, date, kickoff_time')
          .eq('team_id', teamId)
          .gte('date', today)
          .order('date', { ascending: true });

        setEvents((data as EventItem[]) ?? []);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [teamId, today]);

  return (
    <LinearGradient
      colors={Gradients.primary as unknown as string[]}
      style={styles.gradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
    >
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Events</Text>
        <Text style={styles.subtitle}>Schedule and upcoming sessions</Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="calendar-outline" size={18} color="#fff" />
          </View>
          <View style={styles.summaryTextWrap}>
            <Text style={styles.summaryValue}>{events.length}</Text>
            <Text style={styles.summaryLabel}>Upcoming Events</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Upcoming</Text>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : events.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="calendar-clear-outline" size={22} color="#94A3B8" />
              <Text style={styles.emptyText}>No upcoming events yet.</Text>
            </View>
          ) : (
            events.map((event) => (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventTopRow}>
                  <Text style={styles.eventTitle}>
                    {event.event_type === 'game' && event.opponent
                      ? `Game vs ${event.opponent}`
                      : event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                  </Text>
                  <View style={styles.typePill}>
                    <Text style={styles.typePillText}>{event.event_type}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={12} color="#64748B" />
                  <Text style={styles.metaText}>
                    {formatDate(event.date)}{event.kickoff_time ? `, ${event.kickoff_time}` : ''}
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
  content: {
    paddingTop: 62,
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '500',
  },
  summaryCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(29,78,216,0.95)',
  },
  summaryTextWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '800',
  },
  summaryLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
  },
  loadingWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  eventCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eventTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  typePill: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  typePillText: {
    color: '#4338CA',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
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
});
