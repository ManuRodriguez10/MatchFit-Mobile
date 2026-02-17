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
      // Onboarding done — go to main tabs
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
