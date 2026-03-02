import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import Card from '@/components/ui/Card';
import { showToast } from '@/components/ui/Toast';
import GradientText from '@/components/ui/GradientText';
import { PlayerPosition } from '@/types/database';

// ── Types ────────────────────────────────────────────────────

interface ParsedPlayer {
  name: string;
  email: string;
  jerseyNumber: number | null;
  positions: PlayerPosition[];
}

interface ImportResult {
  added: string[];
  alreadyOnTeam: string[];
  notFound: string[];
}

// ── Helpers ──────────────────────────────────────────────────

const POSITION_MAP: Record<string, PlayerPosition> = {
  gk: 'goalkeeper', goalkeeper: 'goalkeeper', keeper: 'goalkeeper', goalie: 'goalkeeper',
  def: 'defender', defender: 'defender', cb: 'defender', lb: 'defender', rb: 'defender',
  mid: 'midfielder', midfielder: 'midfielder', cm: 'midfielder', cdm: 'midfielder', cam: 'midfielder',
  fwd: 'forward', forward: 'forward', st: 'forward', striker: 'forward', cf: 'forward',
};

function parsePosition(raw: string): PlayerPosition | null {
  return POSITION_MAP[raw.trim().toLowerCase()] ?? null;
}

function parseLine(line: string): ParsedPlayer | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.toLowerCase().startsWith('name')) return null;

  // Split by comma or tab
  const parts = trimmed.split(/[,\t]+/).map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const result: ParsedPlayer = {
    name: '',
    email: '',
    jerseyNumber: null,
    positions: [],
  };

  // First part is always name
  result.name = parts[0];

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    // Check if it's an email
    if (part.includes('@') && part.includes('.')) {
      result.email = part.toLowerCase();
      continue;
    }

    // Check if it's a number (jersey)
    const num = parseInt(part, 10);
    if (!isNaN(num) && num >= 0 && num <= 99) {
      result.jerseyNumber = num;
      continue;
    }

    // Check if it's a position
    const pos = parsePosition(part);
    if (pos && !result.positions.includes(pos)) {
      result.positions.push(pos);
    }
  }

  return result.name ? result : null;
}

function parseInput(text: string): ParsedPlayer[] {
  return text
    .split('\n')
    .map(parseLine)
    .filter((p): p is ParsedPlayer => p !== null);
}

const PLACEHOLDER = `Paste players, one per line:

John Smith, john@email.com, 10, Forward
Jane Doe, jane@email.com, 7, Midfielder
Alex Brown, alex@email.com, 1, GK

Or just names:
John Smith
Jane Doe`;

// ── Screen ───────────────────────────────────────────────────

export default function ImportRosterScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();

  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedPlayer[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handlePreview = () => {
    const players = parseInput(rawText);
    if (players.length === 0) {
      showToast('error', 'No valid players found. Check the format.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setParsed(players);
    setShowPreview(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleImport = async () => {
    if (!teamId || parsed.length === 0) return;
    setImporting(true);

    const results: ImportResult = { added: [], alreadyOnTeam: [], notFound: [] };

    try {
      // Get emails from parsed data
      const emails = parsed.filter(p => p.email).map(p => p.email);
      const names = parsed.filter(p => !p.email).map(p => p.name);

      // Look up profiles by email
      let profilesByEmail: Record<string, { id: string; full_name: string }> = {};
      if (emails.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('email', emails);
        if (data) {
          for (const p of data) {
            profilesByEmail[p.email.toLowerCase()] = { id: p.id, full_name: p.full_name };
          }
        }
      }

      // Look up profiles by name (for players without emails)
      let profilesByName: Record<string, { id: string; full_name: string }> = {};
      if (names.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('full_name', names);
        if (data) {
          for (const p of data) {
            profilesByName[p.full_name.toLowerCase()] = { id: p.id, full_name: p.full_name };
          }
        }
      }

      // Get existing team players
      const { data: existingPlayers } = await supabase
        .from('team_players')
        .select('player_id')
        .eq('team_id', teamId);
      const existingIds = new Set((existingPlayers ?? []).map(p => p.player_id));

      // Process each parsed player
      for (const player of parsed) {
        // Try to find profile
        let profile: { id: string; full_name: string } | null = null;

        if (player.email) {
          profile = profilesByEmail[player.email] ?? null;
        }
        if (!profile && player.name) {
          profile = profilesByName[player.name.toLowerCase()] ?? null;
        }

        if (!profile) {
          results.notFound.push(player.email || player.name);
          continue;
        }

        if (existingIds.has(profile.id)) {
          results.alreadyOnTeam.push(profile.full_name);
          continue;
        }

        // Add to team
        const { error } = await supabase.from('team_players').insert({
          team_id: teamId,
          player_id: profile.id,
          jersey_number: player.jerseyNumber,
          positions: player.positions.length > 0 ? player.positions : [],
        });

        if (!error) {
          results.added.push(profile.full_name);
          existingIds.add(profile.id);
        }
      }

      setResult(results);

      if (results.added.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('success', `${results.added.length} player${results.added.length > 1 ? 's' : ''} imported`);
      } else if (results.notFound.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch {
      showToast('error', 'Import failed. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setImporting(false);
    }
  };

  const handleDone = () => {
    router.back();
  };

  const handleReset = () => {
    setRawText('');
    setParsed([]);
    setShowPreview(false);
    setResult(null);
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <GradientText
          text="Import Roster"
          style={styles.headerTitle}
          colors={['#FFFFFF', '#D4EBFC']}
        />
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {result ? (
            // ── Results View ──
            <View style={styles.resultsContainer}>
              {result.added.length > 0 && (
                <Card style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <View style={[styles.resultIcon, { backgroundColor: '#D1FAE5' }]}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                    <Text style={styles.resultTitle}>Added ({result.added.length})</Text>
                  </View>
                  {result.added.map((name, i) => (
                    <Text key={i} style={styles.resultName}>{name}</Text>
                  ))}
                </Card>
              )}

              {result.alreadyOnTeam.length > 0 && (
                <Card style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <View style={[styles.resultIcon, { backgroundColor: Colors.blueSoft }]}>
                      <Ionicons name="information-circle" size={20} color={Colors.primary} />
                    </View>
                    <Text style={styles.resultTitle}>Already on Team ({result.alreadyOnTeam.length})</Text>
                  </View>
                  {result.alreadyOnTeam.map((name, i) => (
                    <Text key={i} style={styles.resultName}>{name}</Text>
                  ))}
                </Card>
              )}

              {result.notFound.length > 0 && (
                <Card style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <View style={[styles.resultIcon, { backgroundColor: '#FEE2E2' }]}>
                      <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    </View>
                    <Text style={styles.resultTitle}>Not Found ({result.notFound.length})</Text>
                  </View>
                  <Text style={styles.notFoundHint}>
                    These players don't have a MatchFit account yet. Share the invite code so they can sign up and join.
                  </Text>
                  {result.notFound.map((name, i) => (
                    <Text key={i} style={styles.resultName}>{name}</Text>
                  ))}
                </Card>
              )}

              <View style={styles.resultActions}>
                <TouchableOpacity onPress={handleReset} style={styles.secondaryBtn} activeOpacity={0.8}>
                  <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
                  <Text style={styles.secondaryBtnText}>Import More</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDone} style={styles.primaryBtn} activeOpacity={0.8}>
                  <Text style={styles.primaryBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : showPreview ? (
            // ── Preview View ──
            <View style={styles.previewContainer}>
              <Card style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle}>Preview ({parsed.length} players)</Text>
                  <TouchableOpacity onPress={() => setShowPreview(false)} activeOpacity={0.7}>
                    <Text style={styles.editLink}>Edit</Text>
                  </TouchableOpacity>
                </View>

                {parsed.map((player, i) => (
                  <View key={i} style={styles.previewRow}>
                    <View style={styles.previewCircle}>
                      <Text style={styles.previewCircleText}>
                        {player.jerseyNumber ?? player.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewName}>{player.name}</Text>
                      <View style={styles.previewMeta}>
                        {player.email ? (
                          <Text style={styles.previewEmail}>{player.email}</Text>
                        ) : (
                          <Text style={styles.previewNoEmail}>No email — name lookup</Text>
                        )}
                        {player.positions.length > 0 && (
                          <Text style={styles.previewPositions}>
                            {player.positions.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </Card>

              <TouchableOpacity
                onPress={handleImport}
                style={styles.importBtn}
                activeOpacity={0.8}
                disabled={importing}
              >
                {importing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                    <Text style={styles.importBtnText}>Import {parsed.length} Players</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            // ── Input View ──
            <View style={styles.inputContainer}>
              <Card style={styles.instructionCard}>
                <View style={styles.instructionHeader}>
                  <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
                  <Text style={styles.instructionTitle}>Paste Player Data</Text>
                </View>
                <Text style={styles.instructionText}>
                  One player per line. Supported formats:
                </Text>
                <View style={styles.formatExamples}>
                  <Text style={styles.formatCode}>Name, Email, Jersey#, Position</Text>
                  <Text style={styles.formatCode}>Name, Email</Text>
                  <Text style={styles.formatCode}>Name</Text>
                </View>
                <Text style={styles.instructionHint}>
                  Players must have a MatchFit account to be added. Players without accounts will be flagged.
                </Text>
              </Card>

              <TextInput
                style={styles.textArea}
                value={rawText}
                onChangeText={setRawText}
                placeholder={PLACEHOLDER}
                placeholderTextColor={Colors.textMuted}
                multiline
                textAlignVertical="top"
                autoCapitalize="words"
                autoCorrect={false}
              />

              <TouchableOpacity
                onPress={handlePreview}
                style={[styles.importBtn, !rawText.trim() && styles.importBtnDisabled]}
                activeOpacity={0.8}
                disabled={!rawText.trim()}
              >
                <Ionicons name="eye-outline" size={18} color="#fff" />
                <Text style={styles.importBtnText}>Preview Import</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  decorCircle1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.05)', top: -80, right: -60,
  },
  decorCircle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: 80, left: -40,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 16,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, fontSize: 20, color: '#fff', textAlign: 'center', fontFamily: UI.typography.bold,
  },
  content: {
    paddingHorizontal: 20, paddingBottom: 120, gap: 16,
  },

  // Input view
  inputContainer: { gap: 16 },
  instructionCard: { borderRadius: 20, padding: 18, gap: 10 },
  instructionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  instructionTitle: { fontSize: 16, color: Colors.textPrimary, fontFamily: UI.typography.bold },
  instructionText: { fontSize: 13, color: Colors.textSecondary, fontFamily: UI.typography.medium },
  formatExamples: {
    backgroundColor: Colors.surfaceMuted, borderRadius: 10, padding: 12, gap: 4,
  },
  formatCode: {
    fontSize: 12, color: Colors.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  instructionHint: {
    fontSize: 12, color: Colors.textMuted, fontFamily: UI.typography.medium, fontStyle: 'italic',
  },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16,
    padding: 16, minHeight: 200, fontSize: 14,
    fontFamily: UI.typography.medium, color: Colors.textPrimary,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  importBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: UI.radius.lg,
    backgroundColor: Colors.primary,
  },
  importBtnDisabled: { opacity: 0.5 },
  importBtnText: { color: '#fff', fontSize: 15, fontFamily: UI.typography.bold },

  // Preview view
  previewContainer: { gap: 16 },
  previewCard: { borderRadius: 20, padding: 18, gap: 12 },
  previewHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  previewTitle: { fontSize: 16, color: Colors.textPrimary, fontFamily: UI.typography.bold },
  editLink: { fontSize: 14, color: Colors.primary, fontFamily: UI.typography.semibold },
  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderSoft,
  },
  previewCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.blueSoft, alignItems: 'center', justifyContent: 'center',
  },
  previewCircleText: { fontSize: 13, fontFamily: UI.typography.bold, color: Colors.primary },
  previewName: { fontSize: 15, color: Colors.textPrimary, fontFamily: UI.typography.semibold },
  previewMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 2 },
  previewEmail: { fontSize: 12, color: Colors.textSecondary, fontFamily: UI.typography.medium },
  previewNoEmail: { fontSize: 12, color: Colors.textMuted, fontFamily: UI.typography.medium, fontStyle: 'italic' },
  previewPositions: { fontSize: 12, color: Colors.primary, fontFamily: UI.typography.semibold },

  // Results view
  resultsContainer: { gap: 16 },
  resultCard: { borderRadius: 20, padding: 18, gap: 8 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  resultIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 16, color: Colors.textPrimary, fontFamily: UI.typography.bold },
  resultName: { fontSize: 14, color: Colors.textSecondary, fontFamily: UI.typography.medium, paddingLeft: 42 },
  notFoundHint: {
    fontSize: 12, color: Colors.textMuted, fontFamily: UI.typography.medium,
    paddingLeft: 42, marginBottom: 4, fontStyle: 'italic',
  },
  resultActions: { flexDirection: 'row', gap: 12 },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: UI.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 1, borderColor: Colors.primary,
  },
  secondaryBtnText: { fontSize: 14, color: Colors.primary, fontFamily: UI.typography.bold },
  primaryBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: UI.radius.lg,
    backgroundColor: Colors.primary,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontFamily: UI.typography.bold },
});
