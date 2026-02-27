import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import Animated, { FadeInDown, FadeIn } from '@/utils/reanimated-shim';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import TeamCard from '@/components/TeamCard';
import GradientText from '@/components/ui/GradientText';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import { TeamWithUserRole, CoachRole } from '@/types/database';

async function withRetry<T>(
  fn: () => PromiseLike<T>,
  { retries = 1, timeout = 15000, message = 'Request timed out.' } = {},
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(message)), timeout),
        ),
      ]);
      return result;
    } catch (err) {
      if (attempt === retries) throw err;
      // Brief pause before retry
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(message);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

export default function TeamScreen() {
  const { user, profile, signOut } = useAuth();
  const [teams, setTeams] = useState<TeamWithUserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isCoach = profile?.role === 'coach' || profile?.role === 'admin';

  const firstName = profile?.first_name ?? profile?.full_name?.split(' ')[0] ?? '';
  const initials = profile?.full_name ? getInitials(profile.full_name) : '?';

  const fetchTeams = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setLoadError('Unable to load teams right now. Please try again.');
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      // Ensure the auth session is fully initialized before querying
      await supabase.auth.getSession();
      const results: TeamWithUserRole[] = [];

      if (isCoach) {
        const { data, error } = await withRetry(
          () => supabase
            .from('team_coaches')
            .select('role, team:teams(id, name, invite_code)')
            .eq('coach_id', user.id),
          { message: 'Timed out while loading teams.' },
        );

        if (error) throw error;

        const rows = (data ?? []).filter(
          (row) => row.team != null,
        ) as { role: string; team: { id: string; name: string; invite_code: string } }[];

        if (rows.length > 0) {
          const counts = await withRetry(
            () => Promise.all(
              rows.map((row) =>
                Promise.all([
                  supabase.from('team_coaches').select('id', { count: 'exact', head: true }).eq('team_id', row.team.id),
                  supabase.from('team_players').select('id', { count: 'exact', head: true }).eq('team_id', row.team.id),
                ]),
              ),
            ),
            { message: 'Timed out while loading team members.' },
          );

          for (let i = 0; i < rows.length; i++) {
            const { team, role } = rows[i];
            const [coachRes, playerRes] = counts[i];
            results.push({
              teamId: team.id,
              teamName: team.name,
              inviteCode: team.invite_code,
              memberCount: (coachRes.count ?? 0) + (playerRes.count ?? 0),
              userRole: role as CoachRole,
            });
          }
        }
      } else {
        const { data, error } = await withRetry(
          () => supabase
            .from('team_players')
            .select('team:teams(id, name, invite_code)')
            .eq('player_id', user.id),
          { message: 'Timed out while loading teams.' },
        );

        if (error) throw error;

        const rows = (data ?? []).filter(
          (row) => row.team != null,
        ) as { team: { id: string; name: string; invite_code: string } }[];

        if (rows.length > 0) {
          const counts = await withRetry(
            () => Promise.all(
              rows.map((row) =>
                Promise.all([
                  supabase.from('team_coaches').select('id', { count: 'exact', head: true }).eq('team_id', row.team.id),
                  supabase.from('team_players').select('id', { count: 'exact', head: true }).eq('team_id', row.team.id),
                ]),
              ),
            ),
            { message: 'Timed out while loading team members.' },
          );

          for (let i = 0; i < rows.length; i++) {
            const { team } = rows[i];
            const [coachRes, playerRes] = counts[i];
            results.push({
              teamId: team.id,
              teamName: team.name,
              inviteCode: team.invite_code,
              memberCount: (coachRes.count ?? 0) + (playerRes.count ?? 0),
              userRole: 'player',
            });
          }
        }
      }

      setTeams(results);
    } catch (err) {
      console.error('fetchTeams error:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load teams.');
    } finally {
      setLoading(false);
    }
  }, [user, isCoach]);

  useFocusEffect(
    useCallback(() => {
      fetchTeams();
    }, [fetchTeams])
  );

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  return (
    <LinearGradient
      colors={Gradients.primary as unknown as string[]}
      style={styles.gradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
    >
      {/* Decorative circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.brandBlock}>
              <View style={styles.logoGrid}>
                <Image source={require('../../../assets/logo-icon.png')} style={styles.logo} resizeMode="contain" />
              </View>
              <Text
                style={styles.greeting}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {getGreeting()}{firstName ? `, ${firstName}` : ''}!
              </Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
        </View>

        <GradientText
          text="My Teams"
          style={styles.headerTitle}
          colors={['#FFFFFF', '#D4EBFC']}
        />

        {isCoach && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/team/create')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={16} color="#fff" />
              <Text style={styles.actionText}>Create Team</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/team/join')}
              activeOpacity={0.8}
            >
              <Ionicons name="enter-outline" size={16} color="#fff" />
              <Text style={styles.actionText}>Join Team</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading teams...</Text>
        </View>
      ) : loadError ? (
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="alert-circle-outline" size={40} color="rgba(255,255,255,0.75)" />
          </View>
          <Text style={styles.emptyTitle}>Couldn't load teams</Text>
          <Text style={styles.emptySubtitle}>{loadError}</Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={fetchTeams}
            activeOpacity={0.85}
          >
            <View style={styles.ctaInner}>
              <Ionicons name="refresh-outline" size={20} color="#fff" />
              <Text style={styles.ctaText}>Try Again</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ) : teams.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name={isCoach ? 'people' : 'people-outline'} size={40} color="rgba(255,255,255,0.6)" />
          </View>
          <Text style={styles.emptyTitle}>
            {isCoach ? 'No teams yet' : 'Not on a team yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isCoach
              ? 'Create a team and invite your players with a unique code'
              : 'Ask your coach for an invite code to join their team'}
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push(isCoach ? '/team/create' : '/team/join')}
            activeOpacity={0.85}
          >
            <View style={styles.ctaInner}>
              <Ionicons
                name={isCoach ? 'add-circle-outline' : 'enter-outline'}
                size={20}
                color="#fff"
              />
              <Text style={styles.ctaText}>{isCoach ? 'Create Team' : 'Join Team'}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {teams.map((team, index) => (
            <Animated.View
              key={team.teamId}
              entering={FadeInDown.delay(index * 80).springify()}
            >
              <TeamCard
                teamId={team.teamId}
                teamName={team.teamName}
                memberCount={team.memberCount}
                userRole={team.userRole}
                inviteCode={team.inviteCode}
                onPress={() => router.push(`/team/${team.teamId}`)}
              />
            </Animated.View>
          ))}
        </ScrollView>
      )}

      {/* Sign out — bottom of screen */}
      <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.footer}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={16} color="#fff" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  decorCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -80,
    right: -60,
  },
  decorCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: 80,
    left: -40,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 72 : 44,
    paddingHorizontal: 24,
    paddingBottom: 18,
    gap: 16,
  },
  heroCard: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 26,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#0B1C4D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 18,
  },
  logoGrid: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  logo: {
    width: 26,
    height: 26,
  },
  greeting: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    flexShrink: 1,
    lineHeight: 21,
    fontFamily: UI.typography.bold,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  avatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.error,
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  signOutText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    fontFamily: UI.typography.bold,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#0B1C4D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontFamily: UI.typography.medium,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    fontFamily: UI.typography.bold,
  },
  emptySubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
    fontFamily: UI.typography.medium,
  },
  ctaButton: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
});
