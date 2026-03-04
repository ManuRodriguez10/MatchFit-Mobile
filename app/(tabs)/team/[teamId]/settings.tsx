import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Share,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
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
import { CoachInviteRole } from '@/types/database';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length));
  }
  return code;
}

function daysUntil(isoDate: string): number {
  const now = new Date();
  const exp = new Date(isoDate);
  return Math.max(0, Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

interface ActiveCoachInvite {
  id: string;
  code: string;
  expires_at: string;
  invited_role: CoachInviteRole;
}

export default function TeamSettingsScreen() {
  const { teamId } = useGlobalSearchParams<{ teamId: string }>();
  const { user, profile } = useAuth();
  const isCoach = profile?.role === 'coach';

  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isHeadCoach, setIsHeadCoach] = useState(false);

  // Coach invite state
  const [coachInvite, setCoachInvite] = useState<ActiveCoachInvite | null>(null);
  const [coachInviteRole, setCoachInviteRole] = useState<CoachInviteRole>('assistant_coach');
  const [generatingCode, setGeneratingCode] = useState(false);

  // Coach management state
  const [coaches, setCoaches] = useState<{ id: string; coach_id: string; role: string; name: string }[]>([]);

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

    // Always start with no active coach invite — coach must generate a fresh one each session
    setCoachInvite(null);

    // Load all coaches on this team
    const { data: coachData } = await supabase
      .from('team_coaches')
      .select('id, coach_id, role, profile:profiles!team_coaches_coach_id_fkey(full_name)')
      .eq('team_id', teamId);

    if (coachData) {
      setCoaches((coachData as any[]).map(c => ({
        id: c.id,
        coach_id: c.coach_id,
        role: c.role,
        name: c.profile?.full_name || 'Unknown',
      })));
    }

    setRefreshing(false);
  }, [teamId, user]);

  useFocusEffect(useCallback(() => {
    loadTeam();
    return () => {
      // Void any unused coach invite when leaving the page
      if (teamId) {
        supabase
          .from('coach_invites')
          .update({ used: true })
          .eq('team_id', teamId)
          .eq('used', false)
          .then(() => {});
      }
      setCoachInvite(null);
    };
  }, [loadTeam, teamId]));

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
        message: `Join ${teamName} on MatchFit! Use player invite code: ${inviteCode}`,
      });
    } catch {}
  };

  const handleGenerateCoachCode = async () => {
    if (!teamId || !user) return;
    setGeneratingCode(true);
    try {
      // Void all existing unused codes for this team
      await supabase
        .from('coach_invites')
        .update({ used: true })
        .eq('team_id', teamId)
        .eq('used', false);

      const code = generateCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from('coach_invites')
        .insert({
          team_id: teamId,
          code,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
          used: false,
          invited_role: coachInviteRole,
        })
        .select('id, code, expires_at, invited_role')
        .single();

      if (error) throw error;

      setCoachInvite(data as ActiveCoachInvite);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('success', 'Coach invite code generated');
    } catch {
      showToast('error', 'Failed to generate code');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleCopyCoachCode = async () => {
    if (!coachInvite) return;
    try {
      await Share.share({ message: coachInvite.code });
    } catch {}
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleShareCoachCode = async () => {
    if (!coachInvite) return;
    const roleLabel = coachInvite.invited_role === 'head_coach' ? 'Head Coach' : 'Assistant Coach';
    try {
      await Share.share({
        message: `Join ${teamName} on MatchFit as ${roleLabel}! Use coach invite code: ${coachInvite.code} (expires in ${daysUntil(coachInvite.expires_at)} days)`,
      });
    } catch {}
  };

  const handleTransferOwnership = (targetCoach: { id: string; coach_id: string; name: string }) => {
    Alert.alert(
      'Transfer Ownership',
      `Make ${targetCoach.name} the new head coach? You will become an assistant coach.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          style: 'destructive',
          onPress: async () => {
            try {
              // Demote current head coach to assistant
              await supabase
                .from('team_coaches')
                .update({ role: 'assistant_coach' })
                .eq('team_id', teamId)
                .eq('coach_id', user!.id);

              // Promote target to head coach
              await supabase
                .from('team_coaches')
                .update({ role: 'head_coach' })
                .eq('id', targetCoach.id);

              // Update teams.created_by
              await supabase
                .from('teams')
                .update({ created_by: targetCoach.coach_id })
                .eq('id', teamId);

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showToast('success', `${targetCoach.name} is now head coach`);
              setIsHeadCoach(false);
              loadTeam();
            } catch {
              showToast('error', 'Failed to transfer ownership');
            }
          },
        },
      ]
    );
  };

  const handleRemoveCoach = (coach: { id: string; name: string }) => {
    Alert.alert(
      'Remove Coach',
      `Remove ${coach.name} from the coaching staff?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('team_coaches').delete().eq('id', coach.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showToast('success', `${coach.name} removed`);
              loadTeam();
            } catch {
              showToast('error', 'Failed to remove coach');
            }
          },
        },
      ]
    );
  };

  // Player notification state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [eventReminders, setEventReminders] = useState(true);
  const [lineupNotifications, setLineupNotifications] = useState(true);
  const renderInlineToggle = (value: boolean, onToggle: (next: boolean) => void) => (
    <TouchableOpacity
      onPress={() => onToggle(!value)}
      activeOpacity={0.8}
      style={[styles.inlineToggleTrack, value && styles.inlineToggleTrackActive]}
    >
      <View style={[styles.inlineToggleThumb, value && styles.inlineToggleThumbActive]} />
    </TouchableOpacity>
  );

  if (!isCoach) {
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
        >
          <GradientText
            text="Settings"
            style={styles.title}
            colors={['#FFFFFF', '#D4EBFC']}
          />
          <Text style={styles.subtitle}>Preferences and support</Text>

          {/* Notification Preferences */}
          <View style={styles.playerCard}>
            <Text style={styles.playerSectionTitle}>Notification Preferences</Text>

            <View style={styles.playerRow}>
              <View style={styles.playerRowMain}>
                <View style={[styles.playerIconWrap, { backgroundColor: Colors.blueSoft }]}>
                  <Ionicons name="notifications-outline" size={16} color={Colors.primary} />
                </View>
                <Text style={styles.playerRowText}>Push Notifications</Text>
              </View>
              <View style={styles.playerSwitchWrap}>
                {renderInlineToggle(pushEnabled, setPushEnabled)}
              </View>
            </View>

            <View style={styles.playerRow}>
              <View style={styles.playerRowMain}>
                <View style={[styles.playerIconWrap, { backgroundColor: Colors.amberSoft }]}>
                  <Ionicons name="alarm-outline" size={16} color={Colors.amber} />
                </View>
                <Text style={styles.playerRowText}>Event Reminders</Text>
              </View>
              <View style={styles.playerSwitchWrap}>
                {renderInlineToggle(eventReminders, setEventReminders)}
              </View>
            </View>

            <View style={[styles.playerRow, { borderBottomWidth: 0 }]}>
              <View style={styles.playerRowMain}>
                <View style={[styles.playerIconWrap, { backgroundColor: Colors.emeraldSoft }]}>
                  <Ionicons name="clipboard-outline" size={16} color={Colors.emerald} />
                </View>
                <Text style={styles.playerRowText}>Lineup Published</Text>
              </View>
              <View style={styles.playerSwitchWrap}>
                {renderInlineToggle(lineupNotifications, setLineupNotifications)}
              </View>
            </View>
          </View>

          {/* Help & Support */}
          <Card style={styles.card}>
            <Text style={styles.playerSectionTitle}>Help & Support</Text>

            <TouchableOpacity
              style={styles.playerRow}
              activeOpacity={0.7}
              onPress={() => Linking.openURL('https://matchfit.app/faq')}
            >
              <View style={[styles.playerIconWrap, { backgroundColor: Colors.emeraldSoft }]}>
                <Ionicons name="help-circle-outline" size={16} color={Colors.emerald} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.playerRowLabel}>FAQ</Text>
                <Text style={styles.playerRowText}>Frequently Asked Questions</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.playerRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.playerIconWrap, { backgroundColor: Colors.purpleSoft }]}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.playerRowLabel}>App Version</Text>
                <Text style={styles.playerRowText}>1.0.0</Text>
              </View>
            </View>
          </Card>
        </ScrollView>
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

        {/* Invite Coaches */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: Colors.purpleSoft }]}>
              <Ionicons name="shield-outline" size={18} color={Colors.purple} />
            </View>
            <GradientText
              text="Invite Coaches"
              style={styles.cardTitle}
              colors={['#118FF3', '#0C5798']}
            />
          </View>

          {isHeadCoach ? (
            <>
              {coachInvite ? (
                // Active code display
                <View style={styles.coachInviteActive}>
                  <View style={styles.coachRoleBadge}>
                    <Text style={styles.coachRoleBadgeText}>
                      Invited as: {coachInvite.invited_role === 'head_coach' ? 'Head Coach' : 'Assistant Coach'}
                    </Text>
                  </View>

                  <TouchableOpacity onPress={handleCopyCoachCode} style={styles.codeDisplay} activeOpacity={0.7}>
                    <Text style={styles.codeText}>{coachInvite.code}</Text>
                    <Ionicons name="copy-outline" size={18} color={Colors.primary} />
                  </TouchableOpacity>

                  <Text style={styles.coachCodeExpiry}>
                    Expires in {daysUntil(coachInvite.expires_at)} days — One-time use only
                  </Text>

                  <TouchableOpacity onPress={handleShareCoachCode} style={styles.shareBtn} activeOpacity={0.8}>
                    <Ionicons name="share-social-outline" size={18} color={Colors.primary} />
                    <Text style={styles.shareBtnText}>Share Coach Code</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleGenerateCoachCode}
                    style={styles.regenerateBtn}
                    activeOpacity={0.8}
                    disabled={generatingCode}
                  >
                    {generatingCode ? (
                      <ActivityIndicator size="small" color={Colors.textSecondary} />
                    ) : (
                      <>
                        <Ionicons name="refresh-outline" size={16} color={Colors.textSecondary} />
                        <Text style={styles.regenerateBtnText}>Generate New Code</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                // No active code — generate one
                <View style={styles.coachInviteEmpty}>
                  <Text style={styles.fieldLabel}>Select the role for the invited coach</Text>

                  <View style={styles.rolePicker}>
                    <TouchableOpacity
                      style={[
                        styles.roleOption,
                        coachInviteRole === 'assistant_coach' && styles.roleOptionActive,
                      ]}
                      onPress={() => setCoachInviteRole('assistant_coach')}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={coachInviteRole === 'assistant_coach' ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={coachInviteRole === 'assistant_coach' ? Colors.primary : Colors.textMuted}
                      />
                      <Text style={[
                        styles.roleOptionText,
                        coachInviteRole === 'assistant_coach' && styles.roleOptionTextActive,
                      ]}>
                        Assistant Coach
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.roleOption,
                        coachInviteRole === 'head_coach' && styles.roleOptionActive,
                      ]}
                      onPress={() => setCoachInviteRole('head_coach')}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={coachInviteRole === 'head_coach' ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={coachInviteRole === 'head_coach' ? Colors.primary : Colors.textMuted}
                      />
                      <Text style={[
                        styles.roleOptionText,
                        coachInviteRole === 'head_coach' && styles.roleOptionTextActive,
                      ]}>
                        Head Coach
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={handleGenerateCoachCode}
                    style={styles.generateBtn}
                    activeOpacity={0.8}
                    disabled={generatingCode}
                  >
                    {generatingCode ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="key-outline" size={16} color="#fff" />
                        <Text style={styles.generateBtnText}>Generate One-Time Code</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            // Non-head-coach locked state
            <View style={styles.lockedState}>
              <Ionicons name="lock-closed-outline" size={24} color={Colors.textMuted} />
              <Text style={styles.lockedText}>
                Only the head coach can generate coach invite codes.
              </Text>
            </View>
          )}
        </Card>

        {/* Manage Coaches */}
        {isHeadCoach && coaches.length > 1 && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: Colors.blueSoft }]}>
                <Ionicons name="people-circle-outline" size={18} color={Colors.primary} />
              </View>
              <GradientText
                text="Manage Coaches"
                style={styles.cardTitle}
                colors={['#118FF3', '#0C5798']}
              />
            </View>

            {coaches
              .filter(c => c.coach_id !== user?.id)
              .map(coach => (
                <View key={coach.id} style={styles.coachRow}>
                  <View style={styles.coachRowLeft}>
                    <View style={styles.coachInitialsCircle}>
                      <Text style={styles.coachInitialsText}>
                        {coach.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.coachRowName} numberOfLines={1}>{coach.name}</Text>
                      <Text style={styles.coachRowRole}>
                        {coach.role === 'head_coach' ? 'Head Coach' : 'Assistant Coach'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.coachRowActions}>
                    <TouchableOpacity
                      onPress={() => handleTransferOwnership(coach)}
                      style={styles.coachActionBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="swap-horizontal-outline" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveCoach(coach)}
                      style={styles.coachActionBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="person-remove-outline" size={16} color={Colors.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
          </Card>
        )}

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

            <TouchableOpacity
              onPress={() => router.push({ pathname: '/team/delete-team', params: { teamId, teamName } })}
              style={styles.deleteBtn}
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

  // Coach invite
  coachInviteActive: { gap: 10 },
  coachInviteEmpty: { gap: 12 },
  coachRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.emeraldSoft,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: UI.radius.pill,
  },
  coachRoleBadgeText: {
    fontSize: 12, color: Colors.emerald, fontFamily: UI.typography.bold,
  },
  coachCodeExpiry: {
    fontSize: 12, color: Colors.textMuted, fontFamily: UI.typography.medium, textAlign: 'center',
  },
  rolePicker: { gap: 8 },
  roleOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: UI.radius.lg,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  roleOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.blueSoft,
  },
  roleOptionText: {
    fontSize: 15, color: Colors.textSecondary, fontFamily: UI.typography.medium,
  },
  roleOptionTextActive: {
    color: Colors.primary, fontFamily: UI.typography.bold,
  },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: UI.radius.lg,
    backgroundColor: Colors.primary,
  },
  generateBtnText: { color: '#fff', fontSize: 14, fontFamily: UI.typography.bold },
  regenerateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: UI.radius.lg,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1, borderColor: Colors.borderSoft,
  },
  regenerateBtnText: { fontSize: 13, color: Colors.textSecondary, fontFamily: UI.typography.medium },
  lockedState: {
    alignItems: 'center', gap: 8, paddingVertical: 16,
  },
  lockedText: {
    fontSize: 13, color: Colors.textMuted, fontFamily: UI.typography.medium, textAlign: 'center',
  },

  // Manage coaches
  coachRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderSoft,
  },
  coachRowLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1,
  },
  coachInitialsCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.blueSoft, alignItems: 'center', justifyContent: 'center',
  },
  coachInitialsText: {
    fontSize: 13, fontFamily: UI.typography.bold, color: Colors.primary,
  },
  coachRowName: {
    fontSize: 15, fontFamily: UI.typography.semibold, color: Colors.textPrimary,
  },
  coachRowRole: {
    fontSize: 12, fontFamily: UI.typography.medium, color: Colors.textMuted,
  },
  coachRowActions: {
    flexDirection: 'row', gap: 8,
  },
  coachActionBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.borderSoft,
  },

  // Player settings
  playerCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    borderRadius: 20,
    padding: 18,
    gap: 2,
    overflow: 'hidden',
  },
  playerSectionTitle: {
    fontSize: 17, color: Colors.textPrimary, fontFamily: UI.typography.bold, marginBottom: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingRight: 84,
    position: 'relative',
    borderBottomWidth: 1, borderBottomColor: Colors.borderSoft,
  },
  playerRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  playerIconWrap: {
    width: 34, height: 34, borderRadius: 11, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  playerRowText: {
    fontSize: 15, color: Colors.textPrimary, fontFamily: UI.typography.semibold, marginTop: 1,
  },
  playerSwitchWrap: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    width: 54,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  inlineToggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.borderSoft,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  inlineToggleTrackActive: {
    backgroundColor: Colors.emeraldSoft,
    borderColor: '#A7F3D0',
  },
  inlineToggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  inlineToggleThumbActive: {
    alignSelf: 'flex-end',
    borderColor: '#6EE7B7',
  },
  playerRowLabel: {
    fontSize: 12, color: Colors.textMuted, fontFamily: UI.typography.medium,
  },

  // Danger zone
  dangerCard: { borderWidth: 1, borderColor: '#FECACA' },
  dangerText: { fontSize: 13, color: Colors.textSecondary, fontFamily: UI.typography.regular, lineHeight: 19 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: UI.radius.lg,
    backgroundColor: Colors.red,
  },
  deleteBtnText: { color: '#fff', fontSize: 14, fontFamily: UI.typography.bold },
});
