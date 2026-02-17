import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  StatusBar,
  Image,
} from 'react-native';
import { Link } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/database';
import { Colors, Gradients } from '@/constants/colors';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import RoleSelector from '@/components/ui/RoleSelector';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('athlete');
  const [loading, setLoading] = useState(false);

  // Error states
  const [fullNameError, setFullNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const { signUp } = useAuth();

  const validateFullName = (name: string) => {
    if (!name.trim()) {
      setFullNameError('Full name is required');
      return false;
    }
    if (name.trim().length < 2) {
      setFullNameError('Name must be at least 2 characters');
      return false;
    }
    setFullNameError('');
    return true;
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const validateConfirmPassword = (confirm: string, original: string) => {
    if (!confirm) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    }
    if (confirm !== original) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  const handleSignUp = async () => {
    const isFullNameValid = validateFullName(fullName);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword, password);

    if (!isFullNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    setLoading(true);
    try {
      await signUp(email.trim(), password, fullName.trim(), role);
    } catch (error) {
      Alert.alert(
        'Sign Up Failed',
        error instanceof Error ? error.message : 'An error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={Gradients.primary as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Form Card */}
            <Animated.View
              entering={FadeInDown.delay(200).springify()}
              style={styles.cardContainer}
            >
              <BlurView intensity={40} tint="light" style={styles.blurContainer}>
                <View style={styles.card}>

                  {/* Header: Create Account text, icon, then subtitle */}
                  <Animated.View entering={FadeIn.duration(800)}>
                    <Text style={styles.welcomeText}>Create Account</Text>

                    {/* Icon between title and subtitle */}
                    <View style={styles.iconSection}>
                      <Image
                        source={require('@/assets/logo-icon.png')}
                        style={styles.iconImage}
                        resizeMode="contain"
                      />
                    </View>

                    <Text style={styles.subtitle}>Join MatchFit today</Text>
                  </Animated.View>

                  {/* Full Name Input */}
                  <Animated.View entering={FadeInDown.delay(300).springify()}>
                    <Input
                      label="Full Name"
                      icon="person-outline"
                      value={fullName}
                      onChangeText={(text) => {
                        setFullName(text);
                        if (fullNameError) validateFullName(text);
                      }}
                      editable={!loading}
                      error={fullNameError}
                      containerStyle={styles.inputContainer}
                    />
                  </Animated.View>

                  {/* Email Input */}
                  <Animated.View entering={FadeInDown.delay(400).springify()}>
                    <Input
                      label="Email"
                      icon="mail-outline"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (emailError) validateEmail(text);
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!loading}
                      error={emailError}
                      containerStyle={styles.inputContainer}
                    />
                  </Animated.View>

                  {/* Password Input */}
                  <Animated.View entering={FadeInDown.delay(500).springify()}>
                    <Input
                      label="Password"
                      icon="lock-closed-outline"
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (passwordError) validatePassword(text);
                        if (confirmPassword) validateConfirmPassword(confirmPassword, text);
                      }}
                      secureTextEntry
                      editable={!loading}
                      error={passwordError}
                      containerStyle={styles.inputContainer}
                    />
                  </Animated.View>

                  {/* Confirm Password Input */}
                  <Animated.View entering={FadeInDown.delay(600).springify()}>
                    <Input
                      label="Confirm Password"
                      icon="lock-closed-outline"
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (confirmPasswordError) validateConfirmPassword(text, password);
                      }}
                      secureTextEntry
                      editable={!loading}
                      error={confirmPasswordError}
                      containerStyle={styles.inputContainer}
                    />
                  </Animated.View>

                  {/* Role Selector */}
                  <Animated.View entering={FadeInDown.delay(700).springify()}>
                    <RoleSelector selectedRole={role} onSelectRole={setRole} />
                  </Animated.View>

                  {/* Create Account Button */}
                  <Animated.View entering={FadeInDown.delay(800).springify()}>
                    <Button
                      title="Create Account"
                      onPress={handleSignUp}
                      loading={loading}
                      disabled={loading}
                      style={styles.createButton}
                    />
                  </Animated.View>

                  {/* Sign In Link */}
                  <Animated.View
                    entering={FadeInDown.delay(900).springify()}
                    style={styles.signInContainer}
                  >
                    <Text style={styles.signInText}>Already have an account? </Text>
                    <Link href="/(auth)/login" asChild>
                      <TouchableOpacity>
                        <Text style={styles.signInLink}>Sign In</Text>
                      </TouchableOpacity>
                    </Link>
                  </Animated.View>
                </View>
              </BlurView>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  cardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 22,
    borderRadius: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  iconSection: {
    alignItems: 'center',
    marginVertical: 10,
  },
  iconImage: {
    width: 52,
    height: 52,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 18,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 10,
  },
  createButton: {
    marginBottom: 14,
    marginTop: 4,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  signInLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
