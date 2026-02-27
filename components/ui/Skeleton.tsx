import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from '@/utils/reanimated-shim';
import { Colors } from '@/constants/colors';
import { UI } from '@/constants/ui';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = UI.radius.sm,
  style,
}: SkeletonProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
}

// Pre-built skeleton layouts
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={styles.cardLines}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={10} style={{ marginTop: 6 }} />
        </View>
      </View>
      <Skeleton width="100%" height={10} style={{ marginTop: 12 }} />
      <Skeleton width="80%" height={10} style={{ marginTop: 6 }} />
    </View>
  );
}

export function SkeletonStatCards() {
  return (
    <View style={styles.statRow}>
      <Skeleton height={90} borderRadius={UI.radius.lg} style={{ flex: 1 }} />
      <Skeleton height={90} borderRadius={UI.radius.lg} style={{ flex: 1 }} />
      <Skeleton height={90} borderRadius={UI.radius.lg} style={{ flex: 1 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.border,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: UI.radius.xl,
    padding: UI.spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardLines: {
    flex: 1,
    marginLeft: 12,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
