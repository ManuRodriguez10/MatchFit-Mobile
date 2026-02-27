import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { UI } from '@/constants/ui';
import { FORMATIONS } from '@/constants/formations';

interface FormationPickerProps {
  selected: string;
  onSelect: (formationId: string) => void;
}

export default function FormationPicker({ selected, onSelect }: FormationPickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {FORMATIONS.map(f => {
        const isActive = f.id === selected;
        return (
          <TouchableOpacity
            key={f.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(f.id);
            }}
            activeOpacity={0.7}
            style={[styles.pill, isActive && styles.pillActive]}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {f.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 4,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: UI.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pillActive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.surface,
  },
  pillText: {
    fontSize: 14,
    fontFamily: UI.typography.semibold,
    color: 'rgba(255,255,255,0.8)',
  },
  pillTextActive: {
    color: Colors.primary,
  },
});
