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
} from 'react-native';
import { useGlobalSearchParams, router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from '@/utils/reanimated-shim';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import { CoachRole, PlayerPosition, TeamCoachWithProfile, TeamPlayerWithProfile } from '@/types/database';

// ── Helpers ───────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const POSITION_COLORS: Record<PlayerPosition, string> = {
  goalkeeper: '#F59E0B',
  defender: '#3B82F6',
  midfielder: '#10B981',
  forward: '#EF4444',
};

const POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: 'GK',
  defender: 'DEF',
  midfielder: 'MID',
  forward: 'FWD',
};

// ── RosterMemberItem ─────────────────────────────────────────

interface RosterMemberItemProps {
  name: string;
  isCoach: boolean;
  coachRole?: CoachRole;
  jerseyNumber?: number | null;
  positions?: PlayerPosition[];
  index: number;
}

function RosterMemberItem({
  name,
  isCoach,
  coachRole,
  jerseyNumber,
  positions = [],
  index,
}: RosterMemberItemProps) {
  const initials = getInitials(name);
  const gradientColors = isCoach
    ? (Gradients.primary as unknown as string[])
    : (Gradients.primaryLight as unknown as string[]);

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={styles.memberRow}>
      {/* Avatar */}
      <LinearGradient colors={gradientColors} style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </LinearGradient>

      {/* Info */}
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{name}</Text>
        <View style={styles.badgeRow}>
          {isCoach && coachRole ? (
            <View style={styles.coachBadge}>
              <Text style={styles.coachBadgeText}>
                {coachRole === 'head_coach' ? 'Head Coach' : 'Asst. Coach'}
              </Text>
            </View>
          ) : (
            <>
              {jerseyNumber != null && (
                <View style={styles.jerseyBadge}>
                  <Text style={styles.jerseyText}>#{jerseyNumber}</Text>
                </View>
              )}
              {positions.map((pos) => (
                <View
                  key={pos}
                  style={[styles.positionTag, { backgroundColor: `${POSITION_COLORS[pos]}20` }]}
                >
                  <Text style={[styles.positionText, { color: POSITION_COLORS[pos] }]}>
                    {POSITION_LABELS[pos]}
                  </Text>
                </View>
              ))}
              {positions.length === 0 && jerseyNumber == null && (
                <Text style={styles.noDetailText}>No details set</Text>
              )}
            </>
          )}
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
  const [error, setError] = useState<string | null>(null);

  const fetchCoaches = useCallback(async () => {
    if (!teamId) return;
    const { data, error } = await supabase
      .from('team_coaches')
      .select('id, role, profile:profiles(id, full_name, email)')
      .eq('team_id', teamId)
      .order('role');
    if (!error && data) setCoaches(data as unknown as TeamCoachWithProfile[]);
  }, [teamId]);

  const fetchPlayers = useCallback(async () => {
    if (!teamId) return;
    const { data, error } = await supabase
      .from('team_players')
      .select('id, jersey_number, positions, profile:profiles(id, full_name, email)')
      .eq('team_id', teamId)
      .order('jersey_number', { ascending: true, nullsFirst: false });
    if (!error && data) setPlayers(data as unknown as TeamPlayerWithProfile[]);
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [teamResult, coachResult, playerResult] = await Promise.all([
          supabase.from('teams').select('id, name, invite_code').eq('id', teamId).single(),
          supabase.from('team_coaches')
            .select('id, role, profile:profiles(id, full_name, email)')
            .eq('team_id', teamId)
            .order('role'),
          supabase.from('team_players')
            .select('id, jersey_number, positions, profile:profiles(id, full_name, email)')
            .eq('team_id', teamId)
            .order('jersey_number', { ascending: true, nullsFirst: false }),
        ]);

        if (teamResult.error) throw teamResult.error;
        setTeam(teamResult.data);
        if (!coachResult.error && coachResult.data) {
          setCoaches(coachResult.data as unknown as TeamCoachWithProfile[]);
        }
        if (!playerResult.error && playerResult.data) {
          setPlayers(playerResult.data as unknown as TeamPlayerWithProfile[]);
        }
      } catch {
        setError('Failed to load roster. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [teamId]);

  // Real-time subscription
  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel(`roster-${teamId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_players', filter: `team_id=eq.${teamId}` },
        () => fetchPlayers()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_coaches', filter: `team_id=eq.${teamId}` },
        () => fetchCoaches()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [teamId, fetchCoaches, fetchPlayers]);

  const handleShare = async () => {
    if (!team) return;
    try {
      await Share.share({
        message: `Join ${team.name} on MatchFit! Use invite code: ${team.invite_code}`,
      });
    } catch {
      // dismissed
    }
  };

  // ── Loading / Error ─────────────────────────────────────────
  if (loading) {
    return (
      <LinearGradient colors={Gradients.primary as unknown as string[]} style={styles.gradient}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading roster...</Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ── Main Render ─────────────────────────────────────────────
  return (
    <LinearGradient
      colors={Gradients.primary as unknown as string[]}
      style={styles.gradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
    >
      {/* Decorative circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{team.name}</Text>
        {isCoach ? (
          <TouchableOpacity style={styles.headerBtn} onPress={handleShare} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats card */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsCard}>
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
              <Text style={styles.inviteCodeLabel}>Player Invite Code: </Text>
              <Text style={styles.inviteCode}>{team.invite_code}</Text>
              <Ionicons name="share-social-outline" size={14} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Coaches section */}
        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Coaches</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{coaches.length}</Text>
          </View>
        </Animated.View>

        {coaches.map((c, i) => (
          <RosterMemberItem
            key={c.id}
            name={c.profile.full_name}
            isCoach={true}
            coachRole={c.role}
            index={i}
          />
        ))}

        {/* Players section */}
        <Animated.View
          entering={FadeInDown.delay(160 + coaches.length * 60 + 60).springify()}
          style={styles.sectionHeader}
        >
          <Text style={styles.sectionTitle}>Players</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{players.length}</Text>
          </View>
        </Animated.View>

        {players.length === 0 ? (
          <Animated.View
            entering={FadeInDown.delay(220 + coaches.length * 60).springify()}
            style={styles.emptyState}
          >
            <Ionicons name="people-outline" size={36} color="rgba(255,255,255,0.5)" />
            <Text style={styles.emptyTitle}>No players yet</Text>
            {isCoach ? (
              <>
                <Text style={styles.emptySubtitle}>Share the invite code to get started</Text>
                <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.85}>
                  <Ionicons name="share-social-outline" size={18} color="#fff" />
                  <Text style={styles.shareButtonText}>Share Invite Code</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.emptySubtitle}>Your teammates will appear here once they join</Text>
            )}
          </Animated.View>
        ) : (
          players.map((p, i) => (
            <RosterMemberItem
              key={p.id}
              name={p.profile.full_name}
              isCoach={false}
              jerseyNumber={p.jersey_number}
              positions={p.positions}
              index={coaches.length + i}
            />
          ))
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────

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

  // Loading / error
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  loadingText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontFamily: UI.typography.medium },
  errorText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, textAlign: 'center', fontFamily: UI.typography.medium },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 24,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15, fontFamily: UI.typography.bold },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', fontFamily: UI.typography.bold,
  },

  // Scroll
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Stats card
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 20, padding: 16, marginBottom: 24, gap: 12,
  },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, fontFamily: UI.typography.medium },
  statDivider: { width: 1, height: 18, backgroundColor: Colors.border },
  inviteCodeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(59,130,246,0.07)', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  inviteCodeLabel: { fontSize: 13, color: Colors.textSecondary, fontFamily: UI.typography.medium },
  inviteCode: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.primary, letterSpacing: 2, fontFamily: UI.typography.bold },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', fontFamily: UI.typography.bold },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff', fontFamily: UI.typography.bold },

  // Member row
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 16,
    padding: 14, marginBottom: 10,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16, fontFamily: UI.typography.bold },
  memberInfo: { flex: 1, gap: 5 },
  memberName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontFamily: UI.typography.bold },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  coachBadge: {
    backgroundColor: 'rgba(59,130,246,0.12)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  coachBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary, fontFamily: UI.typography.bold },
  jerseyBadge: {
    backgroundColor: 'rgba(30,58,138,0.1)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  jerseyText: { fontSize: 12, fontWeight: '700', color: Colors.primaryDark, fontFamily: UI.typography.bold },
  positionTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  positionText: { fontSize: 11, fontWeight: '700', fontFamily: UI.typography.bold },
  noDetailText: { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic', fontFamily: UI.typography.medium },

  // Empty state
  emptyState: {
    alignItems: 'center', gap: 8, paddingVertical: 32,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: UI.typography.bold },
  emptySubtitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', paddingHorizontal: 24,
    fontFamily: UI.typography.medium,
  },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 20, marginTop: 4,
  },
  shareButtonText: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: UI.typography.bold },

  bottomPad: { height: 20 },
});
