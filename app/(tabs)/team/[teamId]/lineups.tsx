import React, { useState, useCallback, useMemo } from 'react';
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
  Modal,
  Pressable,
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
import EmptyState from '@/components/ui/EmptyState';
import { showToast } from '@/components/ui/Toast';
import GradientText from '@/components/ui/GradientText';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

type TabKey = 'next_game' | 'upcoming' | 'previous';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateLong(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
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

function getLineupMonth(lineup: LineupWithCounts): { year: number; month: number } {
  const dateStr = lineup.eventDate || lineup.updated_at?.slice(0, 10) || '';
  if (!dateStr) return { year: new Date().getFullYear(), month: new Date().getMonth() };
  const date = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  return { year: date.getFullYear(), month: date.getMonth() };
}

function getGameMonth(dateStr: string): { year: number; month: number } {
  const date = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  return { year: date.getFullYear(), month: date.getMonth() };
}

function formatMonthYear(year: number, month: number) {
  return new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
  const [activeTab, setActiveTab] = useState<TabKey>('next_game');

  // Month navigation for upcoming & previous tabs
  const [upcomingMonth, setUpcomingMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [previousMonth, setPreviousMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [monthPickerTarget, setMonthPickerTarget] = useState<'upcoming' | 'previous'>('upcoming');
  const [pickerYear, setPickerYear] = useState(upcomingMonth.year);

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

      // Fetch upcoming games
      const { data: gamesData } = await supabase
        .from('events')
        .select('id, title, opponent, date, kickoff_time')
        .eq('team_id', teamId)
        .eq('event_type', 'game')
        .gte('date', today)
        .order('date', { ascending: true });

      const publishedEventIds = new Set(
        (lineupData || []).filter((l: any) => l.status === 'published').map((l: any) => l.event_id).filter(Boolean)
      );

      const games: UpcomingGame[] = (gamesData || []).map((g: any) => ({
        ...g,
        hasLineup: publishedEventIds.has(g.id),
      }));

      setUpcomingGames(games);

      // Auto-select month for upcoming tab (second game onward)
      if (games.length > 1) {
        const m = getGameMonth(games[1].date);
        setUpcomingMonth(m);
      }

      // Auto-select month for previous tab (most recent past published lineup)
      const latestPast = lineupsWithCounts.find(
        l => l.status === 'published' && l.eventDate && l.eventDate < today
      );
      if (latestPast) {
        const m = getLineupMonth(latestPast);
        setPreviousMonth(m);
      }
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

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const todayStr = new Date().toISOString().slice(0, 10);

  const publishedLineups = useMemo(() => lineups.filter(l => l.status === 'published'), [lineups]);
  const draftLineups = useMemo(() => lineups.filter(l => l.status === 'draft'), [lineups]);

  // Next game = first upcoming game
  const nextGame = upcomingGames.length > 0 ? upcomingGames[0] : null;

  // Remaining upcoming games (all except next game)
  const remainingUpcoming = useMemo(() => upcomingGames.slice(1), [upcomingGames]);

  // Remaining upcoming filtered by month
  const upcomingForMonth = useMemo(() => {
    return remainingUpcoming.filter(g => {
      const m = getGameMonth(g.date);
      return m.year === upcomingMonth.year && m.month === upcomingMonth.month;
    });
  }, [remainingUpcoming, upcomingMonth]);

  const upcomingMonthLabel = formatMonthYear(upcomingMonth.year, upcomingMonth.month);

  // Previous lineups = published lineups with past event dates
  const previousLineups = useMemo(
    () => publishedLineups.filter(l => l.eventDate && l.eventDate < todayStr),
    [publishedLineups, todayStr],
  );

  const previousForMonth = useMemo(() => {
    return previousLineups.filter(l => {
      const m = getLineupMonth(l);
      return m.year === previousMonth.year && m.month === previousMonth.month;
    });
  }, [previousLineups, previousMonth]);

  const previousMonthLabel = formatMonthYear(previousMonth.year, previousMonth.month);

  // Get lineup info for a game
  const getGameLineupInfo = useCallback((gameId: string) => {
    const published = lineups.find(l => l.event_id === gameId && l.status === 'published');
    if (published) return { lineup: published, status: 'published' as const };
    const draft = lineups.find(l => l.event_id === gameId && l.status === 'draft');
    if (draft) return { lineup: draft, status: 'draft' as const };
    return { lineup: null, status: 'none' as const };
  }, [lineups]);

  // Weekly status
  const { start: weekStart, end: weekEnd } = getCurrentWeekRange();
  const thisWeekGames = upcomingGames.filter(g => g.date >= weekStart && g.date <= weekEnd);
  const thisWeekPublishedIds = new Set(
    publishedLineups.filter(l => l.eventDate && l.eventDate >= weekStart && l.eventDate <= weekEnd).map(l => l.event_id)
  );
  const thisWeekUnpublished = thisWeekGames.filter(g => !thisWeekPublishedIds.has(g.id));

  // Tab counts
  const tabCounts: Record<TabKey, number> = {
    next_game: nextGame ? 1 : 0,
    upcoming: remainingUpcoming.length,
    previous: previousLineups.length,
  };

  const visibleTabs: TabKey[] = ['next_game', 'upcoming', 'previous'];

  const tabLabels: Record<TabKey, string> = {
    next_game: 'Next Game',
    upcoming: 'Upcoming',
    previous: 'Previous',
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

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

  const handleShare = async (lineup: LineupWithCounts) => {
    const eventInfo = lineup.eventTitle ? ` for ${lineup.eventTitle}` : '';
    const dateInfo = lineup.eventDate ? ` on ${formatDate(lineup.eventDate)}` : '';
    try {
      await Share.share({
        message: `Lineup: ${lineup.title}${eventInfo}${dateInfo}\nFormation: ${lineup.formation}\n${lineup.starterCount} starters, ${lineup.subCount} subs`,
      });
    } catch {}
  };

  const handleClearAllPrevious = () => {
    if (previousLineups.length === 0) return;
    const count = previousLineups.length;
    Alert.alert(
      'Clear All Previous Lineups',
      `This will permanently delete ${count} previous lineup${count === 1 ? '' : 's'}. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              `You are about to permanently remove all ${count} previous lineup${count === 1 ? '' : 's'} and their player assignments.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: `Delete All ${count}`,
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const ids = previousLineups.map(l => l.id);
                      await supabase.from('lineup_players').delete().in('lineup_id', ids);
                      await supabase.from('lineups').delete().in('id', ids);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      showToast('success', 'All previous lineups cleared');
                      fetchData();
                    } catch {
                      showToast('error', 'Failed to clear lineups');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  // Month navigation helpers
  const prevMonth = (target: 'upcoming' | 'previous') => {
    const setter = target === 'upcoming' ? setUpcomingMonth : setPreviousMonth;
    setter(prev => {
      const m = prev.month === 0 ? 11 : prev.month - 1;
      const y = prev.month === 0 ? prev.year - 1 : prev.year;
      return { year: y, month: m };
    });
  };

  const nextMonth = (target: 'upcoming' | 'previous') => {
    const setter = target === 'upcoming' ? setUpcomingMonth : setPreviousMonth;
    setter(prev => {
      const m = prev.month === 11 ? 0 : prev.month + 1;
      const y = prev.month === 11 ? prev.year + 1 : prev.year;
      return { year: y, month: m };
    });
  };

  const openMonthPicker = (target: 'upcoming' | 'previous') => {
    const current = target === 'upcoming' ? upcomingMonth : previousMonth;
    setMonthPickerTarget(target);
    setPickerYear(current.year);
    setShowMonthPicker(true);
  };

  const handleSelectMonth = (month: number) => {
    const setter = monthPickerTarget === 'upcoming' ? setUpcomingMonth : setPreviousMonth;
    setter({ year: pickerYear, month });
    setShowMonthPicker(false);
  };

  // ---------------------------------------------------------------------------
  // Game press handler
  // ---------------------------------------------------------------------------

  const handleGamePress = (game: UpcomingGame) => {
    const { lineup, status } = getGameLineupInfo(game.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (status === 'published' && lineup) {
      router.push({ pathname: '/team/lineup-view', params: { teamId, lineupId: lineup.id } });
    } else if (status === 'draft' && lineup && isCoach) {
      router.push({ pathname: '/team/lineup-builder', params: { teamId, eventId: game.id, lineupId: lineup.id } });
    } else if (status === 'none' && isCoach) {
      router.push({ pathname: '/team/lineup-builder', params: { teamId, eventId: game.id } });
    } else if (status === 'published' && lineup) {
      router.push({ pathname: '/team/lineup-view', params: { teamId, lineupId: lineup.id } });
    }
  };

  // ---------------------------------------------------------------------------
  // Render: Game card (reused in Next Game + Upcoming)
  // ---------------------------------------------------------------------------

  const renderGameCard = (game: UpcomingGame, variant: 'next' | 'list' = 'list') => {
    const displayTitle = game.title || (game.opponent ? `vs ${game.opponent}` : 'Game');
    const { lineup, status } = getGameLineupInfo(game.id);

    const statusChip = status === 'published'
      ? <Chip label="Published" tone="mint" />
      : status === 'draft'
        ? <View style={styles.statusChipDraft}><Text style={styles.statusChipDraftText}>Draft</Text></View>
        : <View style={styles.statusChipNone}><Text style={styles.statusChipNoneText}>No Lineup</Text></View>;

    if (variant === 'next') {
      return (
        <Card padded={false} style={styles.panel}>
          <View style={styles.nextGameHeader}>
            <View style={styles.nextGameIconWrap}>
              <Ionicons name="football" size={24} color={Colors.red} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.nextGameTitleRow}>
                <Text style={styles.nextGameTitle} numberOfLines={1}>{displayTitle}</Text>
                {statusChip}
              </View>
              <View style={styles.nextGameMeta}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.nextGameMetaText}>{formatDateLong(game.date)}</Text>
              </View>
              <View style={styles.nextGameMeta}>
                <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.nextGameMetaText}>Kickoff: {formatKickoffTime(game.kickoff_time)}</Text>
              </View>
            </View>
          </View>

          {lineup && (
            <View style={styles.nextGameLineupInfo}>
              <Text style={styles.nextGameLineupText}>
                {lineup.formation} · {lineup.starterCount}/11 starters · {lineup.subCount} subs
              </Text>
            </View>
          )}

          {/* Action */}
          {isCoach ? (
            <TouchableOpacity
              style={styles.nextGameActionBtn}
              activeOpacity={0.7}
              onPress={() => handleGamePress(game)}
            >
              <Ionicons
                name={status === 'published' ? 'eye-outline' : status === 'draft' ? 'pencil' : 'add-circle-outline'}
                size={18}
                color="#fff"
              />
              <Text style={styles.nextGameActionText}>
                {status === 'published' ? 'View Lineup' : status === 'draft' ? 'Continue Editing' : 'Create Lineup'}
              </Text>
            </TouchableOpacity>
          ) : status === 'published' && lineup ? (
            <TouchableOpacity
              style={styles.nextGameActionBtn}
              activeOpacity={0.7}
              onPress={() => handleGamePress(game)}
            >
              <Ionicons name="eye-outline" size={18} color="#fff" />
              <Text style={styles.nextGameActionText}>View Lineup</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.nextGamePending}>
              <Ionicons name="hourglass-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.nextGamePendingText}>Lineup not yet published</Text>
            </View>
          )}
        </Card>
      );
    }

    // List variant
    return (
      <TouchableOpacity
        key={game.id}
        onPress={() => handleGamePress(game)}
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
              <Text style={styles.gameMetaText}>{formatDate(game.date)}</Text>
            </View>
            <View style={styles.gameMeta}>
              <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.gameMetaText}>{formatKickoffTime(game.kickoff_time)}</Text>
            </View>
            {lineup && (
              <View style={styles.gameMeta}>
                <Ionicons name="people-outline" size={12} color={Colors.textMuted} />
                <Text style={styles.gameMetaText}>
                  {lineup.starterCount}/11 starters · {lineup.formation}
                </Text>
              </View>
            )}
          </View>
        </View>
        {status === 'published' ? (
          <View style={styles.publishedChip}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.emerald} />
          </View>
        ) : status === 'draft' && isCoach ? (
          <View style={styles.draftChip}>
            <Ionicons name="pencil" size={14} color={Colors.amber} />
            <Text style={styles.draftChipText}>Edit</Text>
          </View>
        ) : isCoach ? (
          <View style={styles.createChip}>
            <Ionicons name="add" size={14} color={Colors.primary} />
            <Text style={styles.createChipText}>Create</Text>
          </View>
        ) : status === 'published' ? (
          <View style={styles.publishedChip}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.emerald} />
          </View>
        ) : (
          <View style={styles.pendingChip}>
            <Text style={styles.pendingChipText}>Pending</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Published lineup card (for previous tab)
  // ---------------------------------------------------------------------------

  const renderLineupCard = (lineup: LineupWithCounts) => (
    <TouchableOpacity
      key={lineup.id}
      onPress={() => {
        router.push({
          pathname: '/team/lineup-view',
          params: { teamId, lineupId: lineup.id },
        });
      }}
      onLongPress={() => {
        if (isCoach) handleDelete(lineup);
      }}
      activeOpacity={0.7}
      style={styles.lineupCard}
    >
      <View style={styles.lineupTop}>
        <Text style={styles.lineupTitle} numberOfLines={1}>{lineup.title}</Text>
        <Chip label="Published" tone="mint" />
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
  );

  const renderEmptyState = (message: string) => (
    <Card padded={false} style={styles.panel}>
      <EmptyState
        icon="football-outline"
        title="Nothing here"
        message={message}
      />
    </Card>
  );

  // ---------------------------------------------------------------------------
  // Render: Month navigation bar
  // ---------------------------------------------------------------------------

  const renderMonthNav = (target: 'upcoming' | 'previous') => {
    const label = target === 'upcoming' ? upcomingMonthLabel : previousMonthLabel;
    return (
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => prevMonth(target)} activeOpacity={0.7} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.monthLabelWrapper}
          onPress={() => openMonthPicker(target)}
          activeOpacity={0.6}
        >
          <Text style={styles.monthLabel}>{label}</Text>
          <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => nextMonth(target)} activeOpacity={0.7} hitSlop={12}>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  // ---------------------------------------------------------------------------
  // Tab: Next Game
  // ---------------------------------------------------------------------------

  const renderNextGame = () => {
    if (!nextGame) {
      return (
        <Card padded={false} style={styles.panel}>
          <EmptyState
            icon="calendar-outline"
            title="No upcoming games"
            message={isCoach ? 'Schedule a game first to create a lineup.' : 'No upcoming games scheduled.'}
            {...(isCoach && {
              actionLabel: 'Go to Events',
              onAction: () => router.push(`/team/${teamId}/events`),
            })}
          />
        </Card>
      );
    }

    return renderGameCard(nextGame, 'next');
  };

  // ---------------------------------------------------------------------------
  // Tab: Upcoming
  // ---------------------------------------------------------------------------

  const renderUpcoming = () => (
    <>
      {renderMonthNav('upcoming')}

      {remainingUpcoming.length === 0 ? (
        renderEmptyState('No other upcoming games scheduled.')
      ) : upcomingForMonth.length === 0 ? (
        renderEmptyState(`No upcoming games in ${upcomingMonthLabel}.`)
      ) : (
        <Card padded={false} style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.panelHeaderLeft}>
              <View style={[styles.panelIconWrap, { backgroundColor: Colors.blueSoft }]}>
                <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.panelTitle}>{upcomingMonthLabel}</Text>
                <Text style={styles.panelSubtitle}>
                  {upcomingForMonth.length} game{upcomingForMonth.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>

          {upcomingForMonth.map(game => renderGameCard(game, 'list'))}
        </Card>
      )}
    </>
  );

  // ---------------------------------------------------------------------------
  // Tab: Previous Lineups
  // ---------------------------------------------------------------------------

  const renderPrevious = () => (
    <>
      {renderMonthNav('previous')}

      {previousLineups.length === 0 ? (
        renderEmptyState(
          isCoach
            ? 'No previous lineups yet. Lineups for past games will appear here.'
            : 'No previous lineups to show.'
        )
      ) : previousForMonth.length === 0 ? (
        renderEmptyState(`No lineups in ${previousMonthLabel}.`)
      ) : (
        <Card padded={false} style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.panelHeaderLeft}>
              <View style={[styles.panelIconWrap, { backgroundColor: Colors.emeraldSoft }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color={Colors.emerald} />
              </View>
              <View>
                <Text style={styles.panelTitle}>{previousMonthLabel}</Text>
                <Text style={styles.panelSubtitle}>
                  {previousForMonth.length} lineup{previousForMonth.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>

          {previousForMonth.map(lineup => renderLineupCard(lineup))}
        </Card>
      )}

      {/* Clear all previous */}
      {isCoach && previousLineups.length > 0 && (
        <TouchableOpacity
          style={styles.clearPublishedBtn}
          activeOpacity={0.7}
          onPress={handleClearAllPrevious}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text style={styles.clearPublishedBtnText}>Clear all previous lineups</Text>
        </TouchableOpacity>
      )}
    </>
  );

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <LinearGradient colors={Gradients.primary as unknown as string[]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading lineups...</Text>
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

        {/* Weekly status banner — coach only */}
        {isCoach && thisWeekGames.length > 0 && (
          <View style={[styles.allSetBanner, thisWeekUnpublished.length > 0 && styles.weekWarningBanner]}>
            <Ionicons
              name={thisWeekUnpublished.length === 0 ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={thisWeekUnpublished.length === 0 ? Colors.emerald : Colors.amber}
            />
            <Text style={styles.allSetText}>
              {thisWeekUnpublished.length === 0
                ? 'All lineups published this week'
                : `${thisWeekUnpublished.length} game${thisWeekUnpublished.length > 1 ? 's' : ''} this week still need${thisWeekUnpublished.length === 1 ? 's' : ''} a published lineup`}
            </Text>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabBar}>
          {visibleTabs.map(tab => {
            const isActive = activeTab === tab;
            const label = tabLabels[tab];
            const count = tabCounts[tab];
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {label}
                </Text>
                {tab !== 'next_game' && count > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab content */}
        {activeTab === 'next_game' && renderNextGame()}
        {activeTab === 'upcoming' && renderUpcoming()}
        {activeTab === 'previous' && renderPrevious()}
      </ScrollView>

      {/* Month Picker Modal */}
      <Modal visible={showMonthPicker} transparent animationType="fade" onRequestClose={() => setShowMonthPicker(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setShowMonthPicker(false)}>
          <Pressable style={styles.pickerCard} onPress={() => {}}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity style={styles.pickerNavBtn} onPress={() => setPickerYear(y => y - 1)}>
                <Ionicons name="chevron-back" size={18} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>{pickerYear}</Text>
              <TouchableOpacity style={styles.pickerNavBtn} onPress={() => setPickerYear(y => y + 1)}>
                <Ionicons name="chevron-forward" size={18} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.monthGrid}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((label, idx) => {
                const current = monthPickerTarget === 'upcoming' ? upcomingMonth : previousMonth;
                const isSelected = current.year === pickerYear && current.month === idx;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[styles.monthCell, isSelected && styles.monthCellSelected]}
                    onPress={() => handleSelectMonth(idx)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.monthCellText, isSelected && styles.monthCellTextSelected]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.8)', fontSize: 15, fontFamily: UI.typography.medium,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 3,
    marginTop: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  tabText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: UI.typography.semibold,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: UI.typography.bold,
  },
  tabBadgeTextActive: {
    color: '#fff',
  },

  // Month navigation
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  monthLabelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  monthLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
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

  // Next game card
  nextGameHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  nextGameIconWrap: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: Colors.redSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  nextGameTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  nextGameTitle: {
    fontSize: 20,
    color: Colors.textPrimary,
    fontFamily: UI.typography.bold,
    flex: 1,
  },
  nextGameMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  nextGameMetaText: {
    fontSize: 14, color: Colors.textSecondary, fontFamily: UI.typography.medium,
  },
  nextGameLineupInfo: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: UI.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  nextGameLineupText: {
    fontSize: 13, color: Colors.textSecondary, fontFamily: UI.typography.medium,
  },
  nextGameActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: UI.radius.lg,
    paddingVertical: 14,
  },
  nextGameActionText: {
    fontSize: 16, color: '#fff', fontFamily: UI.typography.bold,
  },
  nextGamePending: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: UI.radius.md,
    paddingVertical: 12,
  },
  nextGamePendingText: {
    fontSize: 14, color: Colors.textMuted, fontFamily: UI.typography.medium,
  },

  // Status chips (inline)
  statusChipDraft: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: UI.radius.pill,
    backgroundColor: Colors.amberSoft,
  },
  statusChipDraftText: {
    fontSize: 11, color: Colors.amber, fontFamily: UI.typography.bold,
  },
  statusChipNone: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: UI.radius.pill,
    backgroundColor: Colors.surfaceMuted,
  },
  statusChipNoneText: {
    fontSize: 11, color: Colors.textMuted, fontFamily: UI.typography.bold,
  },

  // Game cards (list)
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
  draftChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: UI.radius.pill,
    backgroundColor: Colors.amberSoft,
  },
  draftChipText: {
    fontSize: 12, color: Colors.amber, fontFamily: UI.typography.bold,
  },
  publishedChip: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.emeraldSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  pendingChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: UI.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pendingChipText: {
    fontSize: 12, color: Colors.textMuted, fontFamily: UI.typography.bold,
  },

  // Weekly banner
  allSetBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: UI.radius.lg,
    paddingVertical: 12, paddingHorizontal: 12,
  },
  allSetText: {
    fontSize: 14, color: '#fff', fontFamily: UI.typography.medium, flex: 1,
  },
  weekWarningBanner: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
  },

  // Lineup cards (previous tab)
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

  // Clear published
  clearPublishedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  clearPublishedBtnText: {
    fontSize: 14,
    color: '#EF4444',
    fontFamily: UI.typography.semibold,
  },

  // Month picker modal
  pickerBackdrop: {
    flex: 1, backgroundColor: 'rgba(17,24,39,0.55)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  pickerCard: {
    width: '100%', maxWidth: 340, backgroundColor: Colors.surface,
    borderRadius: 18, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  pickerTitle: {
    fontSize: 18, fontFamily: UI.typography.bold, color: Colors.textPrimary,
  },
  pickerNavBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  monthGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  monthCell: {
    width: '30%', flexGrow: 1, paddingVertical: 12, alignItems: 'center',
    borderRadius: 10, backgroundColor: Colors.surfaceMuted,
  },
  monthCellSelected: {
    backgroundColor: Colors.primary,
  },
  monthCellText: {
    fontSize: 14, color: Colors.textPrimary, fontFamily: UI.typography.semibold,
  },
  monthCellTextSelected: {
    color: '#fff',
  },
});
