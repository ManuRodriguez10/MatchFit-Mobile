import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients } from '@/constants/colors';
import { CoachRole } from '@/types/database';

interface TeamCardProps {
  teamId: string;
  teamName: string;
  memberCount: number;
  userRole: CoachRole | 'player';
  inviteCode?: string;
  onPress: () => void;
}

const ROLE_LABELS: Record<CoachRole | 'player', string> = {
  head_coach: 'Head Coach',
  assistant_coach: 'Asst. Coach',
  player: 'Player',
};

const ROLE_COLORS: Record<CoachRole | 'player', string> = {
  head_coach: 'rgba(59, 130, 246, 0.12)',
  assistant_coach: 'rgba(96, 165, 250, 0.12)',
  player: 'rgba(16, 185, 129, 0.12)',
};

const ROLE_TEXT_COLORS: Record<CoachRole | 'player', string> = {
  head_coach: Colors.primary,
  assistant_coach: Colors.primaryLight,
  player: Colors.success,
};

export default function TeamCard({
  teamName,
  memberCount,
  userRole,
  inviteCode,
  onPress,
}: TeamCardProps) {
  const isCoach = userRole === 'head_coach' || userRole === 'assistant_coach';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Gradient shield icon */}
      <LinearGradient
        colors={Gradients.primary as unknown as string[]}
        style={styles.iconCircle}
      >
        <Ionicons name="shield" size={22} color="#fff" />
      </LinearGradient>

      {/* Team info */}
      <View style={styles.info}>
        <Text style={styles.teamName} numberOfLines={1}>{teamName}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.metaText}>
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </Text>
        </View>
        {isCoach && inviteCode ? (
          <View style={styles.metaRow}>
            <Ionicons name="key-outline" size={13} color={Colors.primary} />
            <Text style={styles.codeText}>{inviteCode}</Text>
          </View>
        ) : null}
      </View>

      {/* Role badge + chevron */}
      <View style={styles.right}>
        <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[userRole] }]}>
          <Text style={[styles.roleText, { color: ROLE_TEXT_COLORS[userRole] }]}>
            {ROLE_LABELS[userRole]}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  codeText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    letterSpacing: 1,
  },
  right: {
    alignItems: 'flex-end',
    gap: 6,
  },
  roleBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
