import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Pressable,
  Modal,
  Share,
  StyleSheet,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { useGlobalSearchParams, router, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from '@/utils/reanimated-shim';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import { PlayerPosition, TeamCoachWithProfile } from '@/types/database';
import GradientText from '@/components/ui/GradientText';

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDob(date: string | null): string {
  if (!date) return 'N/A';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString('en-US');
}

function formatHeight(feet: number | null, inches: number | null): string {
  if (feet == null || inches == null) return 'N/A';
  return `${feet}'${inches}"`;
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
type RosterView = 'players' | 'coaching';

const FILTER_TABS: { key: PositionFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'goalkeeper', label: 'GK' },
  { key: 'defender', label: 'DEF' },
  { key: 'midfielder', label: 'MID' },
  { key: 'forward', label: 'FWD' },
];

interface PlayerCardProps {
  player: PlayerRow;
  index: number;
  onPress: () => void;
}

interface PlayerRow {
  id: string;
  jersey_number: number | null;
  positions: PlayerPosition[];
  profile: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    date_of_birth: string | null;
    nationality: string | null;
    height_ft: number | null;
    height_in: number | null;
    weight_lbs: number | null;
  };
}

function PlayerGridCard({ player, index, onPress }: PlayerCardProps) {
  const initials = getInitials(player.profile.full_name);
  const playerPositions: PlayerPosition[] = player.positions?.length ? player.positions : ['defender'];
  const primaryPos = playerPositions[0];
  const toneColor = POSITION_COLORS[primaryPos];

  return (
    <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
      <TouchableOpacity activeOpacity={0.9} style={[styles.playerGridCard, { borderTopColor: toneColor }]} onPress={onPress}>
        <View style={[styles.gridBadgeCircle, { backgroundColor: toneColor }]}>
          <Text style={styles.gridBadgeText}>{player.jersey_number ?? initials}</Text>
        </View>

        <View style={styles.gridTopRow}>
          <Text style={styles.gridName} numberOfLines={1}>{player.profile.full_name}</Text>

          <View style={styles.gridChipRow}>
            {playerPositions.slice(0, 1).map((pos) => (
              <View key={pos} style={styles.gridPosChip}>
                <Ionicons name={POSITION_ICONS[pos]} size={11} color={POSITION_COLORS[pos]} />
                <Text style={[styles.gridPosText, { color: POSITION_COLORS[pos] }]}>{POSITION_LABELS[pos]}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.gridMetrics}>
          <View style={styles.gridMetricItem}>
            <Text style={styles.gridMetricLabel}>Date of Birth</Text>
            <Text style={styles.gridMetricValue}>{formatDob(player.profile.date_of_birth)}</Text>
          </View>
          <View style={styles.gridMetricItem}>
            <Text style={styles.gridMetricLabel}>Jersey #</Text>
            <Text style={styles.gridMetricValue}>{player.jersey_number ?? 'N/A'}</Text>
          </View>
          <View style={styles.gridMetricItem}>
            <Text style={styles.gridMetricLabel}>Height</Text>
            <Text style={styles.gridMetricValue}>{formatHeight(player.profile.height_ft, player.profile.height_in)}</Text>
          </View>
          <View style={styles.gridMetricItem}>
            <Text style={styles.gridMetricLabel}>Weight</Text>
            <Text style={styles.gridMetricValue}>{player.profile.weight_lbs ?? 'N/A'}</Text>
          </View>
          <View style={[styles.gridMetricItem, styles.gridMetricWide]}>
            <Text style={styles.gridMetricLabel}>Nationality</Text>
            <Text style={styles.gridMetricValue}>{player.profile.nationality || 'N/A'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function CoachCard({ coach, index }: { coach: TeamCoachWithProfile; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()} style={styles.playerCard}>
      <LinearGradient
        colors={Gradients.primary as readonly [string, string]}
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

export default function RosterScreen() {
  const { teamId } = useGlobalSearchParams<{ teamId: string }>();
  const { profile } = useAuth();
  const isCoach = profile?.role === 'coach' || profile?.role === 'admin';

  const [team, setTeam] = useState<{ id: string; name: string; invite_code: string } | null>(null);
  const [coaches, setCoaches] = useState<TeamCoachWithProfile[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('all');
  const [activeView, setActiveView] = useState<RosterView>('players');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!teamId) {
      setLoading(false);
      return;
    }
    setError(null);

    try {
      const [teamResult, coachResult, playerResult] = await Promise.all([
        supabase.from('teams').select('id, name, invite_code').eq('id', teamId).single(),
        supabase.from('team_coaches').select('id, role, profile:profiles(id, full_name, email)').eq('team_id', teamId).order('role'),
        supabase
          .from('team_players')
          .select('id, jersey_number, positions, profile:profiles(id, full_name, email, phone, date_of_birth, nationality, height_ft, height_in, weight_lbs)')
          .eq('team_id', teamId)
          .order('jersey_number', { ascending: true, nullsFirst: false }),
      ]);

      if (teamResult.error) throw teamResult.error;
      setTeam(teamResult.data);
      if (!coachResult.error && coachResult.data) setCoaches(coachResult.data as unknown as TeamCoachWithProfile[]);
      if (!playerResult.error && playerResult.data) setPlayers(playerResult.data as unknown as PlayerRow[]);
    } catch {
      setError('Failed to load roster.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teamId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  useEffect(() => {
    if (!teamId) return;
    const channel = supabase
      .channel(`roster-${teamId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_players', filter: `team_id=eq.${teamId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_coaches', filter: `team_id=eq.${teamId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [teamId, fetchData]);

  const handleShare = async () => {
    if (!team) return;
    try {
      await Share.share({ message: `Join ${team.name} on MatchFit! Use invite code: ${team.invite_code}` });
    } catch {}
  };

  const handleRemovePlayer = (player: PlayerRow) => {
    Alert.alert(
      'Remove Player',
      `Remove ${player.profile.full_name} from this team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error: deleteError } = await supabase
              .from('team_players')
              .delete()
              .eq('id', player.id);

            if (deleteError) {
              Alert.alert('Error', 'Could not remove player. Please try again.');
              return;
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowPlayerModal(false);
            setSelectedPlayerId(null);
            fetchData();
          },
        },
      ],
    );
  };

  const filteredPlayers = positionFilter === 'all'
    ? players
    : players.filter((p) => p.positions?.includes(positionFilter));

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) ?? null;

  const positionCounts: Record<PositionFilter, number> = {
    all: players.length,
    goalkeeper: players.filter((p) => p.positions?.includes('goalkeeper')).length,
    defender: players.filter((p) => p.positions?.includes('defender')).length,
    midfielder: players.filter((p) => p.positions?.includes('midfielder')).length,
    forward: players.filter((p) => p.positions?.includes('forward')).length,
  };

  if (loading) {
    return (
      <LinearGradient colors={Gradients.primary as readonly [string, string]} style={styles.gradient}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </LinearGradient>
    );
  }

  if (error || !team) {
    return (
      <LinearGradient colors={Gradients.primary as readonly [string, string]} style={styles.gradient}>
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
      colors={Gradients.primary as readonly [string, string]}
      style={styles.gradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
    >
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <GradientText text="Team Roster" style={styles.headerTitle} colors={['#FFFFFF', '#D4EBFC']} />
        {isCoach ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {activeView === 'players' && (
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => router.push({ pathname: '/team/import-roster', params: { teamId: teamId! } })}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.headerBtn} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-social-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
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

        <View style={styles.viewTabsRow}>
          <TouchableOpacity
            style={[styles.viewTab, activeView === 'players' && styles.viewTabActive]}
            onPress={() => setActiveView('players')}
            activeOpacity={0.8}
          >
            <Text style={[styles.viewTabText, activeView === 'players' && styles.viewTabTextActive]}>Players</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewTab, activeView === 'coaching' && styles.viewTabActive]}
            onPress={() => setActiveView('coaching')}
            activeOpacity={0.8}
          >
            <Text style={[styles.viewTabText, activeView === 'coaching' && styles.viewTabTextActive]}>Coaching Staff</Text>
          </TouchableOpacity>
        </View>

        {activeView === 'players' ? (
          <>
            <View style={styles.sectionHeader}>
              <GradientText text="Players" style={styles.sectionTitle} colors={['#FFFFFF', '#D4EBFC']} />
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{filteredPlayers.length}</Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {FILTER_TABS.map((tab) => {
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
              </View>
            ) : (
              <View style={styles.playersGrid}>
                {filteredPlayers.map((p, i) => (
                  <View key={p.id} style={styles.playersGridItem}>
                    <PlayerGridCard
                      player={p}
                      index={i}
                      onPress={() => {
                        setSelectedPlayerId(p.id);
                        setShowPlayerModal(true);
                      }}
                    />
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <GradientText text="Coaching Staff" style={styles.sectionTitle} colors={['#FFFFFF', '#D4EBFC']} />
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{coaches.length}</Text>
              </View>
            </View>

            {coaches.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="ribbon-outline" size={36} color="rgba(255,255,255,0.5)" />
                <Text style={styles.emptyTitle}>No coaches assigned yet</Text>
              </View>
            ) : (
              coaches.map((coach, index) => (
                <CoachCard key={coach.id} coach={coach} index={index} />
              ))
            )}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <Modal
        transparent
        visible={showPlayerModal}
        animationType="fade"
        onRequestClose={() => setShowPlayerModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowPlayerModal(false)}>
          <Pressable style={styles.playerModalCard}>
            {selectedPlayer ? (
              <>
                <View style={styles.playerModalHeader}>
                  <View style={styles.playerModalHeaderLeft}>
                    <LinearGradient
                      colors={Gradients.primary as readonly [string, string]}
                      style={styles.playerModalBadge}
                    >
                      <Text style={styles.playerModalBadgeText}>
                        {selectedPlayer.jersey_number ?? getInitials(selectedPlayer.profile.full_name)}
                      </Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.playerModalName}>{selectedPlayer.profile.full_name}</Text>
                      <View style={styles.playerModalRoleRow}>
                        {(selectedPlayer.positions?.length ? selectedPlayer.positions : (['defender'] as PlayerPosition[])).slice(0, 1).map((pos) => (
                          <View key={pos} style={styles.playerModalRoleChip}>
                            <Ionicons name={POSITION_ICONS[pos]} size={12} color={POSITION_COLORS[pos]} />
                            <Text style={[styles.playerModalRoleText, { color: POSITION_COLORS[pos] }]}>{POSITION_LABELS[pos]}</Text>
                          </View>
                        ))}
                        <View style={styles.playerModalRoleChipMuted}>
                          <Text style={styles.playerModalRoleTextMuted}>#{selectedPlayer.jersey_number ?? 'N/A'}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setShowPlayerModal(false)} style={styles.playerModalClose}>
                    <Ionicons name="close" size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.playerModalSectionTitle}>Contact Information</Text>
                <View style={styles.playerModalContactStack}>
                  <View style={styles.playerModalContactItem}>
                    <Text style={styles.playerModalInfoLabel}>Email</Text>
                    <Text style={styles.playerModalInfoValue}>{selectedPlayer.profile.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.playerModalContactItem}>
                    <Text style={styles.playerModalInfoLabel}>Phone</Text>
                    <Text style={styles.playerModalInfoValue}>{selectedPlayer.profile.phone || 'N/A'}</Text>
                  </View>
                </View>

                <Text style={styles.playerModalSectionTitle}>Player Details</Text>
                <View style={styles.playerModalInfoGrid}>
                  <View style={styles.playerModalInfoItem}>
                    <Text style={styles.playerModalInfoLabel}>Height</Text>
                    <Text style={styles.playerModalInfoValue}>
                      {selectedPlayer.profile.height_ft != null && selectedPlayer.profile.height_in != null
                        ? `${selectedPlayer.profile.height_ft}'${selectedPlayer.profile.height_in}"`
                        : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.playerModalInfoItem}>
                    <Text style={styles.playerModalInfoLabel}>Weight</Text>
                    <Text style={styles.playerModalInfoValue}>{selectedPlayer.profile.weight_lbs ?? 'N/A'}</Text>
                  </View>
                  <View style={styles.playerModalInfoItem}>
                    <Text style={styles.playerModalInfoLabel}>DOB</Text>
                    <Text style={styles.playerModalInfoValue}>{selectedPlayer.profile.date_of_birth || 'N/A'}</Text>
                  </View>
                  <View style={styles.playerModalInfoItem}>
                    <Text style={styles.playerModalInfoLabel}>Nationality</Text>
                    <Text style={styles.playerModalInfoValue}>{selectedPlayer.profile.nationality || 'N/A'}</Text>
                  </View>
                </View>

                {isCoach && (
                  <>
                    <TouchableOpacity
                      style={styles.removePlayerBtn}
                      onPress={() => selectedPlayer && handleRemovePlayer(selectedPlayer)}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="trash-outline" size={14} color="#fff" />
                      <Text style={styles.removePlayerBtnText}>Remove Player from Team</Text>
                    </TouchableOpacity>
                    <Text style={styles.removePlayerHint}>This will remove the player from your team roster.</Text>
                  </>
                )}
              </>
            ) : null}
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
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 20,
    padding: 16, marginBottom: 18, gap: 12,
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
  viewTabsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    gap: 6,
  },
  viewTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 9,
  },
  viewTabActive: {
    backgroundColor: Colors.surface,
  },
  viewTabText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    fontFamily: UI.typography.semibold,
  },
  viewTabTextActive: {
    color: Colors.primary,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 16, color: '#fff', fontFamily: UI.typography.bold },
  countBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText: { fontSize: 12, color: '#fff', fontFamily: UI.typography.bold },
  filterRow: { gap: 8, paddingBottom: 14 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: UI.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  filterPillActive: { backgroundColor: Colors.surface, borderColor: Colors.surface },
  filterPillText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: UI.typography.semibold },
  filterPillTextActive: { color: Colors.primary },

  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  playersGridItem: {
    width: '50%',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  playerGridCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 14,
    borderTopWidth: 3,
    padding: 14,
    minHeight: 260,
  },
  gridBadgeCircle: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridBadgeText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: UI.typography.bold,
  },
  gridName: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: UI.typography.bold,
    marginTop: 2,
  },
  gridTopRow: { marginTop: 8 },
  gridChipRow: {
    flexDirection: 'row',
    marginTop: 7,
  },
  gridPosChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  gridPosText: {
    fontSize: 11,
    fontFamily: UI.typography.bold,
  },
  gridMetrics: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridMetricItem: {
    width: '47%',
  },
  gridMetricWide: {
    width: '100%',
  },
  gridMetricLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: UI.typography.medium,
  },
  gridMetricValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: UI.typography.semibold,
    marginTop: 1,
  },

  playerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 16,
    padding: 14, marginBottom: 10,
  },
  jerseyCircle: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
  playerInfo: { flex: 1, gap: 5 },
  playerName: { fontSize: 15, color: Colors.textPrimary, fontFamily: UI.typography.bold },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  positionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceMuted, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  positionChipText: { fontSize: 11, fontFamily: UI.typography.bold },

  emptyState: {
    alignItems: 'center', gap: 8, paddingVertical: 32,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, color: '#fff', fontFamily: UI.typography.bold },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  playerModalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    borderTopWidth: 3,
    borderTopColor: Colors.primary,
  },
  playerModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  playerModalHeaderLeft: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  playerModalBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerModalBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: UI.typography.bold,
  },
  playerModalName: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: UI.typography.bold,
  },
  playerModalRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 7,
    flexWrap: 'wrap',
  },
  playerModalRoleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  playerModalRoleText: {
    fontSize: 11,
    fontFamily: UI.typography.bold,
  },
  playerModalRoleChipMuted: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  playerModalRoleTextMuted: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontFamily: UI.typography.semibold,
  },
  playerModalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  playerModalSectionTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: UI.typography.bold,
    marginTop: 14,
    marginBottom: 10,
  },
  playerModalInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  playerModalContactStack: {
    gap: 12,
  },
  playerModalInfoItem: {
    width: '48%',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 10,
    padding: 10,
  },
  playerModalContactItem: {
    width: '100%',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 10,
    padding: 10,
  },
  playerModalInfoLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: UI.typography.medium,
  },
  playerModalInfoValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: UI.typography.semibold,
    marginTop: 2,
  },
  removePlayerBtn: {
    marginTop: 16,
    backgroundColor: Colors.red,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  removePlayerBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: UI.typography.bold,
  },
  removePlayerHint: {
    marginTop: 12,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: UI.typography.medium,
  },
});
