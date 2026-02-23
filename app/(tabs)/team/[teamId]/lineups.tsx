import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';

export default function TeamLineupsScreen() {
  return (
    <LinearGradient
      colors={Gradients.primary as unknown as string[]}
      style={styles.gradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
    >
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Lineups</Text>
        <Text style={styles.subtitle}>Manage starting elevens and match plans</Text>

        <View style={styles.summaryRow}>
          <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.summaryCard}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={styles.summaryValue}>0</Text>
            <Text style={styles.summaryLabel}>Published</Text>
          </LinearGradient>
          <LinearGradient colors={['#4F46E5', '#3730A3']} style={styles.summaryCard}>
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={styles.summaryValue}>0</Text>
            <Text style={styles.summaryLabel}>Drafts</Text>
          </LinearGradient>
        </View>

        <Card padded={false} style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Recent Lineups</Text>
          </View>

          <Card muted style={styles.lineupCardMuted}>
            <Text style={styles.lineupTitleMuted}>No published lineups yet</Text>
            <Text style={styles.lineupMetaMuted}>Create your first lineup to prepare for upcoming matches.</Text>
          </Card>

          <Card style={styles.lineupCard}>
            <View style={styles.lineupTop}>
              <Text style={styles.lineupTitle}>Game Lineup Template</Text>
              <Chip label="Draft" tone="lavender" />
            </View>
            <Text style={styles.lineupMeta}>Formation: 4-3-3</Text>
            <Text style={styles.lineupMeta}>11 starters • 7 subs</Text>
          </Card>

          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>Create New Lineup</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
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
    bottom: 120,
    left: -40,
  },
  content: {
    paddingTop: 120,
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: UI.spacing.sm,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: UI.typography.medium,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: UI.radius.lg,
    paddingHorizontal: UI.spacing.sm,
    paddingVertical: UI.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    minHeight: 112,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
    marginTop: 8,
  },
  summaryLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
    marginTop: 2,
  },
  panel: {
    borderRadius: 24,
    padding: UI.spacing.md,
    gap: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
  },
  lineupCardMuted: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    borderRadius: 16,
    shadowOpacity: 0,
    elevation: 0,
  },
  lineupTitleMuted: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
  },
  lineupMetaMuted: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: UI.typography.medium,
  },
  lineupCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    borderRadius: 16,
    shadowOpacity: 0,
    elevation: 0,
  },
  lineupTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  lineupTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
    flex: 1,
  },
  lineupMeta: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: UI.typography.medium,
  },
  primaryButton: {
    borderRadius: UI.radius.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
  },
});
