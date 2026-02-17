import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';
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

    const needsOnboarding = profile.role === 'coach' && !profile.onboarding_complete;

    if (needsOnboarding && !inOnboardingGroup) {
      // Coach hasn't completed onboarding yet
      router.replace('/(onboarding)');
    } else if (!needsOnboarding && (inAuthGroup || inOnboardingGroup)) {
      // Onboarding done or not a coach — go to main tabs
      router.replace('/(tabs)');
    }
  }, [user, profile, loading, segments]);

  if (loading) {
    return <LoadingScreen />;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
