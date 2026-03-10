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
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from '@/utils/reanimated-shim';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import { lookupTeamByInviteCode } from '@/lib/teamInvite';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import GradientText from '@/components/ui/GradientText';

export default function PlayerJoinTeamScreen() {
  const { user, signOut } = useAuth();
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
    if (cleaned.length !== 6) {
      setCodeError('Invite code must be exactly 6 characters');
      return false;
    }
    setCodeError('');
    return true;
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signOut();
  };

  const handleContinue = async () => {
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
        if (__DEV__) console.error('Invite code lookup failed:', lookup);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false);
        return;
      }

      const team = lookup.team;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Navigate to Step 2 with teamId and teamName as params
      router.push({
        pathname: '/(onboarding)/complete-profile',
        params: {
          teamId: team.id,
          teamName: team.name,
        },
      });
    } catch (error) {
      setGeneralError(
        error instanceof Error ? error.message : 'Failed to validate code. Please try again.'
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

          {/* Header with icon */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.headerSection}>
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.teamIconCircle}
            >
              <Ionicons name="football" size={32} color="#fff" />
            </LinearGradient>
            <GradientText
              text="Join Your Team"
              style={styles.title}
              colors={['#FFFFFF', '#D4EBFC']}
            />
            <Text style={styles.subtitle}>
              Enter the 6-character code from your coach to join the team
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
                  onSubmitEditing={handleContinue}
                />

                {/* Info note */}
                <View style={styles.infoNote}>
                  <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                  <Text style={styles.infoNoteText}>
                    Ask your coach for their 6-character team invite code
                  </Text>
                </View>

                <Button
                  title="Continue"
                  onPress={handleContinue}
                  loading={loading}
                  disabled={loading}
                  style={styles.continueButton}
                />
              </View>
            </BlurView>
          </Animated.View>

          {/* Step indicator - 2 dots for player onboarding */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={styles.stepDot} />
          </Animated.View>

          {/* Sign Out — subtle, at the bottom */}
          <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.logoutRow}>
            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.logoutButton}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={16} color="rgba(255,255,255,0.55)" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
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
  continueButton: {
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
  logoutRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: Colors.error,
    borderRadius: 14,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
});
