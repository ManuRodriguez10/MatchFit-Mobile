import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from '@/utils/reanimated-shim';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { lookupTeamByInviteCode } from '@/lib/teamInvite';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import GradientText from '@/components/ui/GradientText';

export default function JoinTeamScreen() {
  const { user } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinedTeamName, setJoinedTeamName] = useState<string | null>(null);

  const validate = () => {
    const cleaned = inviteCode.trim().toUpperCase();
    if (!cleaned) {
      setCodeError('Invite code is required');
      return false;
    }
    if (cleaned.length < 6) {
      setCodeError('Invite code must be 6 characters');
      return false;
    }
    setCodeError('');
    return true;
  };

  const handleJoin = async () => {
    if (!validate()) return;

    setLoading(true);
    setGeneralError('');

    try {
      const cleanedCode = inviteCode.trim().toUpperCase();
      const now = new Date().toISOString();

      // 1. Check coach_invites first (one-time coach codes)
      const { data: coachInvite } = await supabase
        .from('coach_invites')
        .select('id, team_id, invited_role')
        .eq('code', cleanedCode)
        .eq('used', false)
        .gt('expires_at', now)
        .limit(1)
        .maybeSingle();

      if (coachInvite) {
        const { data: existingCoach } = await supabase
          .from('team_coaches')
          .select('id')
          .eq('team_id', coachInvite.team_id)
          .eq('coach_id', user!.id)
          .maybeSingle();

        if (existingCoach) {
          setGeneralError("You're already a coach on this team.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }

        const coachRole = coachInvite.invited_role === 'head_coach' ? 'head_coach' : 'assistant_coach';

        const { error: joinError } = await supabase
          .from('team_coaches')
          .insert({
            team_id: coachInvite.team_id,
            coach_id: user!.id,
            role: coachRole,
          });

        if (joinError) throw joinError;

        // Mark invite as used
        await supabase
          .from('coach_invites')
          .update({ used: true })
          .eq('id', coachInvite.id);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Fetch team name for success state
        const { data: teamData } = await supabase
          .from('teams')
          .select('name')
          .eq('id', coachInvite.team_id)
          .single();

        setJoinedTeamName(teamData?.name ?? 'your new team');
        return;
      }

      // 2. Fall back to team player invite code
      const lookup = await lookupTeamByInviteCode(inviteCode);
      if (!lookup.ok) {
        if (lookup.reason === 'invalid_code') {
          setCodeError('Invalid code. Please check and try again.');
        } else {
          setGeneralError(lookup.message ?? 'Unable to validate team code. Please try again.');
        }
        if (__DEV__) console.error('Invite code lookup failed:', lookup);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      const team = lookup.team;

      // Check if already a member of this team
      const { data: existing } = await supabase
        .from('team_players')
        .select('id')
        .eq('team_id', team.id)
        .eq('player_id', user!.id)
        .single();

      if (existing) {
        setGeneralError("You're already on this team.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Navigate to team setup screen to collect jersey + position
      router.replace({
        pathname: '/team/team-setup',
        params: {
          teamId: team.id,
          teamName: team.name,
        },
      });
    } catch (error) {
      setGeneralError(
        error instanceof Error ? error.message : 'Failed to join team. Please try again.'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // ── Success State ─────────────────────────────────────────
  if (joinedTeamName) {
    return (
      <View style={styles.container}>
        <View style={styles.handle} />

        <Animated.View entering={FadeIn.duration(400)} style={styles.successContainer}>
          <View style={styles.successIconWrapper}>
            <LinearGradient
              colors={Gradients.success as unknown as string[]}
              style={styles.successIconGradient}
            >
              <Ionicons name="checkmark" size={44} color="#fff" />
            </LinearGradient>
          </View>

          <Text style={styles.successTitle}>You're In!</Text>
          <Text style={styles.successSubtitle}>
            You've successfully joined
          </Text>

          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.teamNameCard}>
            <Ionicons name="shield" size={20} color={Colors.primary} />
            <Text style={styles.teamNameText}>{joinedTeamName}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.doneContainer}>
            <Button title="View Team" onPress={() => router.back()} />
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  // ── Form State ────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.handle} />

        {/* Header row */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <GradientText
            text="Join Team"
            style={styles.headerTitle}
            colors={['#118FF3', '#0C5798']}
          />
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Icon + subtitle */}
        <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.iconSection}>
          <LinearGradient
            colors={Gradients.primary as unknown as string[]}
            style={styles.teamIcon}
          >
            <Ionicons name="people" size={36} color="#fff" />
          </LinearGradient>
          <Text style={styles.subtitle}>Enter the 6-character code from your coach</Text>
        </Animated.View>

        {/* General error */}
        {generalError ? (
          <Animated.View entering={FadeIn.duration(300)} style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
            <Text style={styles.errorBannerText}>{generalError}</Text>
          </Animated.View>
        ) : null}

        {/* Invite Code Input */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Input
            label="Invite Code"
            icon="key-outline"
            value={inviteCode}
            onChangeText={(text) => {
              const upper = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
              setInviteCode(upper);
              if (codeError) setCodeError('');
              if (generalError) setGeneralError('');
            }}
            error={codeError}
            editable={!loading}
            containerStyle={styles.inputContainer}
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleJoin}
          />
        </Animated.View>

        {/* Info note */}
        <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
          <Text style={styles.infoNoteText}>
            Ask your coach for their team invite code
          </Text>
        </Animated.View>

        {/* Join Button */}
        <Animated.View entering={FadeInDown.delay(350).springify()}>
          <Button
            title="Join Team"
            onPress={handleJoin}
            loading={loading}
            disabled={loading}
            style={styles.joinButton}
          />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },

  // ── Form ──────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSpacer: {
    width: 36,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  teamIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 12,
    marginTop: 4,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary,
    lineHeight: 17,
  },
  joinButton: {
    marginTop: 4,
  },

  // ── Success ───────────────────────────────────────────────
  successContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconWrapper: {
    marginBottom: 20,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  successIconGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  teamNameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 28,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  teamNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  doneContainer: {
    width: '100%',
  },
});
