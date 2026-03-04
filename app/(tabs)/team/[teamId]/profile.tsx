import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Switch,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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

interface EditableInfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  editing: boolean;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
}

function EditableInfoRow({ icon, label, value, editing, onChangeText, placeholder, keyboardType = 'default' }: EditableInfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        {editing ? (
          <TextInput
            style={styles.infoInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder ?? label}
            placeholderTextColor={Colors.textMuted}
            keyboardType={keyboardType}
          />
        ) : (
          <Text style={styles.infoValue}>{value || '—'}</Text>
        )}
      </View>
    </View>
  );
}

export default function TeamProfileScreen() {
  const { teamId } = useGlobalSearchParams<{ teamId: string }>();
  const { profile, user, signOut, refreshProfile } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [teamRole, setTeamRole] = useState<string | null>(null);
  const [jerseyNumber, setJerseyNumber] = useState<number | null>(null);
  const [positions, setPositions] = useState<PlayerPosition[]>([]);

  const isCoach = profile?.role === 'coach';
  const [pushEnabled, setPushEnabled] = useState(false);
  const [eventReminders, setEventReminders] = useState(true);
  const [lineupNotifications, setLineupNotifications] = useState(true);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields — personal info (profiles table)
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editNationality, setEditNationality] = useState('');

  // Editable fields — player details (team_players + profiles table)
  const [editJersey, setEditJersey] = useState('');
  const [editHeightFt, setEditHeightFt] = useState('');
  const [editHeightIn, setEditHeightIn] = useState('');
  const [editWeight, setEditWeight] = useState('');

  const syncFormFromProfile = useCallback(() => {
    if (!profile) return;
    setEditFullName(profile.full_name || '');
    setEditPhone(profile.phone || '');
    setEditDob(profile.date_of_birth || '');
    setEditNationality(profile.nationality || '');
    setEditHeightFt(profile.height_ft != null ? String(profile.height_ft) : '');
    setEditHeightIn(profile.height_in != null ? String(profile.height_in) : '');
    setEditWeight(profile.weight_lbs != null ? String(profile.weight_lbs) : '');
  }, [profile]);

  const loadTeamData = useCallback(async () => {
    if (!teamId || !user) return;

    syncFormFromProfile();

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
        setEditJersey(data.jersey_number != null ? String(data.jersey_number) : '');
        setPositions(data.positions || []);
        setTeamRole('Player');
      }
    }
    setRefreshing(false);
  }, [teamId, user, isCoach, syncFormFromProfile]);

  useFocusEffect(useCallback(() => { loadTeamData(); }, [loadTeamData]));

  const handleEdit = () => {
    syncFormFromProfile();
    setEditJersey(jerseyNumber != null ? String(jerseyNumber) : '');
    setEditing(true);
  };

  const handleCancel = () => {
    syncFormFromProfile();
    setEditJersey(jerseyNumber != null ? String(jerseyNumber) : '');
    setEditing(false);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!editFullName.trim()) {
      Alert.alert('Validation', 'Full name is required.');
      return;
    }

    setSaving(true);

    try {
      // Parse numeric fields
      const heightFt = editHeightFt ? parseInt(editHeightFt, 10) : null;
      const heightIn = editHeightIn ? parseInt(editHeightIn, 10) : null;
      const weightLbs = editWeight ? parseInt(editWeight, 10) : null;
      const nameParts = editFullName.trim().split(' ').filter(Boolean);

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editFullName.trim(),
          first_name: nameParts[0] || null,
          last_name: nameParts.length > 1 ? nameParts.slice(1).join(' ') : null,
          phone: editPhone.trim() || null,
          date_of_birth: editDob.trim() || null,
          nationality: editNationality.trim() || null,
          height_ft: heightFt,
          height_in: heightIn,
          weight_lbs: weightLbs,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update jersey number on team_players (player only)
      if (!isCoach && teamId) {
        const jerseyNum = editJersey ? parseInt(editJersey, 10) : null;
        const { error: teamError } = await supabase
          .from('team_players')
          .update({ jersey_number: jerseyNum })
          .eq('team_id', teamId)
          .eq('player_id', user.id);

        if (teamError) throw teamError;
        setJerseyNumber(jerseyNum);
      }

      // Refresh the auth context profile
      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err?.message || '';
      if (msg.includes('Network request failed')) {
        Alert.alert('No Connection', 'Please check your internet connection and try again.');
      } else {
        Alert.alert('Save Failed', msg || 'Could not update profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

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
  const initials = getInitials(editing ? editFullName || fullName : fullName);
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
              text={editing ? editFullName || fullName : fullName}
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

            {/* Edit / Save / Cancel buttons */}
            {!editing ? (
              <TouchableOpacity style={styles.editToggleBtn} onPress={handleEdit} activeOpacity={0.8}>
                <Ionicons name="create-outline" size={16} color="#fff" />
                <Text style={styles.editToggleBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  activeOpacity={0.8}
                  disabled={saving}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Profile Info Card */}
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Personal Information</Text>

            <EditableInfoRow
              icon="person-outline"
              label="Full Name"
              value={editing ? editFullName : fullName}
              editing={editing}
              onChangeText={setEditFullName}
              placeholder="Full name"
            />
            <EditableInfoRow
              icon="mail-outline"
              label="Email"
              value={profile?.email || ''}
              editing={false}
              onChangeText={() => {}}
            />
            <EditableInfoRow
              icon="call-outline"
              label="Phone"
              value={editing ? editPhone : (profile?.phone || '')}
              editing={editing}
              onChangeText={setEditPhone}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />
            <EditableInfoRow
              icon="calendar-outline"
              label="Date of Birth"
              value={editing ? editDob : (profile?.date_of_birth || '')}
              editing={editing}
              onChangeText={setEditDob}
              placeholder="YYYY-MM-DD"
            />
            <EditableInfoRow
              icon="flag-outline"
              label="Nationality"
              value={editing ? editNationality : (profile?.nationality || '')}
              editing={editing}
              onChangeText={setEditNationality}
              placeholder="Nationality"
            />
          </Card>

          {/* Player-specific stats */}
          {!isCoach && (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Player Details</Text>

              {editing ? (
                <View style={styles.editGrid}>
                  <View style={styles.editField}>
                    <Text style={styles.editFieldLabel}>Jersey #</Text>
                    <TextInput
                      style={styles.editFieldInput}
                      value={editJersey}
                      onChangeText={setEditJersey}
                      placeholder="—"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editFieldLabel}>Height (ft)</Text>
                    <TextInput
                      style={styles.editFieldInput}
                      value={editHeightFt}
                      onChangeText={setEditHeightFt}
                      placeholder="—"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      maxLength={1}
                    />
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editFieldLabel}>Height (in)</Text>
                    <TextInput
                      style={styles.editFieldInput}
                      value={editHeightIn}
                      onChangeText={setEditHeightIn}
                      placeholder="—"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editFieldLabel}>Weight (lbs)</Text>
                    <TextInput
                      style={styles.editFieldInput}
                      value={editWeight}
                      onChangeText={setEditWeight}
                      placeholder="—"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                </View>
              ) : (
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
                  {jerseyNumber == null && !height && profile?.weight_lbs == null && (
                    <Text style={styles.emptyText}>No player details added yet.</Text>
                  )}
                </View>
              )}
            </Card>
          )}

          {/* Notification Preferences (coach only — players see these in Settings) */}
          {isCoach && (
            <Card padded={false} style={[styles.card, styles.notifCard]}>
              <Text style={styles.cardTitle}>Notification Preferences</Text>

              <View style={styles.infoRow}>
                <View style={[styles.infoIconWrap, { backgroundColor: Colors.blueSoft }]}>
                  <Ionicons name="notifications-outline" size={16} color={Colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoValue}>Push Notifications</Text>
                </View>
                <Switch
                  style={{ flexShrink: 0, transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                  value={pushEnabled}
                  onValueChange={setPushEnabled}
                  trackColor={{ false: Colors.borderSoft, true: Colors.emeraldSoft }}
                  thumbColor={pushEnabled ? Colors.emerald : Colors.textMuted}
                  ios_backgroundColor={Colors.borderSoft}
                />
              </View>

              <View style={styles.infoRow}>
                <View style={[styles.infoIconWrap, { backgroundColor: Colors.amberSoft }]}>
                  <Ionicons name="alarm-outline" size={16} color={Colors.amber} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoValue}>Event Reminders</Text>
                </View>
                <Switch
                  style={{ flexShrink: 0, transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                  value={eventReminders}
                  onValueChange={setEventReminders}
                  trackColor={{ false: Colors.borderSoft, true: Colors.emeraldSoft }}
                  thumbColor={eventReminders ? Colors.emerald : Colors.textMuted}
                  ios_backgroundColor={Colors.borderSoft}
                />
              </View>

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <View style={[styles.infoIconWrap, { backgroundColor: Colors.emeraldSoft }]}>
                  <Ionicons name="clipboard-outline" size={16} color={Colors.emerald} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoValue}>Lineup Published</Text>
                </View>
                <Switch
                  style={{ flexShrink: 0, transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                  value={lineupNotifications}
                  onValueChange={setLineupNotifications}
                  trackColor={{ false: Colors.borderSoft, true: Colors.emeraldSoft }}
                  thumbColor={lineupNotifications ? Colors.emerald : Colors.textMuted}
                  ios_backgroundColor={Colors.borderSoft}
                />
              </View>
            </Card>
          )}

          {/* Help & Support (coach only — players see this in Settings) */}
          {isCoach && (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Help & Support</Text>

              <TouchableOpacity
                style={styles.infoRow}
                activeOpacity={0.7}
                onPress={() => Linking.openURL('https://matchfit.app/faq')}
              >
                <View style={[styles.infoIconWrap, { backgroundColor: Colors.emeraldSoft }]}>
                  <Ionicons name="help-circle-outline" size={16} color={Colors.emerald} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>FAQ</Text>
                  <Text style={styles.infoValue}>Frequently Asked Questions</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <View style={[styles.infoIconWrap, { backgroundColor: Colors.purpleSoft }]}>
                  <Ionicons name="information-circle-outline" size={16} color={Colors.purple} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>App Version</Text>
                  <Text style={styles.infoValue}>1.0.0</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Sign Out */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={Colors.red} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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

  // Edit / Save / Cancel buttons
  editToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: UI.radius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16, paddingVertical: 9,
  },
  editToggleBtnText: {
    color: '#fff', fontSize: 14, fontFamily: UI.typography.semibold,
  },
  editActions: {
    flexDirection: 'row', gap: 10, marginTop: 4,
  },
  cancelBtn: {
    borderRadius: UI.radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 18, paddingVertical: 9,
  },
  cancelBtnText: {
    color: '#fff', fontSize: 14, fontFamily: UI.typography.semibold,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: UI.radius.lg, backgroundColor: Colors.emerald,
    paddingHorizontal: 18, paddingVertical: 9,
  },
  saveBtnText: {
    color: '#fff', fontSize: 14, fontFamily: UI.typography.bold,
  },

  // Cards
  card: { borderRadius: 20, padding: 18, gap: 2 },
  notifCard: { padding: 14, gap: 2 },
  cardTitle: {
    fontSize: 17, color: Colors.textPrimary, fontFamily: UI.typography.bold, marginBottom: 8,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderSoft,
  },
  infoIconWrap: {
    width: 34, height: 34, borderRadius: 11, flexShrink: 0,
    backgroundColor: Colors.blueSoft, alignItems: 'center', justifyContent: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: Colors.textMuted, fontFamily: UI.typography.medium },
  infoValue: { fontSize: 15, color: Colors.textPrimary, fontFamily: UI.typography.semibold, marginTop: 1 },
  infoInput: {
    fontSize: 15, color: Colors.textPrimary, fontFamily: UI.typography.semibold,
    marginTop: 1, paddingVertical: 2, paddingHorizontal: 0,
    borderBottomWidth: 1, borderBottomColor: Colors.primary,
  },

  // Stats grid (read-only mode)
  statsGrid: { flexDirection: 'row', gap: 16, justifyContent: 'center', paddingVertical: 8 },
  statBox: { alignItems: 'center', gap: 6 },
  statCircle: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  statCircleText: { fontSize: 18, color: '#fff', fontFamily: UI.typography.bold },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontFamily: UI.typography.medium },

  // Edit grid (player details)
  editGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 4,
  },
  editField: {
    width: '46%',
    gap: 4,
  },
  editFieldLabel: {
    fontSize: 12, color: Colors.textMuted, fontFamily: UI.typography.medium,
  },
  editFieldInput: {
    fontSize: 16, color: Colors.textPrimary, fontFamily: UI.typography.semibold,
    borderWidth: 1, borderColor: Colors.border, borderRadius: UI.radius.lg,
    backgroundColor: Colors.surfaceMuted, paddingHorizontal: 12, paddingVertical: 10,
  },

  // Empty text
  emptyText: {
    color: Colors.textSecondary, fontSize: 14, fontFamily: UI.typography.medium, textAlign: 'center',
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: UI.radius.xl,
    backgroundColor: Colors.redSoft, borderWidth: 1, borderColor: '#FECACA',
  },
  signOutText: { fontSize: 15, color: Colors.red, fontFamily: UI.typography.semibold },
});
