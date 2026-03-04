import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share,
} from 'react-native';
import { useLocalSearchParams, useGlobalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Lineup } from '@/types/database';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import { showToast } from '@/components/ui/Toast';
import GradientText from '@/components/ui/GradientText';

interface LineupWithCounts extends Lineup {
  starterCount: number;
  subCount: number;
  eventTitle: string | null;
  eventDate: string | null;
}

interface UpcomingGame {
  id: string;
  title: string | null;
  opponent: string | null;
  date: string;
  kickoff_time: string | null;
  hasLineup: boolean;
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

export default function TeamLineupsScreen() {
  const localParams = useLocalSearchParams<{ teamId?: string }>();
  const globalParams = useGlobalSearchParams<{ teamId?: string }>();
  const teamId = (globalParams.teamId ?? localParams.teamId ?? '').toString();
  const router = useRouter();
  const { profile } = useAuth();
  const isCoach = profile?.role === 'coach';

  const [lineups, setLineups] = useState<LineupWithCounts[]>([]);
  const [upcomingGames, setUpcomingGames] = useState<UpcomingGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!teamId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const today = new Date().toISOString().slice(0, 10);

      // Fetch lineups with event info
      let lineupQuery = supabase
        .from('lineups')
        .select('*, events:event_id(title, opponent, date, event_type)')
        .eq('team_id', teamId);

      if (!isCoach) {
        lineupQuery = lineupQuery.eq('status', 'published');
      }

      const { data: lineupData, error: lineupError } = await lineupQuery
        .order('updated_at', { ascending: false });

      if (lineupError) throw lineupError;

      // Get player counts for each lineup
      const lineupsWithCounts: LineupWithCounts[] = await Promise.all(
        (lineupData || []).map(async (lineup: any) => {
          const { count: starterCount } = await supabase
            .from('lineup_players')
            .select('*', { count: 'exact', head: true })
            .eq('lineup_id', lineup.id)
            .eq('is_starter', true);

          const { count: subCount } = await supabase
            .from('lineup_players')
            .select('*', { count: 'exact', head: true })
            .eq('lineup_id', lineup.id)
            .eq('is_starter', false);

          const event = lineup.events;
          let eventTitle: string | null = null;
          if (event) {
            eventTitle = event.title || (event.opponent ? `vs ${event.opponent}` : event.event_type);
          }

          return {
            ...lineup,
            starterCount: starterCount || 0,
            subCount: subCount || 0,
            eventTitle,
            eventDate: event?.date || null,
          };
        }),
      );

      setLineups(lineupsWithCounts);

      // Fetch upcoming games that don't have lineups yet
      const { data: gamesData } = await supabase
        .from('events')
        .select('id, title, opponent, date, kickoff_time')
        .eq('team_id', teamId)
        .eq('event_type', 'game')
        .gte('date', today)
        .order('date', { ascending: true });

      const lineupEventIds = new Set(
        (lineupData || []).map((l: any) => l.event_id).filter(Boolean)
      );

      const games: UpcomingGame[] = (gamesData || []).map((g: any) => ({
        ...g,
        hasLineup: lineupEventIds.has(g.id),
      }));

      setUpcomingGames(games);
    } catch (err) {
      console.error('Error fetching lineups:', err);
      showToast('error', 'Failed to load lineups');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teamId, isCoach]);

  useFocusEffect(
    useCallback(() => { fetchData(); }, [fetchData]),
  );

  const handleDelete = (lineup: Lineup) => {
    Alert.alert(
      'Delete Lineup',
      `Are you sure you want to delete "${lineup.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('lineup_players').delete().eq('lineup_id', lineup.id);
              await supabase.from('lineups').delete().eq('id', lineup.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showToast('success', 'Lineup deleted');
              fetchData();
            } catch {
              showToast('error', 'Failed to delete');
            }
          },
        },
      ],
    );
  };

  const handleQuickPublish = (lineup: LineupWithCounts) => {
    if (lineup.starterCount < 11) {
      Alert.alert(
        'Incomplete Lineup',
        `You have ${lineup.starterCount}/11 starters assigned. Fill all positions before publishing.`,
      );
      return;
    }
    Alert.alert(
      'Publish Lineup',
      `Publish "${lineup.title}"? Players will be able to see it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('lineups')
                .update({ status: 'published' })
                .eq('id', lineup.id);
              if (error) throw error;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showToast('success', 'Lineup published');
              fetchData();
            } catch {
              showToast('error', 'Failed to publish');
            }
          },
        },
      ],
    );
  };

  const handleShare = async (lineup: LineupWithCounts) => {
    const eventInfo = lineup.eventTitle ? ` for ${lineup.eventTitle}` : '';
    const dateInfo = lineup.eventDate ? ` on ${formatDate(lineup.eventDate)}` : '';
    try {
      await Share.share({
        message: `Lineup: ${lineup.title}${eventInfo}${dateInfo}\nFormation: ${lineup.formation}\n${lineup.starterCount} starters, ${lineup.subCount} subs`,
      });
    } catch {}
  };

  const publishedCount = lineups.filter(l => l.status === 'published').length;
  const draftCount = lineups.filter(l => l.status === 'draft').length;
  const upcomingGamesCount = upcomingGames.length;
  const gamesWithoutLineup = upcomingGames.filter(g => !g.hasLineup);
  const latestPublishedLineup = lineups.find((l) => l.status === 'published') ?? null;

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
        <GradientText
          text="Lineups"
          style={styles.title}
          colors={['#FFFFFF', '#D4EBFC']}
        />
        <Text style={styles.subtitle}>
          {isCoach ? 'Manage starting elevens and match plans' : 'View published lineups and match plans'}
        </Text>

        {isCoach ? (
          <View style={styles.statRow}>
            <StatCard
              icon="checkmark-circle-outline"
              value={publishedCount}
              label="Published"
              gradient={Gradients.statPurple}
            />
            <StatCard
              icon="document-text-outline"
              value={draftCount}
              label="Drafts"
              gradient={Gradients.statBlue}
            />
          </View>
        ) : (
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.92)', 'rgba(124, 58, 237, 0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.latestPublishedCard}
          >
            <View style={styles.latestPublishedHeader}>
              <View style={styles.latestPublishedIconWrap}>
                <Ionicons name="sparkles-outline" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.latestPublishedTitle}>Latest Published</Text>
            </View>
            {loading ? (
              <Text style={styles.latestPublishedText}>Loading latest lineup...</Text>
            ) : latestPublishedLineup ? (
              <>
                <Text style={styles.latestPublishedGame} numberOfLines={1}>
                  {latestPublishedLineup.eventTitle || latestPublishedLineup.title || 'Published lineup'}
                </Text>
                <Text style={styles.latestPublishedText}>
                  {latestPublishedLineup.eventDate
                    ? `Published for ${formatDate(latestPublishedLineup.eventDate)}`
                    : 'Latest lineup published for this team'}
                </Text>
              </>
            ) : (
              <Text style={styles.latestPublishedText}>
                No lineup has been published for this team yet.
              </Text>
            )}
          </LinearGradient>
        )}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : (
          <>
            {/* Upcoming Games — create lineup for a game */}
            {isCoach && gamesWithoutLineup.length > 0 && (
              <Card padded={false} style={styles.panel}>
                <View style={styles.panelHeader}>
                  <View style={styles.panelHeaderLeft}>
                    <View style={[styles.panelIconWrap, { backgroundColor: Colors.emeraldSoft }]}>
                      <Ionicons name="add-circle-outline" size={16} color={Colors.emerald} />
                    </View>
                    <View>
                      <Text style={styles.panelTitle}>Create Lineup</Text>
                      <Text style={styles.panelSubtitle}>Select a game to build a lineup for</Text>
                    </View>
                  </View>
                </View>

                {gamesWithoutLineup.map(game => {
                  const displayTitle = game.title || (game.opponent ? `vs ${game.opponent}` : 'Game');
                  return (
                    <TouchableOpacity
                      key={game.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push({
                          pathname: '/team/lineup-builder',
                          params: { teamId, eventId: game.id },
                        });
                      }}
                      activeOpacity={0.7}
                      style={styles.gameCard}
                    >
                      <View style={styles.gameLeft}>
                        <View style={styles.gameIconWrap}>
                          <Ionicons name="football-outline" size={18} color={Colors.red} />
                        </View>
                        <View style={styles.gameInfo}>
                          <Text style={styles.gameTitle} numberOfLines={1}>{displayTitle}</Text>
                          <View style={styles.gameMeta}>
                            <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                            <Text style={styles.gameMetaText}>Date: {formatDate(game.date)}</Text>
                          </View>
                          <View style={styles.gameMeta}>
                            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                            <Text style={styles.gameMetaText}>
                              Time: {formatKickoffTime(game.kickoff_time)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.createChip}>
                        <Ionicons name="add" size={14} color={Colors.primary} />
                        <Text style={styles.createChipText}>Create</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </Card>
            )}

            {/* No games at all — empty state */}
            {isCoach && upcomingGames.length === 0 && lineups.length === 0 && (
              <Card padded={false} style={styles.panel}>
                <EmptyState
                  icon="calendar-outline"
                  title="No games scheduled"
                  message="Schedule a game first, then you can create a lineup for it."
                  actionLabel="Go to Events"
                  onAction={() => router.push(`/team/${teamId}/events`)}
                />
              </Card>
            )}

            {/* All games have lineups — info message */}
            {isCoach && upcomingGames.length > 0 && gamesWithoutLineup.length === 0 && lineups.length > 0 && (
              <View style={styles.allSetBanner}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.emerald} />
                <Text style={styles.allSetText}>All upcoming games have lineups</Text>
              </View>
            )}

            {/* Existing Lineups list */}
            {lineups.length > 0 && (
              <Card padded={false} style={styles.panel}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>All Lineups</Text>
                </View>

                {lineups.map(lineup => (
                  <TouchableOpacity
                    key={lineup.id}
                    onPress={() => {
                      if (isCoach) {
                        router.push({
                          pathname: '/team/lineup-builder',
                          params: { teamId, lineupId: lineup.id, eventId: lineup.event_id || '' },
                        });
                      }
                    }}
                    onLongPress={() => {
                      if (isCoach) handleDelete(lineup);
                    }}
                    activeOpacity={0.7}
                    style={styles.lineupCard}
                  >
                    <View style={styles.lineupTop}>
                      <Text style={styles.lineupTitle} numberOfLines={1}>{lineup.title}</Text>
                      <Chip
                        label={lineup.status === 'published' ? 'Published' : 'Draft'}
                        tone={lineup.status === 'published' ? 'mint' : 'lavender'}
                      />
                    </View>
                    {lineup.eventTitle && (
                      <View style={styles.lineupEventRow}>
                        <Ionicons name="football-outline" size={12} color={Colors.red} />
                        <Text style={styles.lineupEventText}>
                          {lineup.eventTitle}
                          {lineup.eventDate ? ` — ${formatDate(lineup.eventDate)}` : ''}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.lineupMeta}>
                      Formation: {lineup.formation} · {lineup.starterCount} starters · {lineup.subCount} subs
                    </Text>
                    {isCoach && (
                      <View style={styles.lineupActions}>
                        {lineup.status === 'draft' && (
                          <TouchableOpacity
                            style={styles.lineupActionBtn}
                            activeOpacity={0.7}
                            onPress={() => handleQuickPublish(lineup)}
                          >
                            <Ionicons name="checkmark-circle-outline" size={14} color={Colors.emerald} />
                            <Text style={[styles.lineupActionText, { color: Colors.emerald }]}>Publish</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.lineupActionBtn}
                          activeOpacity={0.7}
                          onPress={() => handleShare(lineup)}
                        >
                          <Ionicons name="share-outline" size={14} color={Colors.primary} />
                          <Text style={[styles.lineupActionText, { color: Colors.primary }]}>Share</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </Card>
            )}

            {/* Player empty state */}
            {!isCoach && lineups.length === 0 && (
              <Card padded={false} style={styles.panel}>
                <EmptyState
                  icon="football-outline"
                  title="No lineups yet"
                  message="Your coach hasn't published any lineups yet."
                />
              </Card>
            )}
          </>
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
    paddingTop: 120, paddingHorizontal: 20, paddingBottom: 120, gap: UI.spacing.sm,
  },
  title: {
    color: '#fff', fontSize: 32, fontFamily: UI.typography.bold, letterSpacing: -0.4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)', fontSize: 15, fontFamily: UI.typography.medium,
  },
  statRow: {
    flexDirection: 'row', gap: 12, marginTop: 4,
  },
  latestPublishedCard: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 7,
  },
  latestPublishedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  latestPublishedIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  latestPublishedTitle: {
    fontSize: 16,
    color: '#F5F3FF',
    fontFamily: UI.typography.bold,
  },
  latestPublishedGame: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: UI.typography.bold,
    marginTop: 2,
  },
  latestPublishedText: {
    fontSize: 13,
    color: 'rgba(243, 232, 255, 0.92)',
    fontFamily: UI.typography.medium,
    lineHeight: 18,
  },
  loadingRow: {
    paddingVertical: 40, alignItems: 'center',
  },

  // Panels
  panel: {
    borderRadius: 24, padding: UI.spacing.md, gap: 12, marginTop: 4,
  },
  panelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  panelHeaderLeft: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1,
  },
  panelIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  panelTitle: {
    color: Colors.textPrimary, fontSize: 20, fontFamily: UI.typography.bold,
  },
  panelSubtitle: {
    color: Colors.textSecondary, fontSize: 13, fontFamily: UI.typography.medium, marginTop: 1,
  },

  // Game cards (create lineup for)
  gameCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceMuted, borderRadius: UI.radius.lg,
    padding: 14, gap: 10,
  },
  gameLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1,
  },
  gameIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: Colors.redSoft, alignItems: 'center', justifyContent: 'center',
  },
  gameInfo: { flex: 1, gap: 3 },
  gameTitle: {
    fontSize: 15, color: Colors.textPrimary, fontFamily: UI.typography.bold,
  },
  gameMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  gameMetaText: {
    fontSize: 12, color: Colors.textMuted, fontFamily: UI.typography.medium,
  },
  createChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: UI.radius.pill,
    backgroundColor: Colors.blueSoft,
  },
  createChipText: {
    fontSize: 12, color: Colors.primary, fontFamily: UI.typography.bold,
  },

  // All set banner
  allSetBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: UI.radius.lg,
    paddingVertical: 12, marginTop: 4,
  },
  allSetText: {
    fontSize: 14, color: '#fff', fontFamily: UI.typography.medium,
  },

  // Lineup cards
  lineupCard: {
    backgroundColor: Colors.surfaceMuted, borderRadius: UI.radius.lg,
    padding: 14, gap: 4,
  },
  lineupTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  lineupTitle: {
    color: Colors.textPrimary, fontSize: 16, fontFamily: UI.typography.bold, flex: 1,
  },
  lineupEventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2,
  },
  lineupEventText: {
    fontSize: 13, color: Colors.textSecondary, fontFamily: UI.typography.medium,
  },
  lineupMeta: {
    color: Colors.textMuted, fontSize: 12, fontFamily: UI.typography.medium, marginTop: 2,
  },
  lineupActions: {
    flexDirection: 'row', gap: 8, marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: Colors.borderSoft,
  },
  lineupActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: UI.radius.pill,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderSoft,
  },
  lineupActionText: {
    fontSize: 12, fontFamily: UI.typography.bold,
  },
});
