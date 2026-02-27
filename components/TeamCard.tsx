import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import { CoachRole } from '@/types/database';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';

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
  const memberLabel = `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.82}>
      <Card
        style={styles.card}
      >
        <View style={styles.topRow}>
          <LinearGradient
            colors={Gradients.primary as unknown as string[]}
            style={styles.iconCircle}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="shield" size={20} color="#fff" />
          </LinearGradient>

          <View style={styles.info}>
            <Text style={styles.teamName} numberOfLines={1}>{teamName}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {isCoach ? 'Manage roster, events, and invites' : 'View updates, events, and team details'}
            </Text>
          </View>

          <Chip
            label={ROLE_LABELS[userRole]}
            tone={userRole === 'player' ? 'mint' : 'primary'}
            style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[userRole] }]}
            textStyle={[styles.roleText, { color: ROLE_TEXT_COLORS[userRole] }]}
          />
        </View>

        <View style={styles.metaPills}>
          <View style={styles.metaPill}>
            <Ionicons name="people-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{memberLabel}</Text>
          </View>
          {isCoach && inviteCode ? (
            <View style={[styles.metaPill, styles.codePill]}>
              <Ionicons name="key-outline" size={14} color={Colors.primary} />
              <Text style={styles.codeText}>{inviteCode}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.openLabel}>Open team workspace</Text>
          <View style={styles.chevronWrap}>
            <Ionicons name="chevron-forward" size={16} color={Colors.primaryDark} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: UI.radius.xl,
    padding: UI.spacing.md,
    marginBottom: 12,
    gap: 12,
    borderColor: '#E7EAF2',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI.spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: UI.typography.bold,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: UI.typography.medium,
  },
  metaPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: UI.radius.pill,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  codePill: {
    backgroundColor: Colors.primarySoft,
    borderColor: '#C7DAFF',
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: UI.typography.medium,
  },
  codeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: UI.typography.bold,
  },
  roleBadge: {
    minHeight: 28,
    marginLeft: 'auto',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontFamily: UI.typography.bold,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    paddingTop: 10,
  },
  openLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: UI.typography.medium,
  },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: '#D7E4FF',
  },
});
