import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import { getFormation, DEFAULT_FORMATION } from '@/constants/formations';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TeamPlayerWithProfile, PlayerPosition } from '@/types/database';
import PitchView from '@/components/lineup/PitchView';
import FormationPicker from '@/components/lineup/FormationPicker';
import PlayerSelector from '@/components/lineup/PlayerSelector';
import { showToast } from '@/components/ui/Toast';
import GradientText from '@/components/ui/GradientText';

// Generate UUID v4
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface PlayerAssignment {
  playerId: string;
  playerName: string;
  jerseyNumber: number | null;
  positions?: PlayerPosition[];
}

export default function LineupBuilderScreen() {
  const { teamId, lineupId, eventId } = useLocalSearchParams<{
    teamId: string;
    lineupId?: string;
    eventId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [formation, setFormation] = useState(DEFAULT_FORMATION);
  const [title, setTitle] = useState('');
  const [assignments, setAssignments] = useState<Record<string, PlayerAssignment>>({});
  const [substitutes, setSubstitutes] = useState<PlayerAssignment[]>([]);
  const [players, setPlayers] = useState<TeamPlayerWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectedPositionKey, setSelectedPositionKey] = useState('');
  const [selectingForSubs, setSelectingForSubs] = useState(false);
  const [eventTitle, setEventTitle] = useState<string | null>(null);

  const isEditing = !!lineupId;
  const formationData = getFormation(formation);

  // Get all assigned player IDs (starters + subs)
  const assignedPlayerIds = new Set([
    ...Object.values(assignments).map(a => a.playerId),
    ...substitutes.map(s => s.playerId),
  ]);

  // Load roster and optionally existing lineup
  useEffect(() => {
    loadData();
  }, [teamId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch roster
      const { data: rosterData, error: rosterError } = await supabase
        .from('team_players')
        .select('id, jersey_number, positions, player_id, profiles:player_id(id, full_name, email)')
        .eq('team_id', teamId);

      if (rosterError) throw rosterError;

      const mapped: TeamPlayerWithProfile[] = (rosterData || []).map((r: any) => ({
        id: r.id,
        jersey_number: r.jersey_number,
        positions: r.positions || [],
        profile: r.profiles,
      })) as TeamPlayerWithProfile[];

      setPlayers(mapped);

      // If event linked, get event title
      if (eventId) {
        const { data: eventData } = await supabase
          .from('events')
          .select('title, event_type, opponent')
          .eq('id', eventId)
          .single();

        if (eventData) {
          setEventTitle(eventData.title || `${eventData.event_type} vs ${eventData.opponent || 'TBD'}`);
        }
      }

      // If editing, load existing lineup
      if (lineupId) {
        const { data: lineupData, error: lineupError } = await supabase
          .from('lineups')
          .select('*')
          .eq('id', lineupId)
          .single();

        if (lineupError) throw lineupError;

        if (lineupData) {
          setFormation(lineupData.formation || DEFAULT_FORMATION);
          setTitle(lineupData.title || '');

          // Load lineup players
          const { data: lpData } = await supabase
            .from('lineup_players')
            .select('*, profiles:player_id(id, full_name, email)')
            .eq('lineup_id', lineupId);

          if (lpData) {
            const starterAssignments: Record<string, PlayerAssignment> = {};
            const subsList: PlayerAssignment[] = [];

            for (const lp of lpData as any[]) {
              const rosterEntry = mapped.find(m => m.profile.id === lp.player_id);
              const assignment: PlayerAssignment = {
                playerId: lp.player_id,
                playerName: lp.profiles?.full_name || 'Unknown',
                jerseyNumber: rosterEntry?.jersey_number ?? null,
                positions: rosterEntry?.positions,
              };

              if (lp.is_starter && lp.position_key) {
                starterAssignments[lp.position_key] = assignment;
              } else {
                subsList.push(assignment);
              }
            }

            setAssignments(starterAssignments);
            setSubstitutes(subsList);
          }
        }
      }
    } catch (err) {
      console.error('Error loading lineup data:', err);
      showToast('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePositionPress = (positionKey: string) => {
    const existing = assignments[positionKey];
    if (existing) {
      // Remove assignment
      Alert.alert(
        'Remove Player',
        `Remove ${existing.playerName} from this position?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setAssignments(prev => {
                const next = { ...prev };
                delete next[positionKey];
                return next;
              });
            },
          },
        ],
      );
    } else {
      setSelectedPositionKey(positionKey);
      setSelectingForSubs(false);
      setSelectorVisible(true);
    }
  };

  const handleSelectPlayer = (playerId: string) => {
    const player = players.find(p => p.profile.id === playerId);
    if (!player) return;

    const assignment: PlayerAssignment = {
      playerId: player.profile.id,
      playerName: player.profile.full_name,
      jerseyNumber: player.jersey_number,
      positions: player.positions,
    };

    if (selectingForSubs) {
      setSubstitutes(prev => [...prev, assignment]);
    } else {
      setAssignments(prev => ({
        ...prev,
        [selectedPositionKey]: assignment,
      }));
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectorVisible(false);
  };

  const handleRemoveSub = (index: number) => {
    const sub = substitutes[index];
    Alert.alert(
      'Remove Substitute',
      `Remove ${sub.playerName} from substitutes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSubstitutes(prev => prev.filter((_, i) => i !== index));
          },
        },
      ],
    );
  };

  const handleSave = async (status: 'draft' | 'published') => {
    if (!user) return;

    const starterCount = Object.keys(assignments).length;
    if (status === 'published' && starterCount < 11) {
      Alert.alert(
        'Incomplete Lineup',
        `You have ${starterCount}/11 starters assigned. Fill all positions before publishing.`,
      );
      return;
    }

    const lineupTitle = title.trim() || eventTitle || `Lineup ${new Date().toLocaleDateString()}`;

    try {
      setSaving(true);

      const lineupRecord = {
        id: lineupId || uuid(),
        team_id: teamId,
        event_id: eventId || null,
        title: lineupTitle,
        formation,
        status,
        created_by: user.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('lineups')
          .update({
            title: lineupRecord.title,
            formation: lineupRecord.formation,
            status: lineupRecord.status,
            event_id: lineupRecord.event_id,
          })
          .eq('id', lineupId);
        if (error) throw error;

        // Delete old players and re-insert
        await supabase.from('lineup_players').delete().eq('lineup_id', lineupId);
      } else {
        const { error } = await supabase.from('lineups').insert(lineupRecord);
        if (error) throw error;
      }

      // Insert lineup players
      const playerRows = [
        ...Object.entries(assignments).map(([posKey, a]) => ({
          id: uuid(),
          lineup_id: lineupRecord.id,
          player_id: a.playerId,
          position_key: posKey,
          is_starter: true,
        })),
        ...substitutes.map(s => ({
          id: uuid(),
          lineup_id: lineupRecord.id,
          player_id: s.playerId,
          position_key: 'SUB',
          is_starter: false,
        })),
      ];

      if (playerRows.length > 0) {
        const { error: playersError } = await supabase
          .from('lineup_players')
          .insert(playerRows);
        if (playersError) throw playersError;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(
        'success',
        status === 'published' ? 'Lineup Published' : 'Draft Saved',
        lineupTitle,
      );
      router.back();
    } catch (err: any) {
      console.error('Error saving lineup:', err);
      showToast('error', 'Failed to save', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Build pitch players map
  const pitchPlayers: Record<string, { positionKey: string; playerName: string; jerseyNumber: number | null; positions?: PlayerPosition[] }> = {};
  for (const [key, a] of Object.entries(assignments)) {
    pitchPlayers[key] = {
      positionKey: key,
      playerName: a.playerName,
      jerseyNumber: a.jerseyNumber,
      positions: a.positions,
    };
  }

  if (loading) {
    return (
      <LinearGradient colors={Gradients.primary as unknown as string[]} style={styles.gradient}>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </LinearGradient>
    );
  }

  const starterCount = Object.keys(assignments).length;

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
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <GradientText
            text={isEditing ? 'Edit Lineup' : 'Create Lineup'}
            style={styles.headerTitle}
            colors={['#FFFFFF', '#D4EBFC']}
          />
          {eventTitle && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>{eventTitle}</Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Formation Picker */}
        <Text style={styles.sectionLabel}>Formation</Text>
        <FormationPicker
          selected={formation}
          onSelect={(f) => {
            setFormation(f);
            // Clear assignments that don't exist in new formation
            const newPositions = new Set(getFormation(f).positions.map(p => p.key));
            setAssignments(prev => {
              const next: Record<string, PlayerAssignment> = {};
              for (const [key, val] of Object.entries(prev)) {
                if (newPositions.has(key)) next[key] = val;
              }
              return next;
            });
          }}
        />

        {/* Pitch */}
        <View style={styles.pitchContainer}>
          <PitchView
            positions={formationData.positions}
            players={pitchPlayers}
            onPositionPress={handlePositionPress}
          />
        </View>

        {/* Starter count */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {starterCount}/11 Starters
          </Text>
          <Text style={styles.countText}>
            {substitutes.length} Subs
          </Text>
        </View>

        {/* Substitutes */}
        <View style={styles.subsSection}>
          <View style={styles.subsHeader}>
            <Text style={styles.subsTitle}>Substitutes</Text>
            <TouchableOpacity
              onPress={() => {
                setSelectingForSubs(true);
                setSelectorVisible(true);
              }}
              style={styles.addSubBtn}
            >
              <Ionicons name="add" size={18} color={Colors.primary} />
              <Text style={styles.addSubText}>Add</Text>
            </TouchableOpacity>
          </View>

          {substitutes.length === 0 ? (
            <Text style={styles.noSubs}>No substitutes added yet</Text>
          ) : (
            substitutes.map((sub, idx) => (
              <TouchableOpacity
                key={`${sub.playerId}-${idx}`}
                onPress={() => handleRemoveSub(idx)}
                style={styles.subRow}
                activeOpacity={0.7}
              >
                <View style={styles.subAvatar}>
                  <Text style={styles.subAvatarText}>
                    {sub.jerseyNumber ?? '?'}
                  </Text>
                </View>
                <Text style={styles.subName}>{sub.playerName}</Text>
                <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => handleSave('draft')}
            disabled={saving}
            style={styles.draftBtn}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
                <Text style={styles.draftBtnText}>Save Draft</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleSave('published')}
            disabled={saving}
            style={styles.publishBtn}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={Gradients.primary as unknown as string[]}
              style={styles.publishGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.publishBtnText}>Publish</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Player Selector Modal */}
      <PlayerSelector
        visible={selectorVisible}
        onClose={() => setSelectorVisible(false)}
        onSelectPlayer={handleSelectPlayer}
        players={players}
        assignedPlayerIds={assignedPlayerIds}
        positionLabel={
          selectingForSubs
            ? 'Substitute'
            : formationData.positions.find(p => p.key === selectedPositionKey)?.fullLabel || ''
        }
      />
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: UI.typography.bold,
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: UI.typography.medium,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  content: {
    paddingTop: 8,
    gap: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: UI.typography.semibold,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
  },
  pitchContainer: {
    paddingHorizontal: 20,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 20,
  },
  countText: {
    fontSize: 14,
    fontFamily: UI.typography.semibold,
    color: 'rgba(255,255,255,0.85)',
  },
  subsSection: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: UI.radius.xl,
    padding: 16,
    ...UI.shadow.card,
  },
  subsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  subsTitle: {
    fontSize: 17,
    fontFamily: UI.typography.bold,
    color: Colors.textPrimary,
  },
  addSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: UI.radius.pill,
    backgroundColor: Colors.blueSoft,
  },
  addSubText: {
    fontSize: 13,
    fontFamily: UI.typography.semibold,
    color: Colors.primary,
  },
  noSubs: {
    fontSize: 14,
    fontFamily: UI.typography.medium,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSoft,
    gap: 10,
  },
  subAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subAvatarText: {
    fontSize: 12,
    fontFamily: UI.typography.bold,
    color: Colors.textSecondary,
  },
  subName: {
    flex: 1,
    fontSize: 14,
    fontFamily: UI.typography.medium,
    color: Colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  draftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: UI.radius.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    ...UI.shadow.soft,
  },
  draftBtnText: {
    fontSize: 15,
    fontFamily: UI.typography.semibold,
    color: Colors.primary,
  },
  publishBtn: {
    flex: 1,
    borderRadius: UI.radius.xl,
    overflow: 'hidden',
    ...UI.shadow.soft,
  },
  publishGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  publishBtnText: {
    fontSize: 15,
    fontFamily: UI.typography.bold,
    color: '#fff',
  },
});
