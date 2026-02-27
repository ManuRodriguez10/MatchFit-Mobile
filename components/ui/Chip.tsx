import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { Colors } from '@/constants/colors';
import { UI } from '@/constants/ui';

interface ChipProps {
  label: string;
  tone?: keyof typeof toneStyles;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const toneStyles = {
  default: {
    bg: Colors.surfaceMuted,
    border: Colors.border,
    text: Colors.textSecondary,
  },
  primary: {
    bg: Colors.blueSoft,
    border: '#93C5FD',
    text: Colors.blue,
  },
  lavender: {
    bg: Colors.purpleSoft,
    border: '#C4B5FD',
    text: Colors.purple,
  },
  mint: {
    bg: Colors.emeraldSoft,
    border: '#6EE7B7',
    text: '#059669',
  },
  cream: {
    bg: Colors.amberSoft,
    border: '#FDE68A',
    text: Colors.amber,
  },
  red: {
    bg: Colors.redSoft,
    border: '#FECACA',
    text: Colors.red,
  },
  emerald: {
    bg: Colors.emeraldSoft,
    border: '#6EE7B7',
    text: Colors.emerald,
  },
  amber: {
    bg: Colors.amberSoft,
    border: '#FDE68A',
    text: Colors.amber,
  },
  blue: {
    bg: Colors.blueSoft,
    border: '#93C5FD',
    text: Colors.blue,
  },
} as const;

export default function Chip({ label, tone = 'default', style, textStyle }: ChipProps) {
  const toneStyle = toneStyles[tone];
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: toneStyle.bg, borderColor: toneStyle.border },
        style,
      ]}
    >
      <Text style={[styles.text, { color: toneStyle.text }, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: UI.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
  },
});
