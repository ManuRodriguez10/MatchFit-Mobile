import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from '@/utils/reanimated-shim';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ButtonProps {
  onPress: () => void;
  title: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  onPress,
  title,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  textStyle,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isDisabled = disabled || loading;

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator color={Colors.textOnDark} size="small" />
      ) : (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </>
  );

  if (variant === 'primary') {
    return (
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[animatedStyle, styles.container, style]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isDisabled ? ['#9CA3AF', '#6B7280'] : ['#118FF3', '#0C5798']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.gradientButton,
            isDisabled && { opacity: 0.5 },
          ]}
        >
          {renderContent()}
        </LinearGradient>
      </AnimatedTouchable>
    );
  }

  // Secondary and outline variants
  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        animatedStyle,
        styles.container,
        variant === 'secondary' && styles.secondaryContainer,
        variant === 'outline' && styles.outlineContainer,
        style,
      ]}
      activeOpacity={0.8}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.5)', 'rgba(212,235,252,0.2)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.surfaceOverlay}
      />
      {renderContent()}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: UI.radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    ...UI.shadow.soft,
  },
  gradientButton: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  text: {
    color: Colors.textOnDark,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
    letterSpacing: 0.1,
  },
  secondaryContainer: {
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  outlineContainer: {
    borderWidth: 0,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  surfaceOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
