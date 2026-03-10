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
  const params = useLocalSearchParams<{
    teamId?: string | string[];
    lineupId?: string | string[];
    eventId?: string | string[];
  }>();
  const teamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;
  const lineupIdParam = Array.isArray(params.lineupId) ? params.lineupId[0] : params.lineupId;
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeLineupId, setActiveLineupId] = useState<string | null>(lineupIdParam ?? null);
  const [lineupVersion, setLineupVersion] = useState<number | null>(null);

  const isEditing = !!activeLineupId;
  const formationData = getFormation(formation);

  // Get all assigned player IDs (starters + subs)
  const assignedPlayerIds = new Set([
    ...Object.values(assignments).map(a => a.playerId),
    ...substitutes.map(s => s.playerId),
  ]);

  // Load roster and optionally existing lineup
  useEffect(() => {
    loadData();
  }, [teamId, lineupIdParam, eventId]);

  const loadData = async () => {
    try {
      if (!teamId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      // Fetch roster
      const { data: rosterData, error: rosterError } = await supabase
        .from('team_players')
        .select('id, jersey_number, positions, player_id, profiles:player_id(id, full_name, email)')
        .eq('team_id', teamId)
        .limit(60);

      if (rosterError) throw rosterError;

      const mapped: TeamPlayerWithProfile[] = (rosterData || []).map((r: any) => ({
        id: r.id,
        jersey_number: r.jersey_number,
        positions: r.positions || [],
        profile: r.profiles,
      })) as TeamPlayerWithProfile[];
      const rosterByProfileId = new Map(mapped.map((m) => [m.profile.id, m]));

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
      } else {
        setEventTitle(null);
      }

      // Resolve lineup ID: explicit param, or latest draft for this game.
      let resolvedLineupId: string | null = lineupIdParam ?? null;
      if (!resolvedLineupId && eventId) {
        const { data: draftLineupData } = await supabase
          .from('lineups')
          .select('id')
          .eq('team_id', teamId)
          .eq('event_id', eventId)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        resolvedLineupId = draftLineupData?.id ?? null;
      }

      setActiveLineupId(resolvedLineupId);

      // If editing, load existing lineup
      if (resolvedLineupId) {
        if (__DEV__) console.log('[LineupBuilder] Loading lineup with ID:', resolvedLineupId);
        const { data: lineupData, error: lineupError } = await supabase
          .from('lineups')
          .select('*')
          .eq('id', resolvedLineupId)
          .single();

        if (__DEV__) console.log('[LineupBuilder] Lineup data:', JSON.stringify(lineupData));
        if (__DEV__) console.log('[LineupBuilder] Lineup error:', lineupError);

        if (lineupError) throw lineupError;

        if (lineupData) {
          setFormation(lineupData.formation || DEFAULT_FORMATION);
          setTitle(lineupData.title || '');
          setLineupVersion(lineupData.version ?? null);

          // Load lineup players
          const { data: lpData, error: lpError } = await supabase
            .from('lineup_players')
            .select('player_id, position_key, is_starter')
            .eq('lineup_id', resolvedLineupId)
            .limit(30);

          if (__DEV__) console.log('[LineupBuilder] Lineup players count:', lpData?.length);
          if (__DEV__) console.log('[LineupBuilder] Lineup players error:', lpError);
          if (__DEV__) console.log('[LineupBuilder] Lineup players data:', JSON.stringify(lpData));

          if (lpError) throw lpError;

          if (lpData) {
            const starterAssignments: Record<string, PlayerAssignment> = {};
            const subsList: PlayerAssignment[] = [];

            const playerIds = (lpData as any[])
              .map((lp) => lp.player_id)
              .filter(Boolean) as string[];
            const missingProfileIds = [...new Set(playerIds)].filter((id) => !rosterByProfileId.has(id));
            let missingProfilesById = new Map<string, string>();

            if (missingProfileIds.length > 0) {
              const { data: missingProfiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', missingProfileIds);

              missingProfilesById = new Map(
                (missingProfiles || []).map((p: any) => [p.id, p.full_name]),
              );
            }

            for (const lp of lpData as any[]) {
              if (!lp.player_id) continue;
              const rosterEntry = rosterByProfileId.get(lp.player_id);
              const assignment: PlayerAssignment = {
                playerId: lp.player_id,
                playerName: rosterEntry?.profile.full_name || missingProfilesById.get(lp.player_id) || 'Unknown',
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
      } else {
        setFormation(DEFAULT_FORMATION);
        setTitle('');
        setAssignments({});
        setSubstitutes([]);
      }
    } catch (err) {
      if (__DEV__) console.error('Error loading lineup data:', err);
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
              setHasUnsavedChanges(true);
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

    setHasUnsavedChanges(true);
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
            setHasUnsavedChanges(true);
            setSubstitutes(prev => prev.filter((_, i) => i !== index));
          },
        },
      ],
    );
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Would you like to save your draft before leaving?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back(),
          },
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save Draft',
            onPress: () => handleSave('draft'),
          },
        ],
      );
    } else {
      router.back();
    }
  };

  const handleClearLineup = () => {
    const starterCount = Object.keys(assignments).length;
    const subCount = substitutes.length;
    if (starterCount === 0 && subCount === 0) return;

    Alert.alert(
      'Clear Lineup',
      `Remove all ${starterCount} starter${starterCount !== 1 ? 's' : ''} and ${subCount} sub${subCount !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setAssignments({});
            setSubstitutes([]);
            setHasUnsavedChanges(true);
          },
        },
      ],
    );
  };

  const handleSave = async (status: 'draft' | 'published') => {
    if (!user || !teamId) return;

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
      let targetLineupId = activeLineupId;

      // Enforce a single draft per team+event by reusing the latest draft row.
      if (!targetLineupId && status === 'draft' && eventId) {
        const { data: existingDraft } = await supabase
          .from('lineups')
          .select('id')
          .eq('team_id', teamId)
          .eq('event_id', eventId)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingDraft?.id) {
          targetLineupId = existingDraft.id;
        }
      }

      const lineupRecord = {
        id: targetLineupId || uuid(),
        team_id: teamId,
        event_id: eventId || null,
        title: lineupTitle,
        formation,
        status,
        created_by: user.id,
      };

      if (targetLineupId) {
        // Optimistic locking: include version check to detect concurrent edits
        let updateQuery = supabase
          .from('lineups')
          .update({
            title: lineupRecord.title,
            formation: lineupRecord.formation,
            status: status === 'published' ? 'draft' : lineupRecord.status, // publish via RPC below
            event_id: lineupRecord.event_id,
          })
          .eq('id', targetLineupId);

        if (lineupVersion !== null) {
          updateQuery = updateQuery.eq('version', lineupVersion);
        }

        const { data: updatedRows, error } = await updateQuery.select('version');
        if (error) throw error;
        if (!updatedRows || updatedRows.length === 0) {
          throw new Error('This lineup was edited by another coach. Please go back and reopen it to get the latest version.');
        }
        setLineupVersion(updatedRows[0].version);

        // Delete old players and re-insert
        await supabase.from('lineup_players').delete().eq('lineup_id', targetLineupId);
      } else {
        const { error } = await supabase.from('lineups').insert(lineupRecord);
        if (error) throw error;
      }
      setActiveLineupId(lineupRecord.id);

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

      // If publishing, use atomic RPC to validate + set status
      if (status === 'published') {
        const { data: publishResult, error: publishError } = await supabase
          .rpc('publish_lineup', {
            p_lineup_id: lineupRecord.id,
            p_expected_version: lineupVersion,
          });
        if (publishError) throw publishError;
        if (!publishResult.success) {
          throw new Error(publishResult.error);
        }
        setLineupVersion(publishResult.version);
      }

      // Keep exactly one draft per team+event to avoid opening stale/empty duplicates.
      if (status === 'draft' && eventId) {
        const { data: duplicateDrafts } = await supabase
          .from('lineups')
          .select('id')
          .eq('team_id', teamId)
          .eq('event_id', eventId)
          .eq('status', 'draft')
          .neq('id', lineupRecord.id);

        const duplicateIds = (duplicateDrafts || []).map((row: any) => row.id);
        if (duplicateIds.length > 0) {
          await supabase.from('lineup_players').delete().in('lineup_id', duplicateIds);
          await supabase.from('lineups').delete().in('id', duplicateIds);
        }
      }

      setHasUnsavedChanges(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(
        'success',
        status === 'published' ? 'Lineup Published' : 'Draft Saved',
        lineupTitle,
      );
      if (status === 'published') {
        router.replace({
          pathname: '/team/lineup-view',
          params: { teamId, lineupId: lineupRecord.id },
        });
      } else {
        router.back();
      }
    } catch (err: any) {
      if (__DEV__) console.error('Error saving lineup:', err);
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
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
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

      {/* Action buttons - pinned at top */}
      <View style={styles.actionsWrapper}>
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
            onPress={handleClearLineup}
            style={styles.clearActionBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.red} />
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => handleSave('published')}
          disabled={saving}
          style={styles.publishBtn}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.publishBtnText}>Publish</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Formation Picker */}
        <Text style={styles.sectionLabel}>Formation</Text>
        <FormationPicker
          selected={formation}
          onSelect={(f) => {
            setFormation(f);
            setHasUnsavedChanges(true);
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
  actionsWrapper: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  draftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
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
  clearActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: UI.radius.xl,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    ...UI.shadow.soft,
  },
  clearBtnText: {
    fontSize: 15,
    fontFamily: UI.typography.semibold,
    color: Colors.red,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: UI.radius.xl,
    backgroundColor: '#34C759',
    ...UI.shadow.soft,
  },
  publishBtnText: {
    fontSize: 15,
    fontFamily: UI.typography.bold,
    color: '#fff',
  },
});
