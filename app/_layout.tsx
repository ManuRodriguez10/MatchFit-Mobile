import { View, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import LoadingScreen from '@/components/LoadingScreen';
import ToastContainer from '@/components/ui/Toast';
import '../global.css';

function RootLayoutNav() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const routingRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user) {
      routingRef.current = false;
      // Not authenticated — always go to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Authenticated — check onboarding status
    // Wait until profile is loaded before making routing decisions
    if (!profile) return;

    console.log('[ROUTING] user:', user.email, '| role:', profile.role, '| onboarding_complete:', profile.onboarding_complete);

    const needsOnboarding = !profile.onboarding_complete &&
      (profile.role === 'coach' || profile.role === 'athlete');

    if (needsOnboarding && !inOnboardingGroup) {
      // Prevent duplicate async routing
      if (routingRef.current) return;
      routingRef.current = true;

      // Check if user already has a team before deciding where to route
      (async () => {
        try {
          if (profile.role === 'athlete') {
            // Check if player already joined a team
            const { data: memberships, error: memberErr } = await supabase
              .from('team_players')
              .select('team_id, teams(name)')
              .eq('player_id', user.id)
              .limit(1);

            console.log('[ROUTING] team_players query:', JSON.stringify({ memberships, memberErr }));

            const membership = memberships?.[0];
            if (membership?.team_id) {
              // Already on a team — skip invite code, go straight to complete-profile
              router.replace({
                pathname: '/(onboarding)/complete-profile',
                params: {
                  teamId: membership.team_id,
                  teamName: (membership as any).teams?.name ?? 'Your Team',
                },
              });
            } else {
              router.replace('/(onboarding)/player-join-team');
            }
          } else {
            // Coach — check if they already created or joined a team
            const { data: coachTeams, error: coachErr } = await supabase
              .from('team_coaches')
              .select('team_id, teams(name, invite_code)')
              .eq('coach_id', user.id)
              .limit(1);

            console.log('[ROUTING] team_coaches query:', JSON.stringify({ coachTeams, coachErr }));

            const coachTeam = coachTeams?.[0];
            if (coachTeam?.team_id) {
              // Already has a team — skip to invite-code screen
              router.replace({
                pathname: '/(onboarding)/invite-code',
                params: {
                  inviteCode: (coachTeam as any).teams?.invite_code ?? '',
                  teamName: (coachTeam as any).teams?.name ?? 'Your Team',
                },
              });
            } else {
              router.replace('/(onboarding)');
            }
          }
        } catch (err) {
          console.error('[ROUTING] team check error:', err);
          // Fallback to default onboarding entry if query fails
          if (profile.role === 'athlete') {
            router.replace('/(onboarding)/player-join-team');
          } else {
            router.replace('/(onboarding)');
          }
        } finally {
          routingRef.current = false;
        }
      })();
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
