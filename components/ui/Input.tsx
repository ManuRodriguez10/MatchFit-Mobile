import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  TextInputProps,
  StyleSheet,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from '@/utils/reanimated-shim';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface InputProps extends TextInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  containerStyle?: any;
}

export default function Input({
  label,
  icon,
  error,
  containerStyle,
  value,
  onFocus,
  onBlur,
  secureTextEntry,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const labelPosition = useSharedValue(value ? 1 : 0);
  const shake = useSharedValue(0);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    labelPosition.value = withSpring(1, { damping: 15 });
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (!value) {
      labelPosition.value = withSpring(0, { damping: 15 });
    }
    onBlur?.(e);
  };

  // Shake animation for errors
  React.useEffect(() => {
    if (error) {
      shake.value = withSequence(
        withSpring(10, { damping: 8 }),
        withSpring(-10, { damping: 8 }),
        withSpring(10, { damping: 8 }),
        withSpring(0, { damping: 8 })
      );
    }
  }, [error]);

  const animatedLabelStyle = useAnimatedStyle(() => {
    'worklet';
    const isUp = labelPosition.value > 0.5;
    return {
      transform: [
        { translateY: isUp ? -28 : 0 },
        { scale: isUp ? 0.85 : 1 },
      ],
      color: isUp ? Colors.primary : Colors.textSecondary,
    };
  });

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const borderColor = error
    ? Colors.error
    : isFocused
    ? Colors.primary
    : Colors.border;

  return (
    <Animated.View style={[styles.container, containerStyle, animatedContainerStyle]}>
      <View
        style={[
          styles.inputContainer,
          {
            borderColor,
            borderWidth: isFocused ? 2 : 1,
            shadowColor: isFocused ? Colors.primary : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: isFocused ? 2 : 0,
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? Colors.primary : Colors.textSecondary}
            style={styles.icon}
          />
        )}

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={label}
            placeholderTextColor={Colors.textSecondary}
            secureTextEntry={secureTextEntry && !isPasswordVisible}
            {...props}
          />
        </View>

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  icon: {
    marginRight: 12,
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    fontSize: 16,
    color: Colors.textPrimary,
    paddingTop: 8,
    height: 40,
  },
  eyeIcon: {
    padding: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    marginLeft: 4,
  },
});
