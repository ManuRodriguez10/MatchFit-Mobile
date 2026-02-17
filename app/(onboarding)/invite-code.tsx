import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
  Clipboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import Button from '@/components/ui/Button';

export default function OnboardingInviteCodeScreen() {
  const { inviteCode, teamName } = useLocalSearchParams<{
    inviteCode: string;
    teamName: string;
  }>();
  const { completeOnboarding } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    if (!inviteCode) return;
    Clipboard.setString(inviteCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `Join ${teamName ?? 'my team'} on MatchFit! Use invite code: ${inviteCode}`,
      });
    } catch {
      // User dismissed share sheet
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await completeOnboarding();
      // Root layout will automatically redirect to /(tabs) once profile updates
    } catch {
      // If it fails, still navigate forward — user can re-do onboarding later
      router.replace('/(tabs)');
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

      <View style={styles.container}>
        {/* Success icon */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.successIconWrap}>
          <LinearGradient
            colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
            style={styles.successIconCircle}
          >
            <Ionicons name="checkmark-circle" size={48} color="#fff" />
          </LinearGradient>
        </Animated.View>

        {/* Heading */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.headingSection}>
          <Text style={styles.title}>Team Created! 🎉</Text>
          <Text style={styles.subtitle}>
            Share this code with your players so they can join{teamName ? ` ${teamName}` : ' your team'}
          </Text>
        </Animated.View>

        {/* Invite code card */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.cardContainer}>
          <BlurView intensity={40} tint="light" style={styles.blurContainer}>
            <View style={styles.card}>

              {/* Code display */}
              <TouchableOpacity
                style={styles.codeCard}
                onPress={handleCopy}
                activeOpacity={0.85}
              >
                <Text style={styles.codeLabel}>PLAYER INVITE CODE</Text>
                <Text style={styles.codeText}>{inviteCode}</Text>
                <View style={styles.copyHintRow}>
                  <Ionicons
                    name={copied ? 'checkmark-circle' : 'copy-outline'}
                    size={14}
                    color={copied ? Colors.success : Colors.textSecondary}
                  />
                  <Text style={[styles.codeTapHint, copied && styles.codeCopied]}>
                    {copied ? 'Copied!' : 'Tap to copy'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Share button */}
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShare}
                activeOpacity={0.85}
              >
                <Ionicons name="share-social-outline" size={18} color={Colors.primary} />
                <Text style={styles.shareButtonText}>Share Code</Text>
              </TouchableOpacity>

              {/* Info note */}
              <View style={styles.infoNote}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                <Text style={styles.infoNoteText}>
                  To invite other coaches, use Team Settings once you're inside the app.
                </Text>
              </View>
            </View>
          </BlurView>
        </Animated.View>

        {/* Let's Go button */}
        <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.finishContainer}>
          <Button
            title="Let's Go! →"
            onPress={handleFinish}
            loading={loading}
            disabled={loading}
          />
        </Animated.View>

        {/* Step indicator */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.stepIndicator}>
          <View style={styles.stepDot} />
          <View style={styles.stepDot} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
        </Animated.View>
      </View>
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
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  successIconWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
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
    marginBottom: 20,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
  },

  // ── Invite Code Display ───────────────────────────────────
  codeCard: {
    width: '100%',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: 14,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  codeText: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 8,
    marginBottom: 10,
  },
  copyHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  codeTapHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  codeCopied: {
    color: Colors.success,
    fontStyle: 'normal',
    fontWeight: '600',
  },

  // ── Share Button ──────────────────────────────────────────
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },

  // ── Info note ─────────────────────────────────────────────
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    width: '100%',
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary,
    lineHeight: 17,
  },

  // ── Finish ────────────────────────────────────────────────
  finishContainer: {
    marginBottom: 24,
  },

  // ── Step indicator ────────────────────────────────────────
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
