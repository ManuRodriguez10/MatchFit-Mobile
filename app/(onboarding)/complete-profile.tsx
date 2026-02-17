import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { PlayerPosition } from '@/types/database';

const POSITIONS: { key: PlayerPosition; abbr: string; label: string; icon: string }[] = [
  { key: 'goalkeeper', abbr: 'GK', label: 'Goalkeeper', icon: 'hand-left-outline' },
  { key: 'defender', abbr: 'DEF', label: 'Defender', icon: 'shield-outline' },
  { key: 'midfielder', abbr: 'MID', label: 'Midfielder', icon: 'swap-horizontal-outline' },
  { key: 'forward', abbr: 'FWD', label: 'Forward', icon: 'flash-outline' },
];

export default function CompleteProfileScreen() {
  const { user, completeOnboarding, signOut } = useAuth();
  const { teamId, teamName } = useLocalSearchParams<{ teamId: string; teamName: string }>();

  // Basic Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');

  // Soccer Details
  const [positions, setPositions] = useState<PlayerPosition[]>([]);
  const [jerseyNumber, setJerseyNumber] = useState('');

  // Physical
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weightLbs, setWeightLbs] = useState('');

  // Contact
  const [phone, setPhone] = useState('');

  // UI State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const handleDobChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let fmt = digits;
    if (digits.length > 2) fmt = digits.slice(0, 2) + '/' + digits.slice(2);
    if (digits.length > 4) fmt = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4);
    setDateOfBirth(fmt);
    if (errors.dateOfBirth) setErrors(e => ({ ...e, dateOfBirth: '' }));
  };

  const togglePosition = (pos: PlayerPosition) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPositions(prev => (prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]));
    if (errors.positions) setErrors(e => ({ ...e, positions: '' }));
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signOut();
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';

    const dobCleaned = dateOfBirth.trim();
    const dobRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
    if (!dobCleaned) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else if (!dobRegex.test(dobCleaned)) {
      newErrors.dateOfBirth = 'Enter a valid date (MM/DD/YYYY)';
    } else {
      const [mm, dd, yyyy] = dobCleaned.split('/');
      const dob = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      const age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (isNaN(dob.getTime()) || age < 5 || age > 100) {
        newErrors.dateOfBirth = 'Enter a valid date of birth';
      }
    }

    if (!nationality.trim()) newErrors.nationality = 'Nationality is required';
    if (positions.length === 0) newErrors.positions = 'Select at least one position';

    const jersey = parseInt(jerseyNumber, 10);
    if (!jerseyNumber.trim()) {
      newErrors.jerseyNumber = 'Jersey number is required';
    } else if (isNaN(jersey) || jersey < 1 || jersey > 99) {
      newErrors.jerseyNumber = 'Must be between 1 and 99';
    }

    const ft = parseInt(heightFt, 10);
    const ins = parseInt(heightIn, 10);
    if (!heightFt.trim()) {
      newErrors.heightFt = 'Required';
    } else if (isNaN(ft) || ft < 3 || ft > 8) {
      newErrors.heightFt = '3–8 ft';
    }
    if (!heightIn.trim()) {
      newErrors.heightIn = 'Required';
    } else if (isNaN(ins) || ins < 0 || ins > 11) {
      newErrors.heightIn = '0–11 in';
    }

    const weight = parseInt(weightLbs, 10);
    if (!weightLbs.trim()) {
      newErrors.weightLbs = 'Weight is required';
    } else if (isNaN(weight) || weight < 50 || weight > 500) {
      newErrors.weightLbs = 'Enter a valid weight';
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

      // 1. Check jersey uniqueness before inserting
      const { data: jerseyAvailable, error: jerseyFnError } = await supabase.rpc(
        'check_jersey_available',
        {
          p_team_id: teamId,
          p_jersey_number: jersey,
        }
      );

      if (jerseyFnError) throw jerseyFnError;

      if (!jerseyAvailable) {
        setErrors(prev => ({
          ...prev,
          jerseyNumber: `Jersey #${jersey} is already taken on this team`,
        }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false);
        return;
      }

      // 2. Parse date of birth: "MM/DD/YYYY" → "YYYY-MM-DD"
      const [mm, dd, yyyy] = dateOfBirth.split('/');
      const isoDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;

      // 3. UPDATE profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          date_of_birth: isoDate,
          nationality: nationality.trim(),
          phone: phone.trim() || null,
          height_ft: parseInt(heightFt, 10),
          height_in: parseInt(heightIn, 10),
          weight_lbs: parseInt(weightLbs, 10),
        })
        .eq('id', user!.id);

      if (profileError) throw profileError;

      // 4. INSERT into team_players
      const { error: playerError } = await supabase.from('team_players').insert({
        team_id: teamId,
        player_id: user!.id,
        jersey_number: jersey,
        positions: positions,
      });

      if (playerError) {
        // Handle Postgres unique violation
        if (playerError.code === '23505') {
          if (playerError.message?.includes('jersey_number')) {
            setErrors(prev => ({
              ...prev,
              jerseyNumber: `Jersey #${jersey} was just taken. Choose another.`,
            }));
          } else if (
            playerError.message?.includes('team_id') &&
            playerError.message?.includes('player_id')
          ) {
            setGeneralError("You're already on this team.");
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setLoading(false);
          return;
        }
        throw playerError;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 5. Mark onboarding complete
      await completeOnboarding();
    } catch (error) {
      setGeneralError(
        error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Header with icon */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.headerSection}>
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.teamIconCircle}
            >
              <Ionicons name="football" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>Fill in your information for {teamName}</Text>
          </Animated.View>

          {/* Form card */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.cardContainer}>
            <BlurView intensity={40} tint="light" style={styles.blurContainer}>
              <View style={styles.card}>
                {/* MatchFit Icon inside card */}
                <View style={styles.cardIconRow}>
                  <Image
                    source={require('@/assets/logo-icon.png')}
                    style={styles.cardIconImg}
                    resizeMode="contain"
                  />
                </View>

                {/* General error */}
                {generalError ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                    <Text style={styles.errorBannerText}>{generalError}</Text>
                  </View>
                ) : null}

                {/* ═══ BASIC INFO ═══ */}
                <Text style={styles.sectionTitle}>Basic Information</Text>

                <Input
                  label="First Name"
                  icon="person-outline"
                  value={firstName}
                  onChangeText={text => {
                    setFirstName(text);
                    if (errors.firstName) setErrors(e => ({ ...e, firstName: '' }));
                  }}
                  error={errors.firstName}
                  editable={!loading}
                  containerStyle={styles.inputContainer}
                  autoCapitalize="words"
                />

                <Input
                  label="Last Name"
                  icon="person-outline"
                  value={lastName}
                  onChangeText={text => {
                    setLastName(text);
                    if (errors.lastName) setErrors(e => ({ ...e, lastName: '' }));
                  }}
                  error={errors.lastName}
                  editable={!loading}
                  containerStyle={styles.inputContainer}
                  autoCapitalize="words"
                />

                <Input
                  label="Date of Birth"
                  icon="calendar-outline"
                  placeholder="MM/DD/YYYY"
                  value={dateOfBirth}
                  onChangeText={handleDobChange}
                  error={errors.dateOfBirth}
                  editable={!loading}
                  containerStyle={styles.inputContainer}
                  keyboardType="numeric"
                  maxLength={10}
                />

                <Input
                  label="Nationality"
                  icon="flag-outline"
                  value={nationality}
                  onChangeText={text => {
                    setNationality(text);
                    if (errors.nationality) setErrors(e => ({ ...e, nationality: '' }));
                  }}
                  error={errors.nationality}
                  editable={!loading}
                  containerStyle={styles.inputContainer}
                  autoCapitalize="words"
                />

                {/* Divider */}
                <View style={styles.divider} />

                {/* ═══ SOCCER DETAILS ═══ */}
                <Text style={styles.sectionTitle}>Soccer Details</Text>

                <Text style={styles.fieldLabel}>Playing Position</Text>
                <View style={styles.positionGrid}>
                  {POSITIONS.map((pos, idx) => (
                    <TouchableOpacity
                      key={pos.key}
                      style={[
                        styles.positionCard,
                        positions.includes(pos.key) && styles.positionCardActive,
                        idx % 2 === 1 && styles.positionCardRight,
                      ]}
                      onPress={() => togglePosition(pos.key)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={pos.icon}
                        size={24}
                        color={positions.includes(pos.key) ? Colors.primary : Colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.positionAbbr,
                          positions.includes(pos.key) && styles.positionAbbrActive,
                        ]}
                      >
                        {pos.abbr}
                      </Text>
                      <Text
                        style={[
                          styles.positionLabel,
                          positions.includes(pos.key) && styles.positionLabelActive,
                        ]}
                      >
                        {pos.label}
                      </Text>
                      {positions.includes(pos.key) && (
                        <View style={styles.positionCheckmark}>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.positions ? (
                  <Text style={styles.errorText}>{errors.positions}</Text>
                ) : null}

                <Input
                  label="Jersey Number"
                  icon="shirt-outline"
                  value={jerseyNumber}
                  onChangeText={text => {
                    setJerseyNumber(text);
                    if (errors.jerseyNumber) setErrors(e => ({ ...e, jerseyNumber: '' }));
                  }}
                  error={errors.jerseyNumber}
                  editable={!loading}
                  containerStyle={styles.inputContainer}
                  keyboardType="number-pad"
                  maxLength={2}
                />

                {/* Divider */}
                <View style={styles.divider} />

                {/* ═══ PHYSICAL INFO ═══ */}
                <Text style={styles.sectionTitle}>Physical Information</Text>

                <View style={styles.heightRow}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Height (Ft)"
                      value={heightFt}
                      onChangeText={text => {
                        setHeightFt(text);
                        if (errors.heightFt) setErrors(e => ({ ...e, heightFt: '' }));
                      }}
                      error={errors.heightFt}
                      editable={!loading}
                      containerStyle={styles.inputContainer}
                      keyboardType="number-pad"
                      maxLength={1}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Height (In)"
                      value={heightIn}
                      onChangeText={text => {
                        setHeightIn(text);
                        if (errors.heightIn) setErrors(e => ({ ...e, heightIn: '' }));
                      }}
                      error={errors.heightIn}
                      editable={!loading}
                      containerStyle={styles.inputContainer}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                </View>

                <Input
                  label="Weight (lbs)"
                  icon="barbell-outline"
                  value={weightLbs}
                  onChangeText={text => {
                    setWeightLbs(text);
                    if (errors.weightLbs) setErrors(e => ({ ...e, weightLbs: '' }));
                  }}
                  error={errors.weightLbs}
                  editable={!loading}
                  containerStyle={styles.inputContainer}
                  keyboardType="number-pad"
                />

                {/* Divider */}
                <View style={styles.divider} />

                {/* ═══ CONTACT ═══ */}
                <Text style={styles.sectionTitle}>Contact Information</Text>

                <Input
                  label="Phone Number"
                  icon="call-outline"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChangeText={setPhone}
                  editable={!loading}
                  containerStyle={styles.inputContainer}
                  keyboardType="phone-pad"
                />

                {/* Submit Button */}
                <Button
                  title="Complete Profile"
                  onPress={handleSubmit}
                  loading={loading}
                  disabled={loading}
                  style={styles.submitButton}
                />
              </View>
            </BlurView>
          </Animated.View>

          {/* Step indicator - 2 dots, second one active */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.stepIndicator}>
            <View style={styles.stepDot} />
            <View style={[styles.stepDot, styles.stepDotActive]} />
          </Animated.View>

          {/* Sign Out — subtle, at the bottom */}
          <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.logoutRow}>
            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.logoutButton}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={16} color="rgba(255,255,255,0.55)" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: -80,
    right: -60,
  },
  decorCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    bottom: 60,
    left: -40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  teamIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardIconRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconImg: {
    width: 40,
    height: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  cardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 24,
  },
  blurContainer: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    padding: 24,
    borderRadius: 24,
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
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 12,
  },
  positionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
  },
  positionCard: {
    width: '48%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  positionCardRight: {
    marginLeft: 'auto',
  },
  positionCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionAbbr: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 6,
  },
  positionAbbrActive: {
    color: Colors.primary,
  },
  positionLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  positionLabelActive: {
    color: Colors.primary,
  },
  heightRow: {
    flexDirection: 'row',
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: -8,
    marginBottom: 12,
  },
  submitButton: {
    marginTop: 12,
    marginBottom: 8,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  stepDotActive: {
    backgroundColor: '#fff',
    width: 20,
    borderRadius: 4,
  },
  logoutRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: Colors.error,
    borderRadius: 14,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
  },
});
