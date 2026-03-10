import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import Card from '@/components/ui/Card';
import GradientText from '@/components/ui/GradientText';
import LoadMoreButton from '@/components/ui/LoadMoreButton';
import { showToast } from '@/components/ui/Toast';

const GAME_PAGE_SIZE = 50;

interface GameOption {
  id: string;
  title: string | null;
  opponent: string | null;
  date: string;
  kickoff_time: string | null;
  location: string | null;
  draftLineupId: string | null;
}

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(kickoffTime: string | null) {
  if (!kickoffTime) return 'TBD';
  const parsed = new Date(kickoffTime);
  if (Number.isNaN(parsed.getTime())) return kickoffTime;
  return parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SelectGameScreen() {
  const { teamId } = useLocalSearchParams<{ teamId?: string | string[] }>();
  const resolvedTeamId = Array.isArray(teamId) ? teamId[0] : teamId;
  const [games, setGames] = useState<GameOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMoreGames, setHasMoreGames] = useState(false);
  const [loadingMoreGames, setLoadingMoreGames] = useState(false);

  const enrichGames = useCallback(async (gamesData: any[]) => {
    if (gamesData.length === 0) return [];

    const gameIds = gamesData.map(g => g.id);
    const { data: lineupData } = await supabase
      .from('lineups')
      .select('id, event_id, status, updated_at')
      .in('event_id', gameIds)
      .in('status', ['published', 'draft'])
      .order('updated_at', { ascending: false })
      .limit(200);

    const publishedEventIds = new Set(
      (lineupData ?? []).filter((l: any) => l.status === 'published').map((l: any) => l.event_id),
    );
    const latestDraftByEvent = new Map<string, string>();
    for (const lineup of lineupData ?? []) {
      const row = lineup as any;
      if (row.status === 'draft' && row.event_id && !latestDraftByEvent.has(row.event_id)) {
        latestDraftByEvent.set(row.event_id, row.id);
      }
    }

    return gamesData
      .filter(g => !publishedEventIds.has(g.id))
      .map(g => ({
        ...g,
        draftLineupId: latestDraftByEvent.get(g.id) ?? null,
      }));
  }, []);

  const loadGames = useCallback(async () => {
    if (!resolvedTeamId) { setLoading(false); return; }
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);

      const { data: gamesData } = await supabase
        .from('events')
        .select('id, title, opponent, date, kickoff_time, location')
        .eq('team_id', resolvedTeamId)
        .eq('event_type', 'game')
        .gte('date', today)
        .order('date', { ascending: true })
        .range(0, GAME_PAGE_SIZE - 1);

      if (!gamesData || gamesData.length === 0) {
        setGames([]);
        setHasMoreGames(false);
        return;
      }

      setHasMoreGames(gamesData.length === GAME_PAGE_SIZE);
      const enriched = await enrichGames(gamesData);
      setGames(enriched);
    } catch (err) {
      if (__DEV__) console.error('Error loading games:', err);
      showToast('error', 'Failed to load games');
    } finally {
      setLoading(false);
    }
  }, [resolvedTeamId, enrichGames]);

  const loadMoreGames = useCallback(async () => {
    if (!resolvedTeamId || loadingMoreGames) return;
    setLoadingMoreGames(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const from = games.length;

      const { data: gamesData } = await supabase
        .from('events')
        .select('id, title, opponent, date, kickoff_time, location')
        .eq('team_id', resolvedTeamId)
        .eq('event_type', 'game')
        .gte('date', today)
        .order('date', { ascending: true })
        .range(from, from + GAME_PAGE_SIZE - 1);

      if (!gamesData) return;
      setHasMoreGames(gamesData.length === GAME_PAGE_SIZE);
      const enriched = await enrichGames(gamesData);
      setGames(prev => [...prev, ...enriched]);
    } catch {
      // Silently fail — user can retry
    } finally {
      setLoadingMoreGames(false);
    }
  }, [resolvedTeamId, games.length, loadingMoreGames, enrichGames]);

  useFocusEffect(useCallback(() => { loadGames(); }, [loadGames]));

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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <GradientText
          text="Select Game"
          style={styles.headerTitle}
          colors={['#FFFFFF', '#D4EBFC']}
        />
        <View style={styles.backBtnGhost} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.subtitle}>Choose a game to build a lineup for</Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : games.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="calendar-clear-outline" size={40} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No games available</Text>
            <Text style={styles.emptySubtitle}>
              Create a game first, or all upcoming games already have published lineups.
            </Text>
            <TouchableOpacity
              style={styles.createEventBtn}
              activeOpacity={0.8}
              onPress={() => router.replace({ pathname: '/team/create-event', params: { teamId: resolvedTeamId } })}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.createEventText}>Create New Game</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <>
          <Card padded={false} style={styles.panel}>
            <View style={styles.panelHeader}>
              <View style={[styles.panelIconWrap, { backgroundColor: Colors.emeraldSoft }]}>
                <Ionicons name="football-outline" size={16} color={Colors.emerald} />
              </View>
              <View>
                <Text style={styles.panelTitle}>Upcoming Games</Text>
                <Text style={styles.panelSubtitle}>{games.length} game{games.length !== 1 ? 's' : ''} without a published lineup</Text>
              </View>
            </View>

            {games.map(game => {
              const displayTitle = game.title || (game.opponent ? `vs ${game.opponent}` : 'Game');
              return (
                <TouchableOpacity
                  key={game.id}
                  style={styles.gameCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({
                      pathname: '/team/lineup-builder',
                      params: {
                        teamId: resolvedTeamId,
                        eventId: game.id,
                        ...(game.draftLineupId ? { lineupId: game.draftLineupId } : {}),
                      },
                    });
                  }}
                >
                  <View style={styles.gameLeft}>
                    <View style={styles.gameIconWrap}>
                      <Ionicons name="football-outline" size={18} color={Colors.red} />
                    </View>
                    <View style={styles.gameInfo}>
                      <Text style={styles.gameTitle} numberOfLines={1}>{displayTitle}</Text>
                      <View style={styles.gameMeta}>
                        <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                        <Text style={styles.gameMetaText}>{formatDate(game.date)}</Text>
                      </View>
                      <View style={styles.gameMeta}>
                        <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                        <Text style={styles.gameMetaText}>{formatTime(game.kickoff_time)}</Text>
                      </View>
                      {game.location ? (
                        <View style={styles.gameMeta}>
                          <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                          <Text style={styles.gameMetaText}>{game.location}</Text>
                        </View>
                      ) : null}
                      {game.draftLineupId ? (
                        <View style={styles.gameMeta}>
                          <Ionicons name="document-text-outline" size={12} color={Colors.amber} />
                          <Text style={[styles.gameMetaText, styles.draftResumeText]}>Draft saved</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.selectChip}>
                    <Text style={styles.selectChipText}>{game.draftLineupId ? 'Resume' : 'Select'}</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </Card>

          {hasMoreGames && (
            <LoadMoreButton onPress={loadMoreGames} loading={loadingMoreGames} />
          )}

          <View style={styles.hintBanner}>
            <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.hintText}>
              Only games without a published lineup are shown. To view or edit all lineups, go to the{' '}
              <Text
                style={styles.hintLink}
                onPress={() => {
                  router.back();
                  setTimeout(() => router.push(`/team/${resolvedTeamId}/lineups`), 100);
                }}
              >
                Lineups tab
              </Text>
            </Text>
          </View>
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
  header: {
    paddingTop: Platform.OS === 'ios' ? 62 : 44,
    paddingHorizontal: 20,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  backBtnGhost: { width: 42, height: 42 },
  headerTitle: {
    color: '#fff', fontSize: 20, fontFamily: UI.typography.bold,
    flex: 1, textAlign: 'center', paddingHorizontal: 10,
  },
  content: {
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120, gap: 16,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)', fontSize: 15, fontFamily: UI.typography.medium,
  },
  centered: {
    paddingVertical: 60, alignItems: 'center',
  },

  // Empty state
  emptyCard: {
    borderRadius: 24, padding: 32, alignItems: 'center', gap: 12,
  },
  emptyIconWrap: {
    width: 76, height: 76, borderRadius: 22,
    backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20, color: Colors.textPrimary, fontFamily: UI.typography.bold, textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14, color: Colors.textSecondary, fontFamily: UI.typography.medium,
    textAlign: 'center', lineHeight: 20,
  },
  createEventBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: UI.radius.lg,
    paddingVertical: 14, paddingHorizontal: 24, marginTop: 8,
  },
  createEventText: {
    color: '#fff', fontSize: 15, fontFamily: UI.typography.bold,
  },

  // Hint banner
  hintBanner: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: UI.radius.lg,
    paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  hintText: {
    color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: UI.typography.medium,
    lineHeight: 18, flex: 1,
  },
  hintLink: {
    color: '#fff', fontSize: 13, fontFamily: UI.typography.bold,
    textDecorationLine: 'underline',
  },

  // Panel
  panel: {
    borderRadius: 24, padding: UI.spacing.md, gap: 12,
  },
  panelHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
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

  // Game cards
  gameCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceMuted, borderRadius: UI.radius.lg,
    padding: 14, gap: 10,
  },
  gameLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1,
  },
  gameIconWrap: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: Colors.redSoft, alignItems: 'center', justifyContent: 'center',
  },
  gameInfo: { flex: 1, gap: 3 },
  gameTitle: {
    fontSize: 16, color: Colors.textPrimary, fontFamily: UI.typography.bold,
  },
  gameMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  gameMetaText: {
    fontSize: 12, color: Colors.textMuted, fontFamily: UI.typography.medium,
  },
  draftResumeText: {
    color: Colors.amber,
    fontFamily: UI.typography.semibold,
  },
  selectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: UI.radius.pill,
    backgroundColor: Colors.blueSoft,
  },
  selectChipText: {
    fontSize: 13, color: Colors.primary, fontFamily: UI.typography.bold,
  },
});
