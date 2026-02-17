import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';

export default function TeamScreen() {
  const { profile } = useAuth();
  const isCoach = profile?.role === 'coach' || profile?.role === 'admin';

  return (
    <View style={styles.container}>
      {isCoach ? (
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.content}>
          <LinearGradient
            colors={Gradients.primary as unknown as string[]}
            style={styles.iconContainer}
          >
            <Ionicons name="people" size={40} color="#fff" />
          </LinearGradient>
          <Text style={styles.title}>Manage Your Team</Text>
          <Text style={styles.subtitle}>
            Create a team and invite your players with a unique code
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/team/create')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={Gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createButtonGradient}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Team</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.content}>
          <LinearGradient
            colors={Gradients.primary as unknown as string[]}
            style={styles.iconContainer}
          >
            <Ionicons name="people-outline" size={40} color="#fff" />
          </LinearGradient>
          <Text style={styles.title}>Join a Team</Text>
          <Text style={styles.subtitle}>
            Ask your coach for an invite code to join their team
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/team/join')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={Gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createButtonGradient}
            >
              <Ionicons name="enter-outline" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Join Team</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  createButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
