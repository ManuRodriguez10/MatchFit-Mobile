import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from '@/utils/reanimated-shim';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import GradientText from '@/components/ui/GradientText';
import { PlayerPosition } from '@/types/database';

const POSITIONS: { key: PlayerPosition; abbr: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'goalkeeper', abbr: 'GK', label: 'Goalkeeper', icon: 'hand-left-outline' },
  { key: 'defender', abbr: 'DEF', label: 'Defender', icon: 'shield-outline' },
  { key: 'midfielder', abbr: 'MID', label: 'Midfielder', icon: 'swap-horizontal-outline' },
  { key: 'forward', abbr: 'FWD', label: 'Forward', icon: 'flash-outline' },
];

const POSITION_COLORS: Record<PlayerPosition, string> = {
  goalkeeper: '#EAB308',
  defender: '#8B5CF6',
  midfielder: '#10B981',
  forward: '#EF4444',
};

export default function TeamSetupScreen() {
  const { user, profile } = useAuth();
  const { teamId, teamName } = useLocalSearchParams<{ teamId: string; teamName: string }>();

  // Team-specific fields
  const [positions, setPositions] = useState<PlayerPosition[]>([]);
  const [jerseyNumber, setJerseyNumber] = useState('');

  // Profile fields (pre-filled)
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');

  // UI State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Pre-fill profile data
  useEffect(() => {
    if (profile) {
      if (profile.height_ft != null) setHeightFt(String(profile.height_ft));
      if (profile.height_in != null) setHeightIn(String(profile.height_in));
      if (profile.weight_lbs != null) setWeightLbs(String(profile.weight_lbs));
      if (profile.nationality) setNationality(profile.nationality);
      if (profile.date_of_birth) {
        // Convert ISO date to MM/DD/YYYY
        const d = new Date(profile.date_of_birth);
        if (!isNaN(d.getTime())) {
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const yyyy = d.getFullYear();
          setDateOfBirth(`${mm}/${dd}/${yyyy}`);
        }
      }
    }
  }, [profile]);

  const togglePosition = (pos: PlayerPosition) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPositions(prev => (prev.includes(pos) ? [] : [pos]));
    if (errors.positions) setErrors(e => ({ ...e, positions: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (positions.length === 0) newErrors.positions = 'Select a position';

    const jersey = parseInt(jerseyNumber, 10);
    if (!jerseyNumber.trim()) {
      newErrors.jerseyNumber = 'Jersey number is required';
    } else if (isNaN(jersey) || jersey < 1 || jersey > 99) {
      newErrors.jerseyNumber = 'Must be between 1 and 99';
    }

    const ft = parseInt(heightFt, 10);
    const ins = parseInt(heightIn, 10);
    if (heightFt.trim() && (isNaN(ft) || ft < 3 || ft > 8)) {
      newErrors.heightFt = '3–8 ft';
    }
    if (heightIn.trim() && (isNaN(ins) || ins < 0 || ins > 11)) {
      newErrors.heightIn = '0–11 in';
    }

    const weight = parseInt(weightLbs, 10);
    if (weightLbs.trim() && (isNaN(weight) || weight < 50 || weight > 500)) {
      newErrors.weightLbs = 'Enter a valid weight';
    }

    if (dateOfBirth.trim()) {
      const [mm, dd, yyyy] = dateOfBirth.split('/');
      const m = parseInt(mm, 10);
      const d = parseInt(dd, 10);
      const y = parseInt(yyyy, 10);
      const parsed = new Date(y, m - 1, d);
      if (!mm || !dd || !yyyy || isNaN(parsed.getTime()) || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) {
        newErrors.dateOfBirth = 'Enter a valid date (MM/DD/YYYY)';
      } else if (y < 1940 || parsed > new Date()) {
        newErrors.dateOfBirth = 'Enter a realistic date of birth';
      }
    }

    if (nationality.trim().length > 50) {
      newErrors.nationality = 'Must be 50 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setGeneralError('');

    try {
      const jersey = parseInt(jerseyNumber, 10);

      // Update profile if any fields changed
      const profileUpdates: Record<string, any> = {};
      if (heightFt.trim()) profileUpdates.height_ft = parseInt(heightFt, 10);
      if (heightIn.trim()) profileUpdates.height_in = parseInt(heightIn, 10);
      if (weightLbs.trim()) profileUpdates.weight_lbs = parseInt(weightLbs, 10);
      if (nationality.trim()) profileUpdates.nationality = nationality.trim();
      if (dateOfBirth.trim()) {
        const [mm, dd, yyyy] = dateOfBirth.split('/');
        if (mm && dd && yyyy) {
          profileUpdates.date_of_birth = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
        }
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', user!.id);

        if (profileError) throw profileError;
      }

      // Insert team_players record (DB unique constraint handles race conditions)
      const { error: playerError } = await supabase.from('team_players').insert({
        team_id: teamId,
        player_id: user!.id,
        jersey_number: jersey,
        positions: positions,
      });

      if (playerError) {
        if (playerError.code === '23505') {
          if (playerError.message?.includes('jersey_number')) {
            setErrors(prev => ({
              ...prev,
              jerseyNumber: `Jersey #${jersey} was just taken. Choose another.`,
            }));
          } else {
            setGeneralError("You're already on this team.");
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setLoading(false);
          return;
        }
        throw playerError;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Welcome!',
        `You've joined ${teamName}!`,
        [{ text: 'View Team', onPress: () => router.replace('/(tabs)/team') }],
      );
    } catch (error: any) {
      if (__DEV__) console.error('Team setup error:', JSON.stringify(error));
      setGeneralError(error?.message ?? 'Something went wrong. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.handle} />

        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <GradientText
            text="Team Setup"
            style={styles.headerTitle}
            colors={['#118FF3', '#0C5798']}
          />
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Team info */}
        <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.iconSection}>
          <LinearGradient
            colors={Gradients.primary as unknown as string[]}
            style={styles.teamIcon}
          >
            <Ionicons name="shirt" size={36} color="#fff" />
          </LinearGradient>
          <Text style={styles.teamNameLabel}>Joining</Text>
          <Text style={styles.teamNameValue}>{teamName}</Text>
          <Text style={styles.subtitle}>Set up your position and jersey for this team</Text>
        </Animated.View>

        {/* General error */}
        {generalError ? (
          <Animated.View entering={FadeIn.duration(300)} style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
            <Text style={styles.errorBannerText}>{generalError}</Text>
          </Animated.View>
        ) : null}

        {/* Position Selector */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Text style={styles.sectionTitle}>Position</Text>
          {errors.positions ? <Text style={styles.fieldError}>{errors.positions}</Text> : null}
          <View style={styles.positionGrid}>
            {POSITIONS.map((pos) => {
              const selected = positions.includes(pos.key);
              const color = POSITION_COLORS[pos.key];
              return (
                <TouchableOpacity
                  key={pos.key}
                  style={[
                    styles.positionCard,
                    selected && { borderColor: color, backgroundColor: `${color}10` },
                  ]}
                  onPress={() => togglePosition(pos.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={pos.icon} size={24} color={selected ? color : Colors.textMuted} />
                  <Text style={[styles.positionLabel, selected && { color }]}>{pos.label}</Text>
                  <Text style={[styles.positionAbbr, selected && { color }]}>{pos.abbr}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Jersey Number */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Input
            label="Jersey Number"
            icon="shirt-outline"
            value={jerseyNumber}
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, '').slice(0, 2);
              setJerseyNumber(digits);
              if (errors.jerseyNumber) setErrors(e => ({ ...e, jerseyNumber: '' }));
            }}
            error={errors.jerseyNumber}
            editable={!loading}
            containerStyle={styles.inputContainer}
            keyboardType="number-pad"
            returnKeyType="done"
          />
        </Animated.View>

        {/* Profile Review Section */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Review Your Profile</Text>
          <Text style={styles.sectionSubtitle}>Update if anything has changed</Text>

          {/* Height */}
          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Input
                label="Height (ft)"
                icon="resize-outline"
                value={heightFt}
                onChangeText={(text) => {
                  setHeightFt(text.replace(/\D/g, '').slice(0, 1));
                  if (errors.heightFt) setErrors(e => ({ ...e, heightFt: '' }));
                }}
                error={errors.heightFt}
                editable={!loading}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Height (in)"
                icon="resize-outline"
                value={heightIn}
                onChangeText={(text) => {
                  setHeightIn(text.replace(/\D/g, '').slice(0, 2));
                  if (errors.heightIn) setErrors(e => ({ ...e, heightIn: '' }));
                }}
                error={errors.heightIn}
                editable={!loading}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Weight */}
          <Input
            label="Weight (lbs)"
            icon="barbell-outline"
            value={weightLbs}
            onChangeText={(text) => {
              setWeightLbs(text.replace(/\D/g, '').slice(0, 3));
              if (errors.weightLbs) setErrors(e => ({ ...e, weightLbs: '' }));
            }}
            error={errors.weightLbs}
            editable={!loading}
            containerStyle={styles.inputContainer}
            keyboardType="number-pad"
          />

          {/* DOB */}
          <Input
            label="Date of Birth (MM/DD/YYYY)"
            icon="calendar-outline"
            value={dateOfBirth}
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, '').slice(0, 8);
              let formatted = digits;
              if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
              else if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
              setDateOfBirth(formatted);
            }}
            editable={!loading}
            containerStyle={styles.inputContainer}
            keyboardType="number-pad"
          />

          {/* Nationality */}
          <Input
            label="Nationality"
            icon="globe-outline"
            value={nationality}
            onChangeText={setNationality}
            editable={!loading}
            containerStyle={styles.inputContainer}
          />
        </Animated.View>

        {/* Submit */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Button
            title="Join Team"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
          />
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: UI.typography.bold,
    color: Colors.textPrimary,
  },
  headerSpacer: { width: 36 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  teamIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  teamNameLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontFamily: UI.typography.medium,
    marginBottom: 4,
  },
  teamNameValue: {
    fontSize: 20,
    color: Colors.textPrimary,
    fontFamily: UI.typography.bold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: UI.typography.medium,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 18,
    fontFamily: UI.typography.medium,
  },
  sectionTitle: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: UI.typography.bold,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: UI.typography.medium,
    marginTop: -8,
    marginBottom: 16,
  },
  fieldError: {
    fontSize: 12,
    color: Colors.error,
    fontFamily: UI.typography.medium,
    marginBottom: 8,
    marginTop: -8,
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  positionCard: {
    width: '47%',
    flexGrow: 1,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.backgroundLight,
  },
  positionLabel: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: UI.typography.semibold,
  },
  positionAbbr: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: UI.typography.bold,
  },
  inputContainer: {
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  submitButton: {
    marginTop: 12,
  },
});
