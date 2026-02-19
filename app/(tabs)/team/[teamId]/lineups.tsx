import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Gradients } from '@/constants/colors';

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

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Recent Lineups</Text>
          </View>

          <View style={styles.lineupCardMuted}>
            <Text style={styles.lineupTitleMuted}>No published lineups yet</Text>
            <Text style={styles.lineupMetaMuted}>Create your first lineup to prepare for upcoming matches.</Text>
          </View>

          <View style={styles.lineupCard}>
            <View style={styles.lineupTop}>
              <Text style={styles.lineupTitle}>Game Lineup Template</Text>
              <View style={styles.draftPill}>
                <Text style={styles.draftPillText}>Draft</Text>
              </View>
            </View>
            <Text style={styles.lineupMeta}>Formation: 4-3-3</Text>
            <Text style={styles.lineupMeta}>11 starters • 7 subs</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85}>
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>Create New Lineup</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 62,
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  summaryValue: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800',
    marginTop: 8,
  },
  summaryLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelTitle: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
  },
  lineupCardMuted: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  lineupTitleMuted: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '700',
  },
  lineupMetaMuted: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
  lineupCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  lineupTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  lineupTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  lineupMeta: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
  draftPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  draftPillText: {
    color: '#6D28D9',
    fontSize: 11,
    fontWeight: '700',
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
