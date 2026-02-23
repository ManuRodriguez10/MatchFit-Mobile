import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { Colors } from '@/constants/colors';
import { UI } from '@/constants/ui';

interface ChipProps {
  label: string;
  tone?: 'default' | 'primary' | 'lavender' | 'mint' | 'cream';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const toneStyles = {
  default: {
    bg: Colors.surfaceMuted,
    border: Colors.borderSoft,
    text: Colors.textSecondary,
  },
  primary: {
    bg: Colors.primarySoft,
    border: '#C7DAFF',
    text: Colors.primary,
  },
  lavender: {
    bg: '#F1ECFF',
    border: '#DDD2FF',
    text: '#6D28D9',
  },
  mint: {
    bg: '#EAFBF3',
    border: '#BBF7D0',
    text: '#15803D',
  },
  cream: {
    bg: '#FFF8E1',
    border: '#FDE68A',
    text: '#A16207',
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
