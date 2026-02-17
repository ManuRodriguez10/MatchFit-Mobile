import React, { useEffect } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

interface LogoProps {
  variant: 'icon' | 'full';
  showTagline?: boolean;
}

export default function Logo({ variant, showTagline = true }: LogoProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const rotate = useSharedValue(-5);
  const breathe = useSharedValue(1);

  useEffect(() => {
    // Initial entrance animation
    opacity.value = withSpring(1, { damping: 15, stiffness: 100 });
    scale.value = withSpring(1, { damping: 15, stiffness: 100 });
    rotate.value = withSpring(0, { damping: 15, stiffness: 100 });

    // Subtle continuous breathing animation
    breathe.value = withRepeat(
      withSequence(
        withSpring(1.05, { damping: 15, stiffness: 50 }),
        withSpring(1, { damping: 15, stiffness: 50 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value * breathe.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const logoSource =
    variant === 'icon'
      ? require('@/assets/logo-icon.png')
      : require('@/assets/logo-full.png');

  const logoSize = variant === 'icon' ? { width: 80, height: 80 } : { width: 200, height: undefined };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, animatedStyle]}>
        <View style={styles.glowContainer}>
          <LinearGradient
            colors={['rgba(96, 165, 250, 0.3)', 'rgba(59, 130, 246, 0.05)']}
            style={styles.glow}
          />
          <Image
            source={logoSource}
            style={[styles.logo, logoSize]}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {showTagline && (
        <Animated.Text style={[styles.tagline, taglineAnimatedStyle]}>
          AI-Powered Team Management
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 12,
  },
  glowContainer: {
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -20,
    left: -20,
    zIndex: -1,
  },
  logo: {
    width: 80,
    height: 80,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
