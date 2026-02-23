import React from 'react';
import { View, ViewProps, StyleSheet, ViewStyle, StyleProp } from 'react-native';
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
    ...UI.shadow.card,
  },
  muted: {
    backgroundColor: Colors.surfaceMuted,
  },
  padded: {
    padding: UI.spacing.md,
  },
});
