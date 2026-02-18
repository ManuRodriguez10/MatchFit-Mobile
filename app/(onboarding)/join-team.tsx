import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { lookupTeamByInviteCode } from '@/lib/teamInvite';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function OnboardingJoinTeamScreen() {
  const { user, completeOnboarding } = useAuth();
  const [inviteCode, setInviteCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

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
      const lookup = await lookupTeamByInviteCode(inviteCode);
      if (!lookup.ok) {
        if (lookup.reason === 'invalid_code') {
          setCodeError('Invalid code. Please check and try again.');
        } else {
          setGeneralError(lookup.message ?? 'Unable to validate team code. Please try again.');
        }
        console.error('Invite code lookup failed:', lookup);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      const team = lookup.team;

      // Check if already a member of this team
      const { data: existingCoach } = await supabase
        .from('team_coaches')
        .select('id')
        .eq('team_id', team.id)
        .eq('coach_id', user!.id)
        .single();

      if (existingCoach) {
        setGeneralError("You're already a coach on this team.");
        return;
      }

      // Join as assistant coach
      const { error: joinError } = await supabase
        .from('team_coaches')
        .insert({
          team_id: team.id,
          coach_id: user!.id,
          role: 'assistant_coach',
        });

      if (joinError) throw joinError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Mark onboarding complete — assistant coaches skip the invite code step
      await completeOnboarding();
      // Root layout will auto-redirect to /(tabs) once profile updates
    } catch (error) {
      setGeneralError(
        error instanceof Error ? error.message : 'Failed to join team. Please try again.'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Animated.View entering={FadeIn.duration(400)} style={styles.backRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </Animated.View>

          {/* Header with icon */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.headerSection}>
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.teamIconCircle}
            >
              <Ionicons name="people" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>Join a Team</Text>
            <Text style={styles.subtitle}>
              Enter the 6-character code shared by a head coach to join as assistant coach
            </Text>
          </Animated.View>

          {/* Form card */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.cardContainer}>
            <BlurView intensity={40} tint="light" style={styles.blurContainer}>
              <View style={styles.card}>
                {/* MatchFit Icon inside card */}
                <View style={styles.cardIconRow}>
                  <Image
                    source={require('../../assets/logo-icon.png')}
                    style={styles.cardIconImg}
                    resizeMode="contain"
                  />
                </View>

                {/* General error */}
                {generalError ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                    <Text style={styles.errorBannerText}>{generalError}</Text>
                  </View>
                ) : null}

                <Input
                  label="Team Invite Code"
                  icon="key-outline"
                  value={inviteCode}
                  onChangeText={(text) => {
                    // Auto-uppercase and limit to 6 chars
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

                {/* Info note */}
                <View style={styles.infoNote}>
                  <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                  <Text style={styles.infoNoteText}>
                    Ask the head coach of the team for their invite code
                  </Text>
                </View>

                <Button
                  title="Join Team"
                  onPress={handleJoin}
                  loading={loading}
                  disabled={loading}
                  style={styles.joinButton}
                />
              </View>
            </BlurView>
          </Animated.View>

          {/* Step indicator */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.stepIndicator}>
            <View style={styles.stepDot} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={styles.stepDot} />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  decorCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: -80,
    right: -60,
  },
  decorCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    bottom: 60,
    left: -40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  backRow: {
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  teamIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardIconRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconImg: {
    width: 40,
    height: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  cardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 24,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    padding: 24,
    borderRadius: 24,
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
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  stepDotActive: {
    backgroundColor: '#fff',
    width: 20,
    borderRadius: 4,
  },
});
