import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import { RsvpStatus } from '@/types/database';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import GradientText from '@/components/ui/GradientText';
import { showToast } from '@/components/ui/Toast';

interface EventDetail {
  id: string;
  team_id: string;
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

interface RsvpRecord {
  id: string;
  player_id: string;
  status: RsvpStatus;
  playerName: string;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  game: '#EF4444',
  practice: '#118FF3',
  tournament: '#F59E0B',
  meeting: '#8B5CF6',
};

const RSVP_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  going: { label: 'Going', icon: 'checkmark-circle', color: '#10B981', bg: '#D1FAE5' },
  not_going: { label: 'Not Going', icon: 'close-circle', color: '#EF4444', bg: '#FEE2E2' },
  maybe: { label: 'Maybe', icon: 'help-circle', color: '#F59E0B', bg: '#FEF3C7' },
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
  const { user, profile } = useAuth();
  const isCoach = profile?.role === 'coach';

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rsvps, setRsvps] = useState<RsvpRecord[]>([]);
  const [myRsvp, setMyRsvp] = useState<RsvpStatus | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [totalPlayers, setTotalPlayers] = useState(0);

  const fetchData = useCallback(async () => {
    if (!eventId) { setLoading(false); return; }

    try {
      // Fetch event
      const { data: eventData } = await supabase
        .from('events')
        .select('id, team_id, event_type, title, opponent, venue, location, date, kickoff_time, notes, recurrence_group_id')
        .eq('id', eventId)
        .single();

      if (eventData) {
        setEvent(eventData as EventDetail);

        // Fetch total players on the team
        const { count } = await supabase
          .from('team_players')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', eventData.team_id);
        setTotalPlayers(count || 0);

        // Fetch RSVPs with player names
        const { data: rsvpData } = await supabase
          .from('rsvps')
          .select('id, player_id, status, profiles:player_id(full_name)')
          .eq('event_id', eventId);

        const mapped: RsvpRecord[] = (rsvpData || []).map((r: any) => ({
          id: r.id,
          player_id: r.player_id,
          status: r.status,
          playerName: r.profiles?.full_name || 'Unknown',
        }));
        setRsvps(mapped);

        // Find my RSVP
        if (user) {
          const mine = mapped.find(r => r.player_id === user.id);
          setMyRsvp(mine?.status || null);
        }
      }
    } catch {
      showToast('error', 'Failed to load event details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time RSVP subscription
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`rsvps-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rsvps',
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchData]);

  const handleRsvp = async (status: RsvpStatus) => {
    if (!user || !eventId) return;

    // Toggle off if tapping same status
    if (myRsvp === status) {
      setRsvpLoading(true);
      try {
        await supabase
          .from('rsvps')
          .delete()
          .eq('event_id', eventId)
          .eq('player_id', user.id);
        setMyRsvp(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        showToast('error', 'Failed to update RSVP');
      } finally {
        setRsvpLoading(false);
      }
      return;
    }

    setRsvpLoading(true);
    try {
      const { error } = await supabase
        .from('rsvps')
        .upsert(
          {
            event_id: eventId,
            player_id: user.id,
            status,
          },
          { onConflict: 'event_id,player_id' }
        );

      if (error) throw error;

      setMyRsvp(status);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('success', `RSVP: ${RSVP_CONFIG[status].label}`);
    } catch {
      showToast('error', 'Failed to update RSVP');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setRsvpLoading(false);
    }
  };

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

  const goingCount = rsvps.filter(r => r.status === 'going').length;
  const notGoingCount = rsvps.filter(r => r.status === 'not_going').length;
  const maybeCount = rsvps.filter(r => r.status === 'maybe').length;
  const noResponseCount = totalPlayers - rsvps.length;

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#fff" />
        }
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
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.detailText}>{formatDisplayDate(event.date)}</Text>
          </View>

          {event.kickoff_time && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={18} color={Colors.primary} />
              <Text style={styles.detailText}>{formatTime(event.kickoff_time)}</Text>
            </View>
          )}

          {event.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={18} color={Colors.primary} />
              <Text style={styles.detailText}>{event.location}</Text>
            </View>
          )}

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

          {event.event_type === 'game' && event.opponent && (
            <View style={styles.detailRow}>
              <Ionicons name="shirt-outline" size={18} color={Colors.primary} />
              <Text style={styles.detailText}>{event.opponent}</Text>
            </View>
          )}

          {event.notes && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                <Text style={styles.detailText}>{event.notes}</Text>
              </View>
            </>
          )}

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

        {/* RSVP Section — Players */}
        {!isCoach && (
          <Card style={styles.rsvpCard}>
            <Text style={styles.rsvpTitle}>Your RSVP</Text>
            <View style={styles.rsvpBtnRow}>
              {(['going', 'not_going', 'maybe'] as RsvpStatus[]).map(status => {
                const cfg = RSVP_CONFIG[status];
                const isActive = myRsvp === status;
                return (
                  <TouchableOpacity
                    key={status}
                    onPress={() => handleRsvp(status)}
                    disabled={rsvpLoading}
                    activeOpacity={0.7}
                    style={[
                      styles.rsvpBtn,
                      { borderColor: isActive ? cfg.color : Colors.borderSoft },
                      isActive && { backgroundColor: cfg.bg },
                    ]}
                  >
                    <Ionicons
                      name={cfg.icon as any}
                      size={22}
                      color={isActive ? cfg.color : Colors.textMuted}
                    />
                    <Text style={[
                      styles.rsvpBtnText,
                      { color: isActive ? cfg.color : Colors.textSecondary },
                      isActive && { fontFamily: UI.typography.bold },
                    ]}>
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>
        )}

        {/* RSVP Summary — visible to everyone */}
        <Card style={styles.rsvpCard}>
          <Text style={styles.rsvpTitle}>Attendance</Text>
          <View style={styles.rsvpSummaryRow}>
            <View style={styles.rsvpStat}>
              <View style={[styles.rsvpStatDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.rsvpStatNum}>{goingCount}</Text>
              <Text style={styles.rsvpStatLabel}>Going</Text>
            </View>
            <View style={styles.rsvpStat}>
              <View style={[styles.rsvpStatDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.rsvpStatNum}>{maybeCount}</Text>
              <Text style={styles.rsvpStatLabel}>Maybe</Text>
            </View>
            <View style={styles.rsvpStat}>
              <View style={[styles.rsvpStatDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.rsvpStatNum}>{notGoingCount}</Text>
              <Text style={styles.rsvpStatLabel}>Can't Go</Text>
            </View>
            <View style={styles.rsvpStat}>
              <View style={[styles.rsvpStatDot, { backgroundColor: Colors.textMuted }]} />
              <Text style={styles.rsvpStatNum}>{noResponseCount < 0 ? 0 : noResponseCount}</Text>
              <Text style={styles.rsvpStatLabel}>Pending</Text>
            </View>
          </View>

          {/* RSVP list for coaches */}
          {isCoach && rsvps.length > 0 && (
            <>
              <View style={styles.divider} />
              {rsvps.map(r => {
                const cfg = RSVP_CONFIG[r.status] || RSVP_CONFIG.maybe;
                return (
                  <View key={r.id} style={styles.rsvpPlayerRow}>
                    <Text style={styles.rsvpPlayerName} numberOfLines={1}>{r.playerName}</Text>
                    <View style={[styles.rsvpPlayerBadge, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                      <Text style={[styles.rsvpPlayerBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </Card>

        {/* Edit button — coaches only */}
        {isCoach && (
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
  content: {
    paddingTop: 72, paddingHorizontal: 20, paddingBottom: 40, gap: 16,
  },
  centerState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  stateText: {
    color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '600', fontFamily: UI.typography.medium,
  },
  linkText: {
    color: '#fff', fontSize: 15, fontWeight: '700', textDecorationLine: 'underline',
  },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  headerTitle: {
    color: '#fff', fontSize: 26, fontWeight: '800', fontFamily: UI.typography.bold,
  },
  typeBadge: {
    alignSelf: 'flex-start', borderRadius: UI.radius.pill,
    paddingHorizontal: 12, paddingVertical: 4, marginTop: 6,
  },
  typeBadgeText: {
    fontSize: 12, fontWeight: '700', fontFamily: UI.typography.bold, textTransform: 'capitalize',
  },

  // Detail card
  detailCard: { borderRadius: 20, padding: 18, gap: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailText: {
    color: Colors.textPrimary, fontSize: 15, fontWeight: '600',
    fontFamily: UI.typography.medium, flex: 1, lineHeight: 22,
  },
  detailTextMuted: {
    color: Colors.textSecondary, fontSize: 14, fontWeight: '500',
    fontFamily: UI.typography.medium, flex: 1, fontStyle: 'italic',
  },
  divider: { height: 1, backgroundColor: Colors.borderSoft },

  // RSVP
  rsvpCard: { borderRadius: 20, padding: 18, gap: 14 },
  rsvpTitle: {
    fontSize: 17, fontFamily: UI.typography.bold, color: Colors.textPrimary,
  },
  rsvpBtnRow: {
    flexDirection: 'row', gap: 8,
  },
  rsvpBtn: {
    flex: 1, alignItems: 'center', gap: 4,
    paddingVertical: 14, borderRadius: UI.radius.lg,
    borderWidth: 2, backgroundColor: Colors.surfaceMuted,
  },
  rsvpBtnText: {
    fontSize: 12, fontFamily: UI.typography.medium,
  },
  rsvpSummaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
  },
  rsvpStat: { alignItems: 'center', gap: 4, flex: 1 },
  rsvpStatDot: { width: 10, height: 10, borderRadius: 5 },
  rsvpStatNum: {
    fontSize: 20, fontFamily: UI.typography.bold, color: Colors.textPrimary,
  },
  rsvpStatLabel: {
    fontSize: 11, fontFamily: UI.typography.medium, color: Colors.textMuted,
  },
  rsvpPlayerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rsvpPlayerName: {
    fontSize: 14, fontFamily: UI.typography.medium, color: Colors.textPrimary, flex: 1,
  },
  rsvpPlayerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: UI.radius.pill,
  },
  rsvpPlayerBadgeText: {
    fontSize: 11, fontFamily: UI.typography.bold,
  },

  editBtnWrap: { marginTop: 4 },
});
