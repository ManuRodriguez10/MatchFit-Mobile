import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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
import { Colors, Gradients } from '@/constants/colors';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const { signIn } = useAuth();

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

  const handleLogin = async () => {
    // Clear previous errors
    setGeneralError('');
    setEmailError('');
    setPasswordError('');

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // On success, _layout.tsx handles redirect to (tabs) automatically
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred. Please try again.';
      // Show "email not confirmed" as a general message (not tied to a field)
      if (message.toLowerCase().includes('verify your email') || message.toLowerCase().includes('wait a moment')) {
        setGeneralError(message);
      } else {
        // Wrong credentials — highlight both fields
        setEmailError(' ');
        setPasswordError(message);
      }
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

                  {/* Logo inside card, above Welcome Back */}
                  <Animated.View entering={FadeIn.duration(800)} style={styles.logoSection}>
                    <Image
                      source={require('@/assets/logo-full.png')}
                      style={styles.logoImage}
                      resizeMode="contain"
                    />
                  </Animated.View>

                  <Text style={styles.welcomeText}>Welcome Back</Text>
                  <Text style={styles.subtitle}>Sign in to continue</Text>

                  {/* General error banner */}
                  {generalError ? (
                    <Animated.View entering={FadeInDown.duration(300)} style={styles.errorBanner}>
                      <Text style={styles.errorBannerText}>{generalError}</Text>
                    </Animated.View>
                  ) : null}

                  {/* Email Input */}
                  <Animated.View entering={FadeInDown.delay(400).springify()}>
                    <Input
                      label="Email"
                      icon="mail-outline"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        setGeneralError('');
                        if (emailError.trim()) validateEmail(text);
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
                        setGeneralError('');
                        if (passwordError.trim()) validatePassword(text);
                      }}
                      secureTextEntry
                      editable={!loading}
                      error={passwordError}
                      containerStyle={styles.inputContainer}
                    />
                  </Animated.View>

                  {/* Forgot Password — centered */}
                  <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.forgotPasswordContainer}>
                    <TouchableOpacity>
                      <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </Animated.View>

                  {/* Sign In Button */}
                  <Animated.View entering={FadeInDown.delay(700).springify()}>
                    <Button
                      title="Sign In"
                      onPress={handleLogin}
                      loading={loading}
                      disabled={loading}
                      style={styles.signInButton}
                    />
                  </Animated.View>

                  {/* Sign Up Link */}
                  <Animated.View
                    entering={FadeInDown.delay(800).springify()}
                    style={styles.signUpContainer}
                  >
                    <Text style={styles.signUpText}>Don't have an account? </Text>
                    <Link href="/(auth)/signup" asChild>
                      <TouchableOpacity>
                        <Text style={styles.signUpLink}>Sign Up</Text>
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
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  cardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'transparent',
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
    padding: 28,
    borderRadius: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 180,
    height: 60,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  signInButton: {
    marginBottom: 20,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  signUpLink: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  errorBannerText: {
    color: '#991B1B',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
