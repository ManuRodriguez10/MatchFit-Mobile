import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import GradientText from '@/components/ui/GradientText';

interface EventDetail {
  id: string;
  event_type: 'game' | 'practice' | 'tournament' | 'meeting';
  title: string | null;
  opponent: string | null;
  venue: string | null;
  location: string | null;
  date: string;
  kickoff_time: string | null;
  notes: string | null;
  recurrence_group_id: string | null;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  game: '#EF4444',
  practice: '#118FF3',
  tournament: '#F59E0B',
  meeting: '#8B5CF6',
};

function formatDisplayDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(kickoff: string): string {
  const d = new Date(kickoff);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function EventDetailScreen() {
  const { teamId, eventId } = useLocalSearchParams<{ teamId: string; eventId: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, event_type, title, opponent, venue, location, date, kickoff_time, notes, recurrence_group_id')
        .eq('id', eventId)
        .single();
      if (!error && data) setEvent(data as EventDetail);
      setLoading(false);
    })();
  }, [eventId]);

  if (loading) {
    return (
      <LinearGradient colors={Gradients.primary as unknown as string[]} style={styles.gradient}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </LinearGradient>
    );
  }

  if (!event) {
    return (
      <LinearGradient colors={Gradients.primary as unknown as string[]} style={styles.gradient}>
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={32} color="rgba(255,255,255,0.7)" />
          <Text style={styles.stateText}>Event not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const color = EVENT_TYPE_COLORS[event.event_type] ?? '#118FF3';

  return (
    <LinearGradient
      colors={Gradients.primary as unknown as string[]}
      style={styles.gradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
    >
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <GradientText
              text={
                event.title?.trim()
                || (event.event_type === 'game' && event.opponent
                  ? `vs ${event.opponent}`
                  : event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1))
              }
              style={styles.headerTitle}
              colors={['#FFFFFF', '#D4EBFC']}
            />
            <View style={[styles.typeBadge, { backgroundColor: color + '30' }]}>
              <Text style={[styles.typeBadgeText, { color }]}>
                {event.event_type}
              </Text>
            </View>
          </View>
        </View>

        {/* Detail Card */}
        <Card style={styles.detailCard}>
          {/* Date */}
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.detailText}>{formatDisplayDate(event.date)}</Text>
          </View>

          {/* Time */}
          {event.kickoff_time && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={18} color={Colors.primary} />
              <Text style={styles.detailText}>{formatTime(event.kickoff_time)}</Text>
            </View>
          )}

          {/* Location */}
          {event.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={18} color={Colors.primary} />
              <Text style={styles.detailText}>{event.location}</Text>
            </View>
          )}

          {/* Venue (home/away) */}
          {event.event_type === 'game' && event.venue && (
            <View style={styles.detailRow}>
              <Ionicons
                name={event.venue === 'home' ? 'home-outline' : 'car-outline'}
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.detailText}>
                {event.venue.charAt(0).toUpperCase() + event.venue.slice(1)}
              </Text>
            </View>
          )}

          {/* Opponent */}
          {event.event_type === 'game' && event.opponent && (
            <View style={styles.detailRow}>
              <Ionicons name="shirt-outline" size={18} color={Colors.primary} />
              <Text style={styles.detailText}>{event.opponent}</Text>
            </View>
          )}

          {/* Notes */}
          {event.notes && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                <Text style={styles.detailText}>{event.notes}</Text>
              </View>
            </>
          )}

          {/* Recurring indicator */}
          {event.recurrence_group_id && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Ionicons name="repeat-outline" size={18} color={Colors.primary} />
                <Text style={styles.detailTextMuted}>Part of a recurring series</Text>
              </View>
            </>
          )}
        </Card>

        {/* Edit button */}
        <View style={styles.editBtnWrap}>
          <Button
            title="Edit Event"
            onPress={() =>
              router.push({
                pathname: '/team/edit-event',
                params: {
                  teamId,
                  eventId: event.id,
                  ...(event.recurrence_group_id
                    ? { recurrenceGroupId: event.recurrence_group_id }
                    : {}),
                },
              })
            }
          />
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
    paddingTop: 72,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stateText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: UI.typography.medium,
  },
  linkText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: UI.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
    textTransform: 'capitalize',
  },

  // Detail card
  detailCard: {
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: UI.typography.medium,
    flex: 1,
    lineHeight: 22,
  },
  detailTextMuted: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: UI.typography.medium,
    flex: 1,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderSoft,
  },

  editBtnWrap: {
    marginTop: 8,
  },
});
