import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { UI } from '@/constants/ui';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: number | string;
  label: string;
  gradient: readonly [string, string, ...string[]];
}

export default function StatCard({ icon, value, label, gradient }: StatCardProps) {
  return (
    <LinearGradient
      colors={gradient as unknown as string[]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={18} color="rgba(255,255,255,0.85)" />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: UI.radius.lg,
    padding: 14,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  value: {
    fontSize: 28,
    fontFamily: UI.typography.bold,
    color: '#FFFFFF',
    marginTop: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: UI.typography.medium,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
});
