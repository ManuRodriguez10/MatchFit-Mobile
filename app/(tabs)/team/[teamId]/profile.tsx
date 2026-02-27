import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useGlobalSearchParams, router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import { PlayerPosition } from '@/types/database';
import GradientText from '@/components/ui/GradientText';

const POSITION_COLORS: Record<PlayerPosition, string> = {
  goalkeeper: '#EAB308',
  defender: '#118FF3',
  midfielder: '#10B981',
  forward: '#EF4444',
};
const POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: 'Goalkeeper',
  defender: 'Defender',
  midfielder: 'Midfielder',
  forward: 'Forward',
};
const POSITION_ICONS: Record<PlayerPosition, keyof typeof Ionicons.glyphMap> = {
  goalkeeper: 'hand-left-outline',
  defender: 'shield-outline',
  midfielder: 'flash-outline',
  forward: 'trending-up-outline',
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | null | undefined;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function TeamProfileScreen() {
  const { teamId } = useGlobalSearchParams<{ teamId: string }>();
  const { profile, user, signOut } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [teamRole, setTeamRole] = useState<string | null>(null);
  const [jerseyNumber, setJerseyNumber] = useState<number | null>(null);
  const [positions, setPositions] = useState<PlayerPosition[]>([]);

  const isCoach = profile?.role === 'coach';

  const loadTeamData = useCallback(async () => {
    if (!teamId || !user) return;

    if (isCoach) {
      const { data } = await supabase
        .from('team_coaches')
        .select('role')
        .eq('team_id', teamId)
        .eq('coach_id', user.id)
        .single();
      if (data) setTeamRole(data.role === 'head_coach' ? 'Head Coach' : 'Assistant Coach');
    } else {
      const { data } = await supabase
        .from('team_players')
        .select('jersey_number, positions')
        .eq('team_id', teamId)
        .eq('player_id', user.id)
        .single();
      if (data) {
        setJerseyNumber(data.jersey_number);
        setPositions(data.positions || []);
        setTeamRole('Player');
      }
    }
    setRefreshing(false);
  }, [teamId, user, isCoach]);

  useFocusEffect(useCallback(() => { loadTeamData(); }, [loadTeamData]));

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await signOut();
        },
      },
    ]);
  };

  const fullName = profile?.full_name || 'User';
  const initials = getInitials(fullName);
  const height = profile?.height_ft != null && profile?.height_in != null
    ? `${profile.height_ft}'${profile.height_in}"`
    : null;

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
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTeamData(); }} tintColor="#fff" />
        }
      >
        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
            style={styles.avatarOuter}
          >
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </LinearGradient>
          <GradientText
            text={fullName}
            style={styles.name}
            colors={['#FFFFFF', '#D4EBFC']}
          />
          {teamRole && (
            <Chip label={teamRole} tone={isCoach ? 'blue' : 'emerald'} />
          )}
          {!isCoach && positions.length > 0 && (
            <View style={styles.positionRow}>
              {positions.map(pos => (
                <View key={pos} style={[styles.posChip, { backgroundColor: POSITION_COLORS[pos] + '20' }]}>
                  <Ionicons name={POSITION_ICONS[pos]} size={14} color={POSITION_COLORS[pos]} />
                  <Text style={[styles.posChipText, { color: POSITION_COLORS[pos] }]}>
                    {POSITION_LABELS[pos]}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Profile Info Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>

          <InfoRow icon="mail-outline" label="Email" value={profile?.email} />
          <InfoRow icon="call-outline" label="Phone" value={profile?.phone} />
          <InfoRow icon="calendar-outline" label="Date of Birth" value={profile?.date_of_birth} />
          <InfoRow icon="flag-outline" label="Nationality" value={profile?.nationality} />
        </Card>

        {/* Player-specific stats */}
        {!isCoach && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Player Details</Text>

            <View style={styles.statsGrid}>
              {jerseyNumber != null && (
                <View style={styles.statBox}>
                  <LinearGradient colors={Gradients.primary as unknown as string[]} style={styles.statCircle}>
                    <Text style={styles.statCircleText}>{jerseyNumber}</Text>
                  </LinearGradient>
                  <Text style={styles.statLabel}>Jersey</Text>
                </View>
              )}
              {height && (
                <View style={styles.statBox}>
                  <View style={[styles.statCircle, { backgroundColor: Colors.emeraldSoft }]}>
                    <Text style={[styles.statCircleText, { color: Colors.emerald }]}>{height}</Text>
                  </View>
                  <Text style={styles.statLabel}>Height</Text>
                </View>
              )}
              {profile?.weight_lbs != null && (
                <View style={styles.statBox}>
                  <View style={[styles.statCircle, { backgroundColor: Colors.purpleSoft }]}>
                    <Text style={[styles.statCircleText, { color: Colors.purple }]}>{profile.weight_lbs}</Text>
                  </View>
                  <Text style={styles.statLabel}>Weight (lbs)</Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={Colors.red} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
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
    paddingTop: 100, paddingHorizontal: 20, paddingBottom: 120, gap: 16,
  },

  // Avatar section
  avatarSection: { alignItems: 'center', gap: 10, marginBottom: 8 },
  avatarOuter: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInner: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 28, color: Colors.primary, fontFamily: UI.typography.bold },
  name: { fontSize: 24, color: '#fff', fontFamily: UI.typography.bold },
  positionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  posChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: UI.radius.pill,
  },
  posChipText: { fontSize: 12, fontFamily: UI.typography.bold },

  // Cards
  card: { borderRadius: 20, padding: 18, gap: 2 },
  cardTitle: {
    fontSize: 17, color: Colors.textPrimary, fontFamily: UI.typography.bold, marginBottom: 8,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderSoft,
  },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: Colors.blueSoft, alignItems: 'center', justifyContent: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: Colors.textMuted, fontFamily: UI.typography.medium },
  infoValue: { fontSize: 15, color: Colors.textPrimary, fontFamily: UI.typography.semibold, marginTop: 1 },

  // Stats grid
  statsGrid: { flexDirection: 'row', gap: 16, justifyContent: 'center', paddingVertical: 8 },
  statBox: { alignItems: 'center', gap: 6 },
  statCircle: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  statCircleText: { fontSize: 18, color: '#fff', fontFamily: UI.typography.bold },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontFamily: UI.typography.medium },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: UI.radius.xl,
    backgroundColor: Colors.redSoft, borderWidth: 1, borderColor: '#FECACA',
  },
  signOutText: { fontSize: 15, color: Colors.red, fontFamily: UI.typography.semibold },
});
