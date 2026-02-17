import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { UserRole } from '@/types/database';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface RoleSelectorProps {
  selectedRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

interface RoleCardProps {
  role: UserRole;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  isSelected: boolean;
  onPress: () => void;
}

function RoleCard({ role, icon, title, description, isSelected, onPress }: RoleCardProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    scale.value = withSpring(isSelected ? 1.05 : 1, { damping: 15 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        styles.card,
        {
          borderColor: isSelected ? Colors.primary : Colors.border,
          borderWidth: 2,
          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : Colors.background,
        },
      ]}
      activeOpacity={0.9}
    >
      <View style={styles.cardContent}>
        {isSelected && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
          </View>
        )}

        <Ionicons
          name={icon}
          size={28}
          color={isSelected ? Colors.primary : Colors.textSecondary}
          style={styles.icon}
        />

        <Text
          style={[
            styles.title,
            { color: isSelected ? Colors.primary : Colors.textPrimary },
          ]}
        >
          {title}
        </Text>

        <Text style={styles.description}>{description}</Text>
      </View>
    </AnimatedTouchable>
  );
}

export default function RoleSelector({ selectedRole, onSelectRole }: RoleSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>I am a...</Text>

      <View style={styles.cardsContainer}>
        <RoleCard
          role="athlete"
          icon="football"
          title="Player"
          description="Join teams and track events"
          isSelected={selectedRole === 'athlete'}
          onPress={() => onSelectRole('athlete')}
        />

        <RoleCard
          role="coach"
          icon="trophy"
          title="Coach"
          description="Manage teams and events"
          isSelected={selectedRole === 'coach'}
          onPress={() => onSelectRole('coach')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
  },
  cardContent: {
    alignItems: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  icon: {
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  description: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
