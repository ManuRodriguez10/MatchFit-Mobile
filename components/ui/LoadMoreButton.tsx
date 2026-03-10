import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { UI } from '@/constants/ui';

interface LoadMoreButtonProps {
  onPress: () => void;
  loading?: boolean;
  label?: string;
  /** Muted style for use inside white cards */
  muted?: boolean;
}

export default function LoadMoreButton({
  onPress,
  loading = false,
  label = 'Load More',
  muted = false,
}: LoadMoreButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, muted && styles.buttonMuted]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={muted ? Colors.primary : '#fff'} />
      ) : (
        <View style={styles.inner}>
          <Ionicons
            name="chevron-down-outline"
            size={16}
            color={muted ? Colors.primary : '#fff'}
          />
          <Text style={[styles.text, muted && styles.textMuted]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: UI.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  buttonMuted: {
    backgroundColor: Colors.surfaceMuted,
    borderColor: Colors.border,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontFamily: UI.typography.bold,
  },
  textMuted: {
    color: Colors.primary,
  },
});
