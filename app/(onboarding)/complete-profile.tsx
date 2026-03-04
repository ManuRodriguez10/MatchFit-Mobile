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
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from '@/utils/reanimated-shim';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { PlayerPosition } from '@/types/database';
import GradientText from '@/components/ui/GradientText';

const POSITIONS: { key: PlayerPosition; abbr: string; label: string; icon: string }[] = [
  { key: 'goalkeeper', abbr: 'GK', label: 'Goalkeeper', icon: 'hand-left-outline' },
  { key: 'defender', abbr: 'DEF', label: 'Defender', icon: 'shield-outline' },
  { key: 'midfielder', abbr: 'MID', label: 'Midfielder', icon: 'swap-horizontal-outline' },
  { key: 'forward', abbr: 'FWD', label: 'Forward', icon: 'flash-outline' },
];

const COUNTRY_OPTIONS = [
  'Argentina', 'Australia', 'Brazil', 'Canada', 'Chile', 'China', 'Colombia', 'Costa Rica',
  'Croatia', 'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'England',
  'France', 'Germany', 'Ghana', 'Greece', 'Guatemala', 'Haiti', 'Honduras', 'India', 'Ireland',
  'Italy', 'Jamaica', 'Japan', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand', 'Nigeria',
  'Norway', 'Panama', 'Paraguay', 'Peru', 'Poland', 'Portugal', 'Puerto Rico', 'Scotland',
  'Senegal', 'Serbia', 'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Turkey',
  'United States', 'Uruguay', 'Venezuela', 'Wales',
];

const COUNTRY_CODES = [
  { name: 'United States', dial: '+1', flag: '🇺🇸' },
  { name: 'Dominican Republic', dial: '+1', flag: '🇩🇴' },
  { name: 'Puerto Rico', dial: '+1', flag: '🇵🇷' },
  { name: 'Jamaica', dial: '+1', flag: '🇯🇲' },
  { name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { name: 'Argentina', dial: '+54', flag: '🇦🇷' },
  { name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { name: 'Chile', dial: '+56', flag: '🇨🇱' },
  { name: 'Colombia', dial: '+57', flag: '🇨🇴' },
  { name: 'Venezuela', dial: '+58', flag: '🇻🇪' },
  { name: 'Peru', dial: '+51', flag: '🇵🇪' },
  { name: 'Ecuador', dial: '+593', flag: '🇪🇨' },
  { name: 'Guatemala', dial: '+502', flag: '🇬🇹' },
  { name: 'Honduras', dial: '+504', flag: '🇭🇳' },
  { name: 'El Salvador', dial: '+503', flag: '🇸🇻' },
  { name: 'Costa Rica', dial: '+506', flag: '🇨🇷' },
  { name: 'Panama', dial: '+507', flag: '🇵🇦' },
  { name: 'Paraguay', dial: '+595', flag: '🇵🇾' },
  { name: 'Uruguay', dial: '+598', flag: '🇺🇾' },
  { name: 'Haiti', dial: '+509', flag: '🇭🇹' },
  { name: 'England', dial: '+44', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'Scotland', dial: '+44', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { name: 'Wales', dial: '+44', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { name: 'Ireland', dial: '+353', flag: '🇮🇪' },
  { name: 'France', dial: '+33', flag: '🇫🇷' },
  { name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { name: 'Norway', dial: '+47', flag: '🇳🇴' },
  { name: 'Denmark', dial: '+45', flag: '🇩🇰' },
  { name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
  { name: 'Poland', dial: '+48', flag: '🇵🇱' },
  { name: 'Croatia', dial: '+385', flag: '🇭🇷' },
  { name: 'Serbia', dial: '+381', flag: '🇷🇸' },
  { name: 'Greece', dial: '+30', flag: '🇬🇷' },
  { name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { name: 'Ghana', dial: '+233', flag: '🇬🇭' },
  { name: 'Senegal', dial: '+221', flag: '🇸🇳' },
  { name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { name: 'Morocco', dial: '+212', flag: '🇲🇦' },
  { name: 'Egypt', dial: '+20', flag: '🇪🇬' },
  { name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { name: 'South Korea', dial: '+82', flag: '🇰🇷' },
  { name: 'China', dial: '+86', flag: '🇨🇳' },
  { name: 'India', dial: '+91', flag: '🇮🇳' },
  { name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
];

const CALENDAR_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CALENDAR_MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const STEPS = [
  { key: 'basic', title: 'Basic Information' },
  { key: 'soccer', title: 'Soccer Details' },
  { key: 'physical', title: 'Physical Information' },
] as const;

function parseDateStr(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

function formatDateForInput(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function monthLabel(d: Date): string {
  return `${CALENDAR_MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildCalendarGrid(monthDate: Date): Date[] {
  const first = startOfMonth(monthDate);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

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
  const [selectedCountryCode, setSelectedCountryCode] = useState(COUNTRY_CODES[0]);
  const [showPhoneCodePicker, setShowPhoneCodePicker] = useState(false);
  const [phoneCodeQuery, setPhoneCodeQuery] = useState('');

  // UI State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [dobCalendarMonth, setDobCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [dobPickerMode, setDobPickerMode] = useState<'calendar' | 'year' | 'month'>('calendar');
  const [dobPickerYearPage, setDobPickerYearPage] = useState(() => Math.floor(new Date().getFullYear() / 12) * 12);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');

  const togglePosition = (pos: PlayerPosition) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPositions(prev => (prev.includes(pos) ? [] : [pos]));
    if (errors.positions) setErrors(e => ({ ...e, positions: '' }));
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await signOut();
  };

  const getBasicErrors = (): Record<string, string> => {
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

    const phoneCleaned = phone.replace(/\D/g, '');
    if (phoneCleaned.length > 0 && (phoneCleaned.length < 7 || phoneCleaned.length > 15)) {
      newErrors.phone = 'Enter a valid phone number (7–15 digits)';
    }

    return newErrors;
  };

  const getSoccerErrors = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (positions.length === 0) newErrors.positions = 'Select a position';

    const jersey = parseInt(jerseyNumber, 10);
    if (!jerseyNumber.trim()) {
      newErrors.jerseyNumber = 'Jersey number is required';
    } else if (isNaN(jersey) || jersey < 1 || jersey > 99) {
      newErrors.jerseyNumber = 'Must be between 1 and 99';
    }
    return newErrors;
  };

  const getPhysicalErrors = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};
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
    return newErrors;
  };

  const applyStepErrors = (stepIndex: number, stepErrors: Record<string, string>) => {
    const stepFieldsByIndex = [
      ['firstName', 'lastName', 'dateOfBirth', 'nationality', 'phone'],
      ['positions', 'jerseyNumber'],
      ['heightFt', 'heightIn', 'weightLbs'],
    ];
    const stepFields = stepFieldsByIndex[stepIndex] ?? [];
    setErrors(prev => {
      const next = { ...prev };
      stepFields.forEach((field) => {
        delete next[field];
      });
      return { ...next, ...stepErrors };
    });
  };

  const getStepErrors = (stepIndex: number): Record<string, string> => {
    if (stepIndex === 0) return getBasicErrors();
    if (stepIndex === 1) return getSoccerErrors();
    return getPhysicalErrors();
  };

  const validateAll = (): boolean => {
    const newErrors = {
      ...getBasicErrors(),
      ...getSoccerErrors(),
      ...getPhysicalErrors(),
    };
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    const stepErrors = getStepErrors(currentStep);
    applyStepErrors(currentStep, stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const dobCalendarDays = buildCalendarGrid(dobCalendarMonth);
  const selectedDob = parseDateStr(dateOfBirth);
  const filteredCountries = COUNTRY_OPTIONS.filter((country) =>
    country.toLowerCase().includes(countryQuery.trim().toLowerCase()),
  );
  const filteredPhoneCodes = COUNTRY_CODES.filter((cc) =>
    cc.name.toLowerCase().includes(phoneCodeQuery.trim().toLowerCase()) ||
    cc.dial.includes(phoneCodeQuery.trim()),
  );

  const handlePhoneChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, 15);
    setPhone(digitsOnly);
    if (errors.phone) setErrors(e => ({ ...e, phone: '' }));
  };

  const openDobPicker = () => {
    const parsed = parseDateStr(dateOfBirth) ?? new Date();
    setDobCalendarMonth(startOfMonth(parsed));
    setDobPickerMode('calendar');
    setDobPickerYearPage(Math.floor(parsed.getFullYear() / 12) * 12);
    setShowDobPicker(true);
  };

  const selectDobFromPicker = (selectedDate: Date) => {
    setDateOfBirth(formatDateForInput(selectedDate));
    if (errors.dateOfBirth) setErrors(e => ({ ...e, dateOfBirth: '' }));
    setShowDobPicker(false);
  };

  const openCountryPicker = () => {
    setCountryQuery('');
    setShowCountryPicker(true);
  };

  const selectCountry = (country: string) => {
    setNationality(country);
    if (errors.nationality) setErrors(e => ({ ...e, nationality: '' }));
    setShowCountryPicker(false);
  };

  const handleSubmit = async () => {
    if (!validateAll()) {
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
          phone: phone.trim() ? `${selectedCountryCode.dial}${phone.trim()}` : null,
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
    } catch (error: any) {
      console.error('Profile submit error:', JSON.stringify(error));
      const msg =
        error?.message ??
        (typeof error === 'string' ? error : 'Something went wrong. Please try again.');
      setGeneralError(msg);
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
            <GradientText
              text="Complete Your Profile"
              style={styles.title}
              colors={['#FFFFFF', '#D4EBFC']}
            />
            <Text style={styles.subtitle}>Fill in your information for {teamName}</Text>
          </Animated.View>

          {/* Form card */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.cardContainer}>
            <BlurView intensity={40} tint="light" style={styles.blurContainer}>
              <View style={styles.card}>
                {/* MatchFit Icon inside card */}
                <View style={styles.cardIconRow}>
                  <Image
                    source={require('../../assets/logo-icon.png')}
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

                <View style={styles.stepHeaderRow}>
                  <Text style={styles.stepMetaText}>Step {currentStep + 1} of {STEPS.length}</Text>
                  <Text style={styles.stepMetaLabel}>{STEPS[currentStep].title}</Text>
                </View>

                {currentStep === 0 && (
                  <>
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

                    <View style={styles.inputContainer}>
                      <TouchableOpacity
                        style={[
                          styles.selectField,
                          errors.dateOfBirth ? styles.selectFieldError : null,
                        ]}
                        onPress={openDobPicker}
                        activeOpacity={0.8}
                        disabled={loading}
                      >
                        <Ionicons name="calendar-outline" size={20} color={Colors.textSecondary} />
                        <Text
                          style={[
                            styles.selectFieldText,
                            !dateOfBirth && styles.selectFieldPlaceholder,
                          ]}
                        >
                          {dateOfBirth || 'Date of Birth'}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
                      </TouchableOpacity>
                      {errors.dateOfBirth ? (
                        <Text style={styles.errorTextInline}>{errors.dateOfBirth}</Text>
                      ) : null}
                    </View>

                    <View style={styles.inputContainer}>
                      <TouchableOpacity
                        style={[
                          styles.selectField,
                          errors.nationality ? styles.selectFieldError : null,
                        ]}
                        onPress={openCountryPicker}
                        activeOpacity={0.8}
                        disabled={loading}
                      >
                        <Ionicons name="flag-outline" size={20} color={Colors.textSecondary} />
                        <Text
                          style={[
                            styles.selectFieldText,
                            !nationality && styles.selectFieldPlaceholder,
                          ]}
                        >
                          {nationality || 'Nationality'}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
                      </TouchableOpacity>
                      {errors.nationality ? (
                        <Text style={styles.errorTextInline}>{errors.nationality}</Text>
                      ) : null}
                    </View>

                    <View style={styles.inputContainer}>
                      <View
                        style={[
                          styles.phoneRow,
                          errors.phone ? styles.selectFieldError : null,
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.phoneCodeBtn}
                          onPress={() => {
                            setPhoneCodeQuery('');
                            setShowPhoneCodePicker(true);
                          }}
                          activeOpacity={0.7}
                          disabled={loading}
                        >
                          <Text style={styles.phoneCodeFlag}>{selectedCountryCode.flag}</Text>
                          <Text style={styles.phoneCodeText}>{selectedCountryCode.dial}</Text>
                          <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
                        </TouchableOpacity>
                        <View style={styles.phoneDivider} />
                        <TextInput
                          style={styles.phoneInput}
                          placeholder="Phone Number (Optional)"
                          placeholderTextColor={Colors.textSecondary}
                          value={phone}
                          onChangeText={handlePhoneChange}
                          keyboardType="number-pad"
                          maxLength={15}
                          editable={!loading}
                        />
                      </View>
                      {errors.phone ? (
                        <Text style={styles.errorTextInline}>{errors.phone}</Text>
                      ) : null}
                    </View>
                  </>
                )}

                {currentStep === 1 && (
                  <>
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
                  </>
                )}

                {currentStep === 2 && (
                  <>
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
                  </>
                )}

                <View style={styles.stepActionsRow}>
                  {currentStep === 0 ? (
                    <View style={styles.nextButtonWrap}>
                      <Button
                        title="Next"
                        onPress={handleNext}
                        loading={false}
                        disabled={loading}
                        style={styles.submitButton}
                      />
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBack}
                        activeOpacity={0.8}
                        disabled={loading}
                      >
                        <Ionicons name="arrow-back" size={16} color={Colors.primary} />
                        <Text style={styles.backButtonText}>Back</Text>
                      </TouchableOpacity>
                      <View style={styles.nextButtonWrap}>
                        <Button
                          title={currentStep === STEPS.length - 1 ? 'Complete Profile' : 'Next'}
                          onPress={currentStep === STEPS.length - 1 ? handleSubmit : handleNext}
                          loading={loading && currentStep === STEPS.length - 1}
                          disabled={loading}
                          style={styles.submitButton}
                        />
                      </View>
                    </>
                  )}
                </View>
              </View>
            </BlurView>
          </Animated.View>

          {/* Step indicator */}
          <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.stepIndicator}>
            {STEPS.map((step, idx) => (
              <View
                key={step.key}
                style={[styles.stepDot, idx === currentStep && styles.stepDotActive]}
              />
            ))}
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

        <Modal
          visible={showDobPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDobPicker(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowDobPicker(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              {dobPickerMode === 'calendar' && (
                <>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity
                      style={styles.modalNavBtn}
                      onPress={() =>
                        setDobCalendarMonth(
                          (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                        )
                      }
                    >
                      <Ionicons name="chevron-back" size={18} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setDobPickerYearPage(Math.floor(dobCalendarMonth.getFullYear() / 12) * 12);
                        setDobPickerMode('year');
                      }}
                      activeOpacity={0.7}
                      style={styles.calendarTitleBtn}
                    >
                      <Text style={styles.modalTitle}>{monthLabel(dobCalendarMonth)}</Text>
                      <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalNavBtn}
                      onPress={() =>
                        setDobCalendarMonth(
                          (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                        )
                      }
                    >
                      <Ionicons name="chevron-forward" size={18} color={Colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.calendarWeekHeader}>
                    {CALENDAR_DAY_LABELS.map((label) => (
                      <Text key={label} style={styles.calendarWeekHeaderText}>
                        {label}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.calendarGrid}>
                    {dobCalendarDays.map((dayObj, idx) => {
                      const inMonth = dayObj.getMonth() === dobCalendarMonth.getMonth();
                      const isSelected = !!selectedDob && sameDay(dayObj, selectedDob);
                      const isFuture = dayObj > new Date();

                      return (
                        <TouchableOpacity
                          key={`${dayObj.toISOString()}-${idx}`}
                          style={[
                            styles.calendarDayCell,
                            isSelected && styles.calendarDayCellSelected,
                          ]}
                          disabled={isFuture}
                          onPress={() => selectDobFromPicker(dayObj)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.calendarDayText,
                              !inMonth && styles.calendarDayTextMuted,
                              isFuture && styles.calendarDayTextDisabled,
                              isSelected && styles.calendarDayTextSelected,
                            ]}
                          >
                            {dayObj.getDate()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {dobPickerMode === 'year' && (
                <>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity
                      style={styles.modalNavBtn}
                      onPress={() => setDobPickerYearPage((prev) => prev - 12)}
                    >
                      <Ionicons name="chevron-back" size={18} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                      {dobPickerYearPage} – {dobPickerYearPage + 11}
                    </Text>
                    <TouchableOpacity
                      style={styles.modalNavBtn}
                      onPress={() => setDobPickerYearPage((prev) => prev + 12)}
                    >
                      <Ionicons name="chevron-forward" size={18} color={Colors.textPrimary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.yearGrid}>
                    {Array.from({ length: 12 }, (_, i) => {
                      const yr = dobPickerYearPage + i;
                      const isCurrent = yr === dobCalendarMonth.getFullYear();
                      const isFutureYear = yr > new Date().getFullYear();
                      return (
                        <TouchableOpacity
                          key={yr}
                          style={[styles.yearCell, isCurrent && styles.yearCellSelected]}
                          disabled={isFutureYear}
                          onPress={() => {
                            setDobCalendarMonth(new Date(yr, dobCalendarMonth.getMonth(), 1));
                            setDobPickerMode('month');
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.yearCellText,
                              isCurrent && styles.yearCellTextSelected,
                              isFutureYear && styles.calendarDayTextDisabled,
                            ]}
                          >
                            {yr}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {dobPickerMode === 'month' && (
                <>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity
                      style={styles.modalNavBtn}
                      onPress={() => setDobPickerMode('year')}
                    >
                      <Ionicons name="chevron-back" size={18} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>{dobCalendarMonth.getFullYear()}</Text>
                    <View style={{ width: 30 }} />
                  </View>

                  <View style={styles.monthGrid}>
                    {CALENDAR_MONTH_LABELS.map((label, idx) => {
                      const isCurrent = idx === dobCalendarMonth.getMonth();
                      const now = new Date();
                      const isFutureMonth =
                        dobCalendarMonth.getFullYear() > now.getFullYear() ||
                        (dobCalendarMonth.getFullYear() === now.getFullYear() && idx > now.getMonth());
                      return (
                        <TouchableOpacity
                          key={label}
                          style={[styles.monthCell, isCurrent && styles.monthCellSelected]}
                          disabled={isFutureMonth}
                          onPress={() => {
                            setDobCalendarMonth(new Date(dobCalendarMonth.getFullYear(), idx, 1));
                            setDobPickerMode('calendar');
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.monthCellText,
                              isCurrent && styles.monthCellTextSelected,
                              isFutureMonth && styles.calendarDayTextDisabled,
                            ]}
                          >
                            {label.slice(0, 3)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={showCountryPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCountryPicker(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCountryPicker(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Country</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowCountryPicker(false)}
                >
                  <Ionicons name="close" size={18} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.countrySearchWrap}>
                <Ionicons name="search-outline" size={16} color={Colors.textSecondary} />
                <TextInput
                  style={styles.countrySearchInput}
                  placeholder="Search country"
                  placeholderTextColor={Colors.textMuted}
                  value={countryQuery}
                  onChangeText={setCountryQuery}
                />
              </View>

              <ScrollView
                style={styles.countryList}
                contentContainerStyle={styles.countryListContent}
                keyboardShouldPersistTaps="handled"
              >
                {filteredCountries.length === 0 ? (
                  <Text style={styles.noCountriesText}>No countries found.</Text>
                ) : (
                  filteredCountries.map((country) => {
                    const isActive = nationality === country;
                    return (
                      <TouchableOpacity
                        key={country}
                        style={[styles.countryOption, isActive && styles.countryOptionActive]}
                        onPress={() => selectCountry(country)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.countryOptionText, isActive && styles.countryOptionTextActive]}>
                          {country}
                        </Text>
                        {isActive ? (
                          <Ionicons name="checkmark" size={16} color={Colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal
          visible={showPhoneCodePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPhoneCodePicker(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowPhoneCodePicker(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Country Code</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowPhoneCodePicker(false)}
                >
                  <Ionicons name="close" size={18} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.countrySearchWrap}>
                <Ionicons name="search-outline" size={16} color={Colors.textSecondary} />
                <TextInput
                  style={styles.countrySearchInput}
                  placeholder="Search country or code"
                  placeholderTextColor={Colors.textMuted}
                  value={phoneCodeQuery}
                  onChangeText={setPhoneCodeQuery}
                />
              </View>

              <ScrollView
                style={styles.countryList}
                contentContainerStyle={styles.countryListContent}
                keyboardShouldPersistTaps="handled"
              >
                {filteredPhoneCodes.length === 0 ? (
                  <Text style={styles.noCountriesText}>No countries found.</Text>
                ) : (
                  filteredPhoneCodes.map((cc, idx) => {
                    const isActive =
                      selectedCountryCode.name === cc.name &&
                      selectedCountryCode.dial === cc.dial;
                    return (
                      <TouchableOpacity
                        key={`${cc.name}-${idx}`}
                        style={[styles.countryOption, isActive && styles.countryOptionActive]}
                        onPress={() => {
                          setSelectedCountryCode(cc);
                          setShowPhoneCodePicker(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.phoneCodeListFlag}>{cc.flag}</Text>
                        <Text
                          style={[
                            styles.countryOptionText,
                            isActive && styles.countryOptionTextActive,
                            { flex: 1 },
                          ]}
                        >
                          {cc.name}
                        </Text>
                        <Text style={styles.phoneCodeListDial}>{cc.dial}</Text>
                        {isActive ? (
                          <Ionicons name="checkmark" size={16} color={Colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
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
  stepHeaderRow: {
    marginBottom: 10,
    gap: 4,
  },
  stepMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  stepMetaLabel: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
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
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
  },
  selectFieldError: {
    borderColor: Colors.error,
  },
  selectFieldText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: UI.typography.medium,
  },
  selectFieldPlaceholder: {
    color: Colors.textSecondary,
  },
  errorTextInline: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 6,
    marginLeft: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  phoneCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: '100%' as any,
  },
  phoneCodeFlag: {
    fontSize: 18,
  },
  phoneCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  phoneDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.borderSoft,
  },
  phoneInput: {
    flex: 1,
    height: '100%' as any,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: UI.typography.medium,
  },
  phoneCodeListFlag: {
    fontSize: 20,
    marginRight: 8,
  },
  phoneCodeListDial: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 40,
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
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: -8,
    marginBottom: 12,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 0,
  },
  stepActionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    backgroundColor: Colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  nextButtonWrap: {
    flex: 1,
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
    width: 22,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    maxHeight: '78%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  modalNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  calendarWeekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekHeaderText: {
    flex: 1,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  calendarDayCell: {
    width: '14.2857%' as any,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
  },
  calendarDayCellSelected: {
    backgroundColor: Colors.primary,
  },
  calendarDayText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  calendarDayTextMuted: {
    color: Colors.textMuted,
  },
  calendarDayTextDisabled: {
    color: '#CBD5E1',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
  },
  calendarTitleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
  },
  yearCell: {
    width: '23%' as any,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  yearCellSelected: {
    backgroundColor: Colors.primary,
  },
  yearCellText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  yearCellTextSelected: {
    color: '#FFFFFF',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
  },
  monthCell: {
    width: '23%' as any,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  monthCellSelected: {
    backgroundColor: Colors.primary,
  },
  monthCellText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  monthCellTextSelected: {
    color: '#FFFFFF',
  },
  countrySearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  countrySearchInput: {
    flex: 1,
    height: 42,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  countryList: {
    maxHeight: 320,
  },
  countryListContent: {
    gap: 6,
    paddingBottom: 6,
  },
  countryOption: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countryOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  countryOptionText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  countryOptionTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  noCountriesText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 12,
  },
});
