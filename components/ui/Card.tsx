import React from 'react';
import { View, ViewProps, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { UI } from '@/constants/ui';

interface CardProps extends ViewProps {
  padded?: boolean;
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function Card({
  children,
  padded = true,
  muted = false,
  style,
  ...props
}: CardProps) {
  return (
    <View
      {...props}
      style={[
        styles.base,
        muted && styles.muted,
        padded && styles.padded,
        style,
      ]}
    >
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.78)', 'rgba(212,235,252,0.22)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.overlay}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    borderRadius: UI.radius.xl,
    overflow: 'hidden',
    ...UI.shadow.card,
  },
  muted: {
    backgroundColor: Colors.surfaceMuted,
  },
  padded: {
    padding: UI.spacing.md,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
