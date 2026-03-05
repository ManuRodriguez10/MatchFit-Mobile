import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import { TeamPlayerWithProfile, PlayerPosition } from '@/types/database';

interface PlayerSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlayer: (playerId: string) => void;
  players: TeamPlayerWithProfile[];
  assignedPlayerIds: Set<string>;
  positionLabel: string;
}

const positionColors: Record<PlayerPosition, string> = {
  goalkeeper: '#EAB308',
  defender: '#8B5CF6',
  midfielder: '#10B981',
  forward: '#EF4444',
};

const positionLabels: Record<PlayerPosition, string> = {
  goalkeeper: 'GK',
  defender: 'DEF',
  midfielder: 'MID',
  forward: 'FWD',
};

export default function PlayerSelector({
  visible,
  onClose,
  onSelectPlayer,
  players,
  assignedPlayerIds,
  positionLabel,
}: PlayerSelectorProps) {
  const [search, setSearch] = useState('');

  const filtered = players.filter(p => {
    if (search) {
      return p.profile.full_name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  // Sort: unassigned first, then by name
  const sorted = [...filtered].sort((a, b) => {
    const aAssigned = assignedPlayerIds.has(a.profile.id);
    const bAssigned = assignedPlayerIds.has(b.profile.id);
    if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;
    return a.profile.full_name.localeCompare(b.profile.full_name);
  });

  const renderPlayer = ({ item }: { item: TeamPlayerWithProfile }) => {
    const isAssigned = assignedPlayerIds.has(item.profile.id);
    const initials = item.profile.full_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onSelectPlayer(item.profile.id);
        }}
        disabled={isAssigned}
        activeOpacity={0.7}
        style={[styles.playerRow, isAssigned && styles.playerRowDisabled]}
      >
        <LinearGradient
          colors={Gradients.primary as unknown as string[]}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>

        <View style={styles.playerInfo}>
          <Text style={[styles.playerName, isAssigned && styles.playerNameDisabled]}>
            {item.profile.full_name}
          </Text>
          <View style={styles.playerMeta}>
            {item.jersey_number != null && (
              <Text style={styles.jerseyBadge}>#{item.jersey_number}</Text>
            )}
            {item.positions?.map(pos => (
              <View
                key={pos}
                style={[styles.posChip, { backgroundColor: positionColors[pos] + '20' }]}
              >
                <Text style={[styles.posChipText, { color: positionColors[pos] }]}>
                  {positionLabels[pos]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {isAssigned ? (
          <Ionicons name="checkmark-circle" size={22} color={Colors.emerald} />
        ) : (
          <Ionicons name="add-circle-outline" size={22} color={Colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Select Player</Text>
              <Text style={styles.subtitle}>Assigning to {positionLabel}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search players..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>

          <FlatList
            data={sorted}
            keyExtractor={item => item.profile.id}
            renderItem={renderPlayer}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No players found</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.backdrop,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: UI.typography.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: UI.typography.medium,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 14,
    height: 44,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: UI.radius.lg,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: UI.typography.medium,
    color: Colors.textPrimary,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSoft,
  },
  playerRowDisabled: {
    opacity: 0.5,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontFamily: UI.typography.bold,
    color: '#fff',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerName: {
    fontSize: 15,
    fontFamily: UI.typography.semibold,
    color: Colors.textPrimary,
  },
  playerNameDisabled: {
    color: Colors.textMuted,
  },
  playerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  jerseyBadge: {
    fontSize: 12,
    fontFamily: UI.typography.bold,
    color: Colors.textSecondary,
  },
  posChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  posChipText: {
    fontSize: 10,
    fontFamily: UI.typography.bold,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: UI.typography.medium,
    color: Colors.textMuted,
  },
});
