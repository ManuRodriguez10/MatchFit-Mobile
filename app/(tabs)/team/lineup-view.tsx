import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import { getFormation } from '@/constants/formations';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { TeamPlayerWithProfile, PlayerPosition } from '@/types/database';
import PitchView from '@/components/lineup/PitchView';
import { showToast } from '@/components/ui/Toast';
import GradientText from '@/components/ui/GradientText';

interface PlayerAssignment {
  playerId: string;
  playerName: string;
  jerseyNumber: number | null;
  positions?: PlayerPosition[];
}

export default function LineupViewScreen() {
  const params = useLocalSearchParams<{
    teamId?: string | string[];
    lineupId?: string | string[];
  }>();
  const teamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;
  const lineupId = Array.isArray(params.lineupId) ? params.lineupId[0] : params.lineupId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const isCoach = profile?.role === 'coach';

  const [formation, setFormation] = useState('4-3-3');
  const [title, setTitle] = useState('');
  const [assignments, setAssignments] = useState<Record<string, PlayerAssignment>>({});
  const [substitutes, setSubstitutes] = useState<PlayerAssignment[]>([]);
  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const [eventDetails, setEventDetails] = useState<{
    date: string | null;
    kickoff_time: string | null;
    opponent: string | null;
    event_type: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLineup();
  }, [teamId, lineupId]);

  const loadLineup = async () => {
    try {
      if (!teamId || !lineupId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      // Fetch lineup
      const { data: lineupData, error: lineupError } = await supabase
        .from('lineups')
        .select('*, events:event_id(title, opponent, event_type, date, kickoff_time, location)')
        .eq('id', lineupId)
        .single();

      if (lineupError) throw lineupError;

      if (lineupData) {
        setFormation(lineupData.formation || '4-3-3');
        setTitle(lineupData.title || '');

        // Set event info
        if (lineupData.events) {
          const event = lineupData.events;
          const eventName = event.title || (event.opponent ? `vs ${event.opponent}` : event.event_type);
          setEventTitle(eventName);
          setEventDetails({
            date: event.date || null,
            kickoff_time: event.kickoff_time || null,
            opponent: event.opponent || null,
            event_type: event.event_type || null,
          });
        }

        // Load lineup players
        const { data: lpData, error: lpError } = await supabase
          .from('lineup_players')
          .select('player_id, position_key, is_starter')
          .eq('lineup_id', lineupId)
          .limit(30);

        if (lpError) throw lpError;

        if (lpData) {
          // Fetch roster to get player details
          const { data: rosterData } = await supabase
            .from('team_players')
            .select('id, jersey_number, positions, player_id, profiles:player_id(id, full_name, email)')
            .eq('team_id', teamId)
            .limit(60);

          const rosterByProfileId = new Map(
            (rosterData || []).map((r: any) => [
              r.profiles.id,
              {
                id: r.id,
                jersey_number: r.jersey_number,
                positions: r.positions || [],
                profile: r.profiles,
              },
            ]),
          );

          // Get missing player profiles if needed
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

          const starterAssignments: Record<string, PlayerAssignment> = {};
          const subsList: PlayerAssignment[] = [];

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
    } catch (err) {
      if (__DEV__) console.error('Error loading lineup:', err);
      showToast('error', 'Failed to load lineup');
    } finally {
      setLoading(false);
    }
  };

  const handleEditLineup = () => {
    router.push({
      pathname: '/team/lineup-builder',
      params: { teamId, lineupId, eventId: '' },
    });
  };

  const formationData = getFormation(formation);

  // Check if the game date has passed
  const isGamePast = (() => {
    if (!eventDetails?.date) return false;
    const today = new Date().toISOString().slice(0, 10);
    return eventDetails.date < today;
  })();

  // Format helpers
  const formatEventDate = (dateStr: string) =>
    new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  const formatKickoffTime = (timeStr: string) => {
    const parsed = new Date(timeStr);
    if (Number.isNaN(parsed.getTime())) return timeStr;
    return parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
            text={title || 'Lineup'}
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (isCoach && !isGamePast ? 100 : 40) }]}
      >
        {/* Game Summary */}
        {eventDetails && (
          <View style={styles.gameSummary}>
            {eventDetails.opponent && (
              <View style={styles.summaryRow}>
                <Ionicons name="football-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.summaryText}>vs {eventDetails.opponent}</Text>
              </View>
            )}
            {eventDetails.date && (
              <View style={styles.summaryRow}>
                <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.summaryText}>{formatEventDate(eventDetails.date)}</Text>
              </View>
            )}
            {eventDetails.kickoff_time && (
              <View style={styles.summaryRow}>
                <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.summaryText}>{formatKickoffTime(eventDetails.kickoff_time)}</Text>
              </View>
            )}
            {isGamePast && (
              <View style={styles.pastBadge}>
                <Ionicons name="lock-closed-outline" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.pastBadgeText}>Game completed</Text>
              </View>
            )}
          </View>
        )}

        {/* Pitch */}
        <View style={styles.pitchContainer}>
          <PitchView
            positions={formationData.positions}
            players={pitchPlayers}
            readOnly={true}
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
        {substitutes.length > 0 && (
          <View style={styles.subsSection}>
            <View style={styles.subsHeader}>
              <Text style={styles.subsTitle}>Substitutes</Text>
            </View>

            {substitutes.map((sub, idx) => (
              <View
                key={`${sub.playerId}-${idx}`}
                style={styles.subRow}
              >
                <View style={styles.subAvatar}>
                  <Text style={styles.subAvatarText}>
                    {sub.jerseyNumber ?? '?'}
                  </Text>
                </View>
                <Text style={styles.subName}>{sub.playerName}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Coach-only Edit Button — hidden for past games */}
      {isCoach && !isGamePast && (
        <View style={[styles.editButtonWrapper, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            onPress={handleEditLineup}
            style={styles.editBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil" size={18} color="#fff" />
            <Text style={styles.editBtnText}>Edit Lineup</Text>
          </TouchableOpacity>
        </View>
      )}
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
  gameSummary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 14,
    marginHorizontal: 20,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: UI.typography.medium,
    color: 'rgba(255,255,255,0.9)',
  },
  pastBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 2,
  },
  pastBadgeText: {
    fontSize: 12,
    fontFamily: UI.typography.semibold,
    color: 'rgba(255,255,255,0.7)',
  },
  pitchContainer: {
    paddingHorizontal: 20,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    gap: 12,
  },
  countText: {
    flex: 1,
    fontSize: 13,
    fontFamily: UI.typography.medium,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  subsSection: {
    paddingHorizontal: 20,
    gap: 8,
  },
  subsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subsTitle: {
    fontSize: 13,
    fontFamily: UI.typography.semibold,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: UI.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  subAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subAvatarText: {
    fontSize: 12,
    fontFamily: UI.typography.bold,
    color: '#fff',
  },
  subName: {
    flex: 1,
    fontSize: 14,
    fontFamily: UI.typography.medium,
    color: '#fff',
  },
  editButtonWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  editBtn: {
    backgroundColor: Colors.primary,
    borderRadius: UI.radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editBtnText: {
    fontSize: 16,
    fontFamily: UI.typography.bold,
    color: '#fff',
  },
});
