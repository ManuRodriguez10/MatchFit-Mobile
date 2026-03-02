import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import Card from '@/components/ui/Card';
import { showToast } from '@/components/ui/Toast';

export default function DeleteTeamScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ teamId?: string; teamName?: string }>();
  const teamId = (params.teamId ?? '').toString();
  const paramTeamName = (params.teamName ?? '').toString();

  const [teamName, setTeamName] = useState(paramTeamName);
  const [confirmValue, setConfirmValue] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [isHeadCoach, setIsHeadCoach] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    (async () => {
      const { data } = await supabase
        .from('teams')
        .select('name, created_by')
        .eq('id', teamId)
        .single();
      if (data) {
        if (!teamName) setTeamName(data.name);
        setIsHeadCoach(data.created_by === user?.id);
      }
      setCheckingAccess(false);
    })();
  }, [teamId, teamName, user]);

  const handleDeleteTeam = () => {
    if (!teamId) {
      showToast('error', 'Missing team ID');
      return;
    }
    if (confirmValue !== teamName) {
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
              setDeleting(true);

              const { data: lineupRows } = await supabase
                .from('lineups')
                .select('id')
                .eq('team_id', teamId);
              const lineupIds = (lineupRows ?? []).map((row: { id: string }) => row.id);

              if (lineupIds.length > 0) {
                await supabase.from('lineup_players').delete().in('lineup_id', lineupIds);
              }
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
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (checkingAccess) {
    return (
      <LinearGradient colors={Gradients.primary as unknown as string[]} style={styles.gradient}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </LinearGradient>
    );
  }

  if (!isHeadCoach) {
    return (
      <LinearGradient colors={Gradients.primary as unknown as string[]} style={styles.gradient}>
        <View style={styles.centerState}>
          <Ionicons name="lock-closed-outline" size={48} color="rgba(255,255,255,0.65)" />
          <Text style={styles.centerText}>Only the head coach can delete a team.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>Back</Text>
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

      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Delete Team</Text>
            <View style={styles.iconBtnGhost} />
          </View>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Final Confirmation</Text>
            <Text style={styles.warningText}>
              This will permanently remove all team data, including events, lineups, and player associations.
            </Text>

            <Text style={styles.label}>Type "{teamName}" to confirm</Text>
            <TextInput
              style={styles.input}
              value={confirmValue}
              onChangeText={setConfirmValue}
              placeholder={teamName}
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleting}
            />

            <TouchableOpacity
              onPress={handleDeleteTeam}
              style={[styles.deleteBtn, (confirmValue !== teamName || deleting) && styles.deleteBtnDisabled]}
              activeOpacity={0.8}
              disabled={confirmValue !== teamName || deleting}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={styles.deleteBtnText}>{deleting ? 'Deleting...' : 'Delete Team'}</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </KeyboardAvoidingView>
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
  keyboard: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 100,
    paddingBottom: 40,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnGhost: { width: 40, height: 40 },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 28,
    fontFamily: UI.typography.bold,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 18,
    gap: 12,
  },
  cardTitle: {
    color: Colors.red,
    fontSize: 20,
    fontFamily: UI.typography.bold,
  },
  warningText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: UI.typography.regular,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: UI.typography.medium,
  },
  input: {
    height: 46,
    borderRadius: UI.radius.lg,
    backgroundColor: Colors.redSoft,
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: UI.typography.medium,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: UI.radius.lg,
    backgroundColor: Colors.red,
  },
  deleteBtnDisabled: { opacity: 0.4 },
  deleteBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: UI.typography.bold,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  centerText: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontSize: 15,
    fontFamily: UI.typography.medium,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: UI.typography.semibold,
  },
});
