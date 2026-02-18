import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';

export default function OnboardingWelcomeScreen() {
  const { profile, signOut } = useAuth();

  // Extract first name from full name
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Coach';

  const handleCreateTeam = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(onboarding)/create-team');
  };

  const handleJoinTeam = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(onboarding)/join-team');
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signOut();
    // Root layout will redirect to /(auth)/login automatically
  };

  return (
    <LinearGradient
      colors={Gradients.primary as unknown as string[]}
      style={styles.gradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
    >
      {/* Background decorative circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <View style={styles.container}>
        {/* Full logo in white pill — pops off blue gradient */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.logoSection}>
          <View style={styles.logoWhiteWrap}>
            <Image
              source={require('../../assets/logo-full.png')}
              style={styles.logoFull}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Welcome heading */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.headingSection}>
          <Text style={styles.welcomeText}>Welcome, Coach 👋</Text>
          <Text style={styles.subText}>Let's get you set up</Text>
        </Animated.View>

        {/* Choice card */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.cardContainer}>
          <BlurView intensity={40} tint="light" style={styles.blurContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>What would you like to do?</Text>

              {/* Option A: Create a New Team */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={handleCreateTeam}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={Gradients.primary as unknown as string[]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.optionGradient}
                >
                  <View style={styles.optionIconWrap}>
                    <Ionicons name="shield-checkmark" size={28} color="#fff" />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>Create a New Team</Text>
                    <Text style={styles.optionDesc}>
                      Start fresh and invite players with a unique code
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Option B: Join an Existing Team — same blue gradient as Option A */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={handleJoinTeam}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={Gradients.primary as unknown as string[]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.optionGradient}
                >
                  <View style={styles.optionIconWrap}>
                    <Ionicons name="people" size={28} color="#fff" />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>Join an Existing Team</Text>
                    <Text style={styles.optionDesc}>
                      Enter a code from a head coach to join as assistant coach
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>

        {/* Step indicator */}
        <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={styles.stepDot} />
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

  // ── Logo ─────────────────────────────────────────────────
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoWhiteWrap: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  logoFull: {
    width: 180,
    height: 52,
  },

  // ── Heading ───────────────────────────────────────────────
  headingSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
  },

  // ── Choice card ───────────────────────────────────────────
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  cardIconRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconImg: {
    width: 40,
    height: 40,
  },

  // ── Option buttons (shared between both) ──────────────────
  optionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  optionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16,
  },

  // ── Divider ────────────────────────────────────────────────
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
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

  // ── Sign Out ──────────────────────────────────────────────
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
