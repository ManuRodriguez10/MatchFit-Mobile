import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Share,
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
import { showToast } from '@/components/ui/Toast';
import GradientText from '@/components/ui/GradientText';

export default function TeamSettingsScreen() {
  const { teamId } = useGlobalSearchParams<{ teamId: string }>();
  const { user, profile } = useAuth();
  const isCoach = profile?.role === 'coach';

  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isHeadCoach, setIsHeadCoach] = useState(false);

  const loadTeam = useCallback(async () => {
    if (!teamId) return;
    const { data } = await supabase
      .from('teams')
      .select('name, invite_code, created_by')
      .eq('id', teamId)
      .single();
    if (data) {
      setTeamName(data.name);
      setInviteCode(data.invite_code);
      setIsHeadCoach(data.created_by === user?.id);
    }
    setRefreshing(false);
  }, [teamId, user]);

  useFocusEffect(useCallback(() => { loadTeam(); }, [loadTeam]));

  const handleSaveTeamName = async () => {
    if (!teamName.trim()) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('teams')
        .update({ name: teamName.trim() })
        .eq('id', teamId);
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('success', 'Team name updated');
    } catch {
      showToast('error', 'Failed to update team name');
    } finally {
      setSaving(false);
    }
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join ${teamName} on MatchFit! Use invite code: ${inviteCode}`,
      });
    } catch {}
  };

  const handleDeleteTeam = () => {
    if (deleteConfirm !== teamName) {
      Alert.alert('Confirmation Required', `Type "${teamName}" to confirm deletion.`);
      return;
    }

    Alert.alert(
      'Delete Team',
      'This action cannot be undone. All team data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete related data first
              await supabase.from('lineup_players').delete().in(
                'lineup_id',
                (await supabase.from('lineups').select('id').eq('team_id', teamId)).data?.map((l: any) => l.id) || []
              );
              await supabase.from('lineups').delete().eq('team_id', teamId);
              await supabase.from('events').delete().eq('team_id', teamId);
              await supabase.from('team_players').delete().eq('team_id', teamId);
              await supabase.from('team_coaches').delete().eq('team_id', teamId);
              await supabase.from('teams').delete().eq('id', teamId);

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              showToast('success', 'Team deleted');
              router.replace('/(tabs)/team');
            } catch {
              showToast('error', 'Failed to delete team');
            }
          },
        },
      ],
    );
  };

  if (!isCoach) {
    return (
      <LinearGradient colors={Gradients.primary as unknown as string[]} style={styles.gradient}>
        <View style={styles.centerState}>
          <Ionicons name="lock-closed-outline" size={48} color="rgba(255,255,255,0.6)" />
          <Text style={styles.centerText}>Only coaches can access team settings.</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTeam(); }} tintColor="#fff" />
        }
      >
        <GradientText
          text="Team Settings"
          style={styles.title}
          colors={['#FFFFFF', '#D4EBFC']}
        />
        <Text style={styles.subtitle}>Manage your team configuration</Text>

        {/* Team Information */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: Colors.blueSoft }]}>
              <Ionicons name="football-outline" size={18} color={Colors.primary} />
            </View>
            <GradientText
              text="Team Information"
              style={styles.cardTitle}
              colors={['#118FF3', '#0C5798']}
            />
          </View>

          <Text style={styles.fieldLabel}>Team Name</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={teamName}
              onChangeText={setTeamName}
              placeholder="Team name"
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity
              onPress={handleSaveTeamName}
              disabled={saving}
              style={styles.saveBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Invite Players */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: Colors.emeraldSoft }]}>
              <Ionicons name="people-outline" size={18} color={Colors.emerald} />
            </View>
            <GradientText
              text="Invite Players"
              style={styles.cardTitle}
              colors={['#118FF3', '#0C5798']}
            />
          </View>

          <Text style={styles.fieldLabel}>Share this code with players to join your team</Text>

          <TouchableOpacity onPress={handleShareCode} style={styles.codeDisplay} activeOpacity={0.7}>
            <Text style={styles.codeText}>{inviteCode}</Text>
            <Ionicons name="copy-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShareCode} style={styles.shareBtn} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={18} color={Colors.primary} />
            <Text style={styles.shareBtnText}>Share Invite Code</Text>
          </TouchableOpacity>
        </Card>

        {/* Danger Zone */}
        {isHeadCoach && (
          <Card style={[styles.card, styles.dangerCard]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: Colors.redSoft }]}>
                <Ionicons name="warning-outline" size={18} color={Colors.red} />
              </View>
              <Text style={[styles.cardTitle, { color: Colors.red }]}>Danger Zone</Text>
            </View>

            <Text style={styles.dangerText}>
              Deleting this team will permanently remove all team data, including events, lineups, and player associations.
            </Text>

            <Text style={styles.fieldLabel}>Type "{teamName}" to confirm</Text>
            <TextInput
              style={[styles.input, styles.dangerInput]}
              value={deleteConfirm}
              onChangeText={setDeleteConfirm}
              placeholder={teamName}
              placeholderTextColor={Colors.textMuted}
            />

            <TouchableOpacity
              onPress={handleDeleteTeam}
              style={[styles.deleteBtn, deleteConfirm !== teamName && styles.deleteBtnDisabled]}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={styles.deleteBtnText}>Delete Team</Text>
            </TouchableOpacity>
          </Card>
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
  centerState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40,
  },
  centerText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, textAlign: 'center', fontFamily: UI.typography.medium },
  content: {
    paddingTop: 120, paddingHorizontal: 20, paddingBottom: 120, gap: 16,
  },
  title: {
    color: '#fff', fontSize: 32, fontFamily: UI.typography.bold, letterSpacing: -0.4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)', fontSize: 15, fontFamily: UI.typography.medium,
  },

  // Cards
  card: { borderRadius: 20, padding: 18, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 17, color: Colors.textPrimary, fontFamily: UI.typography.bold },
  fieldLabel: { fontSize: 13, color: Colors.textSecondary, fontFamily: UI.typography.medium },

  // Input
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, height: 44, borderRadius: UI.radius.lg,
    backgroundColor: Colors.surfaceMuted, paddingHorizontal: 14,
    fontSize: 15, fontFamily: UI.typography.medium, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.borderSoft,
  },
  saveBtn: {
    height: 44, paddingHorizontal: 20, borderRadius: UI.radius.lg,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontFamily: UI.typography.bold },

  // Code display
  codeDisplay: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: UI.radius.lg,
    borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
  },
  codeText: {
    fontSize: 28, color: Colors.primary, letterSpacing: 4, fontFamily: UI.typography.bold,
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: UI.radius.lg,
    borderWidth: 1, borderColor: Colors.primary,
    backgroundColor: Colors.blueSoft,
  },
  shareBtnText: { fontSize: 14, color: Colors.primary, fontFamily: UI.typography.semibold },

  // Danger zone
  dangerCard: { borderWidth: 1, borderColor: '#FECACA' },
  dangerText: { fontSize: 13, color: Colors.textSecondary, fontFamily: UI.typography.regular, lineHeight: 19 },
  dangerInput: {
    borderColor: '#FECACA', backgroundColor: Colors.redSoft,
  },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: UI.radius.lg,
    backgroundColor: Colors.red,
  },
  deleteBtnDisabled: { opacity: 0.4 },
  deleteBtnText: { color: '#fff', fontSize: 14, fontFamily: UI.typography.bold },
});
