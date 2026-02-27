import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  runOnJS,
} from '@/utils/reanimated-shim';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { UI } from '@/constants/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

const toastConfig: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; bg: string; border: string; iconColor: string }> = {
  success: { icon: 'checkmark-circle', bg: Colors.emeraldSoft, border: Colors.emerald, iconColor: Colors.emerald },
  error: { icon: 'close-circle', bg: Colors.redSoft, border: Colors.red, iconColor: Colors.red },
  warning: { icon: 'warning', bg: Colors.amberSoft, border: Colors.amber, iconColor: Colors.amber },
  info: { icon: 'information-circle', bg: Colors.blueSoft, border: Colors.blue, iconColor: Colors.blue },
};

// Global toast state
let toastListener: ((toast: ToastData) => void) | null = null;
let idCounter = 0;

export function showToast(type: ToastType, title: string, message?: string, duration = 3000) {
  const toast: ToastData = { id: String(++idCounter), type, title, message, duration };
  toastListener?.(toast);
}

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const config = toastConfig[toast.type];

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    opacity.value = withSpring(1);

    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(-100, { duration: 200 }, () => {
        runOnJS(onDismiss)(toast.id);
      });
    }, toast.duration || 3000);

    return () => clearTimeout(timeout);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.toast, { backgroundColor: config.bg, borderColor: config.border }, animatedStyle]}>
      <Ionicons name={config.icon} size={22} color={config.iconColor} />
      <View style={styles.toastContent}>
        <Text style={styles.toastTitle}>{toast.title}</Text>
        {toast.message && <Text style={styles.toastMessage}>{toast.message}</Text>}
      </View>
      <TouchableOpacity onPress={() => onDismiss(toast.id)} hitSlop={8}>
        <Ionicons name="close" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);
  const insets = useSafeAreaInsets();

  const handleDismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    toastListener = (toast) => {
      setToasts(prev => [...prev.slice(-2), toast]); // max 3 visible
    };
    return () => { toastListener = null; };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={handleDismiss} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    ...UI.shadow.card,
  },
  toastContent: {
    flex: 1,
    marginHorizontal: 10,
  },
  toastTitle: {
    fontSize: 14,
    fontFamily: UI.typography.semibold,
    color: Colors.textPrimary,
  },
  toastMessage: {
    fontSize: 12,
    fontFamily: UI.typography.regular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
