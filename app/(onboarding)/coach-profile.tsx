import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from '@/utils/reanimated-shim';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import Button from '@/components/ui/Button';
import GradientText from '@/components/ui/GradientText';

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
  { name: 'England', dial: '+44', flag: '🏴' },
  { name: 'Scotland', dial: '+44', flag: '🏴' },
  { name: 'Wales', dial: '+44', flag: '🏴' },
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

export default function CoachProfileOnboardingScreen() {
  const { user, profile, completeOnboarding } = useAuth();
  const { inviteCode, teamName } = useLocalSearchParams<{ inviteCode?: string; teamName?: string }>();

  const [nationality, setNationality] = useState(profile?.nationality ?? '');
  const [phone, setPhone] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showPhoneCodePicker, setShowPhoneCodePicker] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [phoneCodeQuery, setPhoneCodeQuery] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredCountries = useMemo(
    () => COUNTRY_OPTIONS.filter((country) =>
      country.toLowerCase().includes(countryQuery.trim().toLowerCase()),
    ),
    [countryQuery],
  );

  const filteredPhoneCodes = useMemo(
    () => COUNTRY_CODES.filter((cc) =>
      cc.name.toLowerCase().includes(phoneCodeQuery.trim().toLowerCase()) ||
      cc.dial.includes(phoneCodeQuery.trim()),
    ),
    [phoneCodeQuery],
  );

  const validate = () => {
    const next: Record<string, string> = {};
    if (!nationality.trim()) next.nationality = 'Nationality is required';
    const phoneCleaned = phone.replace(/\D/g, '');
    if (!phoneCleaned) {
      next.phone = 'Phone number is required';
    } else if (phoneCleaned.length < 7 || phoneCleaned.length > 15) {
      next.phone = 'Enter a valid phone number (7–15 digits)';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handlePhoneChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, 15);
    setPhone(digitsOnly);
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const handleContinue = async () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    setGeneralError('');
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          nationality: nationality.trim(),
          phone: `${selectedCountryCode.dial}${phone.trim()}`,
        })
        .eq('id', user!.id);

      if (updateError) throw updateError;

      if (inviteCode) {
        router.replace({
          pathname: '/(onboarding)/invite-code',
          params: {
            inviteCode,
            teamName: teamName ?? '',
          },
        });
      } else {
        await completeOnboarding();
      }
    } catch (error: any) {
      const msg = error?.message ?? 'Could not save profile details. Please try again.';
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
          <Animated.View entering={FadeIn.duration(400)} style={styles.backRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.headerSection}>
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.iconCircle}
            >
              <Ionicons name="person-outline" size={32} color="#fff" />
            </LinearGradient>
            <GradientText
              text="Complete Coach Profile"
              style={styles.title}
              colors={['#FFFFFF', '#D4EBFC']}
            />
            <Text style={styles.subtitle}>Add your contact details before entering the app.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.cardContainer}>
            <BlurView intensity={40} tint="light" style={styles.blurContainer}>
              <View style={styles.card}>
                {generalError ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
                    <Text style={styles.errorBannerText}>{generalError}</Text>
                  </View>
                ) : null}

                <View style={styles.inputContainer}>
                  <TouchableOpacity
                    style={[
                      styles.selectField,
                      errors.nationality ? styles.selectFieldError : null,
                    ]}
                    onPress={() => {
                      setCountryQuery('');
                      setShowCountryPicker(true);
                    }}
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
                      placeholder="Phone Number"
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

                <Button
                  title={inviteCode ? 'Continue' : 'Finish'}
                  onPress={handleContinue}
                  loading={loading}
                  disabled={loading}
                />
              </View>
            </BlurView>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="slide"
        transparent
        visible={showCountryPicker}
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCountryPicker(false)}>
          <Pressable style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Nationality</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearch}
              value={countryQuery}
              onChangeText={setCountryQuery}
              placeholder="Search country"
              placeholderTextColor={Colors.textMuted}
            />

            <ScrollView style={styles.modalList}>
              {filteredCountries.map((country, idx) => {
                const isActive = nationality === country;
                return (
                  <TouchableOpacity
                    key={country}
                    style={[styles.modalRow, idx === filteredCountries.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => {
                      setNationality(country);
                      if (errors.nationality) setErrors((prev) => ({ ...prev, nationality: '' }));
                      setShowCountryPicker(false);
                    }}
                  >
                    <Text style={[styles.modalRowText, isActive && styles.modalRowTextActive]}>{country}</Text>
                    {isActive ? <Ionicons name="checkmark" size={16} color={Colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={showPhoneCodePicker}
        onRequestClose={() => setShowPhoneCodePicker(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowPhoneCodePicker(false)}>
          <Pressable style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country Code</Text>
              <TouchableOpacity onPress={() => setShowPhoneCodePicker(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearch}
              value={phoneCodeQuery}
              onChangeText={setPhoneCodeQuery}
              placeholder="Search country or code"
              placeholderTextColor={Colors.textMuted}
            />

            <ScrollView style={styles.modalList}>
              {filteredPhoneCodes.map((cc, idx) => {
                const isActive = selectedCountryCode.name === cc.name && selectedCountryCode.dial === cc.dial;
                return (
                  <TouchableOpacity
                    key={`${cc.name}-${cc.dial}`}
                    style={[styles.modalRow, idx === filteredPhoneCodes.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => {
                      setSelectedCountryCode(cc);
                      setShowPhoneCodePicker(false);
                    }}
                  >
                    <Text style={styles.phoneCodeListFlag}>{cc.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalRowText, isActive && styles.modalRowTextActive]}>{cc.name}</Text>
                    </View>
                    <Text style={styles.phoneCodeListDial}>{cc.dial}</Text>
                    {isActive ? <Ionicons name="checkmark" size={16} color={Colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  backRow: { marginBottom: 16 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSection: { alignItems: 'center', marginBottom: 28 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
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
  },
  blurContainer: { borderRadius: 24, overflow: 'hidden' },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    padding: 24,
    borderRadius: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.redSoft,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    color: Colors.error,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  inputContainer: { marginBottom: 14 },
  selectField: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  selectFieldError: { borderColor: Colors.error },
  selectFieldText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  selectFieldPlaceholder: {
    color: Colors.textSecondary,
    fontFamily: 'PlusJakartaSans_500Medium',
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
    gap: 6,
    paddingHorizontal: 12,
    height: '100%' as any,
  },
  phoneCodeFlag: { fontSize: 17 },
  phoneCodeText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '600',
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
    color: Colors.textPrimary,
    fontSize: 15,
  },
  errorTextInline: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalSheet: {
    maxHeight: '78%',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSoft,
  },
  modalTitle: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
  },
  modalSearch: {
    margin: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  modalList: {
    maxHeight: 320,
  },
  modalRow: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalRowText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  modalRowTextActive: {
    color: Colors.primary,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  phoneCodeListFlag: { fontSize: 17 },
  phoneCodeListDial: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginRight: 4,
  },
});
