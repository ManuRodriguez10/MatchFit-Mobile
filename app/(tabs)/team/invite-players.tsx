import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import Card from '@/components/ui/Card';
import GradientText from '@/components/ui/GradientText';

export default function InvitePlayersScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const loadTeam = useCallback(async () => {
    if (!teamId) return;
    const { data } = await supabase
      .from('teams')
      .select('name, invite_code')
      .eq('id', teamId)
      .single();
    if (data) {
      setTeamName(data.name);
      setInviteCode(data.invite_code);
    }
  }, [teamId]);

  useFocusEffect(useCallback(() => { loadTeam(); }, [loadTeam]));

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join ${teamName} on MatchFit! Use invite code: ${inviteCode}`,
      });
    } catch {}
  };

  const handleCopyCode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleShareCode();
  };

  return (
    <LinearGradient
      colors={Gradients.primary as unknown as string[]}
      style={styles.gradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
    >
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <GradientText
          text="Invite Players"
          style={styles.headerTitle}
          colors={['#FFFFFF', '#D4EBFC']}
        />
        <View style={styles.backBtnGhost} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.subtitle}>
          Share this code with players to join {teamName || 'your team'}
        </Text>

        <Card style={styles.coachInviteCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: Colors.purpleSoft }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={Colors.purple} />
            </View>
            <Text style={styles.cardTitle}>Inviting Coaches?</Text>
          </View>
          <Text style={styles.fieldLabel}>
            Coach invites are managed from Team Settings.
          </Text>
          <TouchableOpacity
            style={styles.settingsBtn}
            activeOpacity={0.8}
            onPress={() => router.push(`/team/${teamId}/settings`)}
          >
            <Ionicons name="settings-outline" size={16} color={Colors.primary} />
            <Text style={styles.settingsBtnText}>Go to Team Settings</Text>
          </TouchableOpacity>
        </Card>

        {/* Invite Code Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: Colors.emeraldSoft }]}>
              <Ionicons name="people-outline" size={18} color={Colors.emerald} />
            </View>
            <Text style={styles.cardTitle}>Player Invite Code</Text>
          </View>

          <Text style={styles.fieldLabel}>
            Players can use this code to join your team from the app
          </Text>

          <TouchableOpacity onPress={handleCopyCode} style={styles.codeDisplay} activeOpacity={0.7}>
            <Text style={styles.codeText}>{inviteCode}</Text>
            <Ionicons name="copy-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShareCode} style={styles.shareBtn} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={18} color={Colors.primary} />
            <Text style={styles.shareBtnText}>Share Invite Code</Text>
          </TouchableOpacity>
        </Card>

        {/* How it works */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: Colors.blueSoft }]}>
              <Ionicons name="help-circle-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>How It Works</Text>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Share the invite code with your players</Text>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>Players open MatchFit and tap "Join Team"</Text>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>They enter the code and instantly join your roster</Text>
          </View>
        </Card>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  decorCircle1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.05)', top: -80, right: -60,
  },
  decorCircle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: 120, left: -40,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 62 : 44,
    paddingHorizontal: 20,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  backBtnGhost: { width: 42, height: 42 },
  headerTitle: {
    color: '#fff', fontSize: 20, fontFamily: UI.typography.bold,
    flex: 1, textAlign: 'center', paddingHorizontal: 10,
  },
  content: {
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120, gap: 16,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)', fontSize: 15, fontFamily: UI.typography.medium,
  },

  // Card
  card: { borderRadius: 20, padding: 18, gap: 12 },
  coachInviteCard: { borderRadius: 20, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17, color: Colors.textPrimary, fontFamily: UI.typography.bold,
  },
  fieldLabel: {
    fontSize: 13, color: Colors.textSecondary, fontFamily: UI.typography.medium,
  },

  // Code display
  codeDisplay: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 20, borderRadius: UI.radius.lg,
    borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.border,
    backgroundColor: Colors.surfaceMuted,
  },
  codeText: {
    fontSize: 32, color: Colors.primary, letterSpacing: 6, fontFamily: UI.typography.bold,
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: UI.radius.lg,
    backgroundColor: Colors.primary,
  },
  shareBtnText: {
    fontSize: 15, color: '#fff', fontFamily: UI.typography.bold,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: UI.radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    backgroundColor: Colors.surfaceMuted,
  },
  settingsBtnText: {
    fontSize: 14,
    color: Colors.primary,
    fontFamily: UI.typography.bold,
  },

  // Steps
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSoft,
  },
  stepNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.blueSoft, alignItems: 'center', justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 13, color: Colors.primary, fontFamily: UI.typography.bold,
  },
  stepText: {
    flex: 1, fontSize: 14, color: Colors.textPrimary, fontFamily: UI.typography.medium,
    lineHeight: 20,
  },
});
