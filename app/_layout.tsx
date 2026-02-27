import { View, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';
import ToastContainer from '@/components/ui/Toast';
import '../global.css';

function RootLayoutNav() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user) {
      // Not authenticated — always go to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Authenticated — check onboarding status
    // Wait until profile is loaded before making routing decisions
    if (!profile) return;

    const needsOnboarding = !profile.onboarding_complete &&
      (profile.role === 'coach' || profile.role === 'athlete');

    if (needsOnboarding && !inOnboardingGroup) {
      // Route to onboarding (coaches start at index, athletes go directly to player-join-team)
      if (profile.role === 'athlete') {
        router.replace('/(onboarding)/player-join-team');
      } else {
        router.replace('/(onboarding)');
      }
    } else if (!needsOnboarding && (inAuthGroup || inOnboardingGroup)) {
      // Onboarding done — go to teams
      router.replace('/(tabs)/team');
    }
  }, [user, profile, loading, segments]);

  if (loading) {
    return <LoadingScreen />;
  }

  const inAuthGroup = segments[0] === '(auth)';

  return (
    <View style={styles.appRoot}>
      <Slot />
      {!inAuthGroup ? (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(212,235,252,0.16)', 'rgba(231,243,254,0.10)', 'rgba(255,255,255,0.06)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.globalOverlay}
        />
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  if (!fontsLoaded) {
    return <LoadingScreen />;
  }

  return (
    <AuthProvider>
      <View style={{ flex: 1 }}>
        <RootLayoutNav />
        <ToastContainer />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
  globalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
