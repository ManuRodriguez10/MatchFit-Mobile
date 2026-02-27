import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  StyleSheet,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { useGlobalSearchParams, router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from '@/utils/reanimated-shim';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import { CoachRole, PlayerPosition, TeamCoachWithProfile, TeamPlayerWithProfile } from '@/types/database';
import GradientText from '@/components/ui/GradientText';

// ── Helpers ───────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const POSITION_COLORS: Record<PlayerPosition, string> = {
  goalkeeper: '#EAB308',
  defender: '#118FF3',
  midfielder: '#10B981',
  forward: '#EF4444',
};

const POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: 'GK',
  defender: 'DEF',
  midfielder: 'MID',
  forward: 'FWD',
};

const POSITION_ICONS: Record<PlayerPosition, keyof typeof Ionicons.glyphMap> = {
  goalkeeper: 'hand-left-outline',
  defender: 'shield-outline',
  midfielder: 'flash-outline',
  forward: 'trending-up-outline',
};

type PositionFilter = 'all' | PlayerPosition;

const FILTER_TABS: { key: PositionFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'goalkeeper', label: 'GK' },
  { key: 'defender', label: 'DEF' },
  { key: 'midfielder', label: 'MID' },
  { key: 'forward', label: 'FWD' },
];

// ── Player Card ──────────────────────────────────────────────

interface PlayerCardProps {
  player: TeamPlayerWithProfile;
  index: number;
}

function PlayerCard({ player, index }: PlayerCardProps) {
  const initials = getInitials(player.profile.full_name);

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.playerCard}>
      {/* Jersey number circle */}
      <LinearGradient
        colors={Gradients.primary as unknown as string[]}
        style={styles.jerseyCircle}
      >
        <Text style={styles.jerseyCircleText}>
          {player.jersey_number ?? initials}
        </Text>
      </LinearGradient>

      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{player.profile.full_name}</Text>
        <View style={styles.badgeRow}>
          {player.positions?.map(pos => (
            <View key={pos} style={styles.positionChip}>
              <Ionicons name={POSITION_ICONS[pos]} size={12} color={POSITION_COLORS[pos]} />
              <Text style={[styles.positionChipText, { color: POSITION_COLORS[pos] }]}>
                {POSITION_LABELS[pos]}
              </Text>
            </View>
          ))}
          {player.jersey_number != null && (
            <Text style={styles.jerseyLabel}>#{player.jersey_number}</Text>
          )}
          {(!player.positions || player.positions.length === 0) && player.jersey_number == null && (
            <Text style={styles.noDetailText}>No details set</Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// ── Coach Card ───────────────────────────────────────────────

function CoachCard({ coach, index }: { coach: TeamCoachWithProfile; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.playerCard}>
      <LinearGradient
        colors={Gradients.primary as unknown as string[]}
        style={styles.jerseyCircle}
      >
        <Ionicons name="ribbon" size={18} color="#fff" />
      </LinearGradient>
      <View style={styles.playerInfo}>
        <Text style={styles.playerName}>{coach.profile.full_name}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.positionChip, { backgroundColor: Colors.blueSoft }]}>
            <Text style={[styles.positionChipText, { color: Colors.primary }]}>
              {coach.role === 'head_coach' ? 'Head Coach' : 'Asst. Coach'}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Roster Screen ─────────────────────────────────────────────

export default function RosterScreen() {
  const { teamId } = useGlobalSearchParams<{ teamId: string }>();
  const { profile } = useAuth();
  const isCoach = profile?.role === 'coach' || profile?.role === 'admin';

  const [team, setTeam] = useState<{ id: string; name: string; invite_code: string } | null>(null);
  const [coaches, setCoaches] = useState<TeamCoachWithProfile[]>([]);
  const [players, setPlayers] = useState<TeamPlayerWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all');

  const fetchData = useCallback(async () => {
    if (!teamId) return;
    try {
      const [teamResult, coachResult, playerResult] = await Promise.all([
        supabase.from('teams').select('id, name, invite_code').eq('id', teamId).single(),
        supabase.from('team_coaches').select('id, role, profile:profiles(id, full_name, email)').eq('team_id', teamId).order('role'),
        supabase.from('team_players').select('id, jersey_number, positions, profile:profiles(id, full_name, email)').eq('team_id', teamId).order('jersey_number', { ascending: true, nullsFirst: false }),
      ]);

      if (teamResult.error) throw teamResult.error;
      setTeam(teamResult.data);
      if (!coachResult.error && coachResult.data) setCoaches(coachResult.data as unknown as TeamCoachWithProfile[]);
      if (!playerResult.error && playerResult.data) setPlayers(playerResult.data as unknown as TeamPlayerWithProfile[]);
    } catch {
      setError('Failed to load roster.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teamId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time subscription
  useEffect(() => {
    if (!teamId) return;
    const channel = supabase
      .channel(`roster-${teamId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_players', filter: `team_id=eq.${teamId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_coaches', filter: `team_id=eq.${teamId}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [teamId, fetchData]);

  const handleShare = async () => {
    if (!team) return;
    try {
      await Share.share({ message: `Join ${team.name} on MatchFit! Use invite code: ${team.invite_code}` });
    } catch {}
  };

  // Filter players by position
  const filteredPlayers = positionFilter === 'all'
    ? players
    : players.filter(p => p.positions?.includes(positionFilter));

  // Count per position
  const positionCounts: Record<PositionFilter, number> = {
    all: players.length,
    goalkeeper: players.filter(p => p.positions?.includes('goalkeeper')).length,
    defender: players.filter(p => p.positions?.includes('defender')).length,
    midfielder: players.filter(p => p.positions?.includes('midfielder')).length,
    forward: players.filter(p => p.positions?.includes('forward')).length,
  };

  if (loading) {
    return (
      <LinearGradient colors={Gradients.primary as unknown as string[]} style={styles.gradient}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </LinearGradient>
    );
  }

  if (error || !team) {
    return (
      <LinearGradient colors={Gradients.primary as unknown as string[]} style={styles.gradient}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="rgba(255,255,255,0.7)" />
          <Text style={styles.errorText}>{error ?? 'Team not found.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryBtnText}>Go Back</Text>
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

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <GradientText
          text="Team Roster"
          style={styles.headerTitle}
          colors={['#FFFFFF', '#D4EBFC']}
        />
        {isCoach ? (
          <TouchableOpacity style={styles.headerBtn} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtnGhost} />
        )}
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#fff" />
        }
      >
        {/* Stats summary */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.statsCard}>
          <View style={styles.statRow}>
            <View style={styles.statPill}>
              <Ionicons name="ribbon-outline" size={16} color={Colors.primary} />
              <Text style={styles.statText}>{coaches.length} coach{coaches.length !== 1 ? 'es' : ''}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statPill}>
              <Ionicons name="people-outline" size={16} color={Colors.primary} />
              <Text style={styles.statText}>{players.length} player{players.length !== 1 ? 's' : ''}</Text>
            </View>
          </View>
          {isCoach && (
            <TouchableOpacity style={styles.inviteCodeRow} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="key-outline" size={14} color={Colors.primary} />
              <Text style={styles.inviteCodeLabel}>Invite Code: </Text>
              <Text style={styles.inviteCode}>{team.invite_code}</Text>
              <Ionicons name="copy-outline" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Coaching Staff */}
        <View style={styles.sectionHeader}>
          <GradientText
            text="Coaching Staff"
            style={styles.sectionTitle}
            colors={['#FFFFFF', '#D4EBFC']}
          />
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{coaches.length}</Text>
          </View>
        </View>

        {coaches.map((c, i) => (
          <CoachCard key={c.id} coach={c} index={i} />
        ))}

        {/* Players section */}
        <View style={styles.sectionHeader}>
          <GradientText
            text="Players"
            style={styles.sectionTitle}
            colors={['#FFFFFF', '#D4EBFC']}
          />
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filteredPlayers.length}</Text>
          </View>
        </View>

        {/* Position filter tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTER_TABS.map(tab => {
            const isActive = positionFilter === tab.key;
            const count = positionCounts[tab.key];
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPositionFilter(tab.key);
                }}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {tab.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filteredPlayers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={36} color="rgba(255,255,255,0.5)" />
            <Text style={styles.emptyTitle}>
              {positionFilter === 'all' ? 'No players yet' : `No ${POSITION_LABELS[positionFilter as PlayerPosition]}s`}
            </Text>
            {isCoach && positionFilter === 'all' && (
              <>
                <Text style={styles.emptySubtitle}>Share the invite code to get started</Text>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
                  <Ionicons name="share-social-outline" size={18} color="#fff" />
                  <Text style={styles.shareBtnText}>Share Invite Code</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          filteredPlayers.map((p, i) => (
            <PlayerCard key={p.id} player={p} index={i} />
          ))
        )}

        <View style={{ height: 120 }} />
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
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: 80, left: -40,
  },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  errorText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, textAlign: 'center', fontFamily: UI.typography.medium },
  retryBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24 },
  retryBtnText: { color: '#fff', fontSize: 15, fontFamily: UI.typography.bold },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 16,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerBtnGhost: { width: 40 },
  headerTitle: { flex: 1, fontSize: 20, color: '#fff', textAlign: 'center', fontFamily: UI.typography.bold },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Stats card
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 20,
    padding: 16, marginBottom: 24, gap: 12,
  },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 14, color: Colors.textPrimary, fontFamily: UI.typography.semibold },
  statDivider: { width: 1, height: 18, backgroundColor: Colors.border },
  inviteCodeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.blueSoft, borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  inviteCodeLabel: { fontSize: 13, color: Colors.textSecondary, fontFamily: UI.typography.medium },
  inviteCode: { flex: 1, fontSize: 14, color: Colors.primary, letterSpacing: 2, fontFamily: UI.typography.bold },

  // Sections
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 16, color: '#fff', fontFamily: UI.typography.bold },
  countBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText: { fontSize: 12, color: '#fff', fontFamily: UI.typography.bold },

  // Filter pills
  filterRow: { gap: 8, paddingBottom: 14 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: UI.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  filterPillActive: { backgroundColor: Colors.surface, borderColor: Colors.surface },
  filterPillText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: UI.typography.semibold },
  filterPillTextActive: { color: Colors.primary },

  // Player card
  playerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 16,
    padding: 14, marginBottom: 10,
  },
  jerseyCircle: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
  jerseyCircleText: { color: '#fff', fontSize: 16, fontFamily: UI.typography.bold },
  playerInfo: { flex: 1, gap: 5 },
  playerName: { fontSize: 15, color: Colors.textPrimary, fontFamily: UI.typography.bold },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  positionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceMuted, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  positionChipText: { fontSize: 11, fontFamily: UI.typography.bold },
  jerseyLabel: { fontSize: 12, color: Colors.textSecondary, fontFamily: UI.typography.bold },
  noDetailText: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic', fontFamily: UI.typography.medium },

  // Empty state
  emptyState: {
    alignItems: 'center', gap: 8, paddingVertical: 32,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, color: '#fff', fontFamily: UI.typography.bold },
  emptySubtitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center',
    paddingHorizontal: 24, fontFamily: UI.typography.medium,
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 20, marginTop: 4,
  },
  shareBtnText: { color: '#fff', fontSize: 14, fontFamily: UI.typography.bold },
});
