import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import { PlayerPosition } from '@/types/database';
import GradientText from '@/components/ui/GradientText';

const POSITION_COLORS: Record<PlayerPosition, string> = {
  goalkeeper: '#EAB308',
  defender: '#8B5CF6',
  midfielder: '#10B981',
  forward: '#EF4444',
};
const POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: 'Goalkeeper',
  defender: 'Defender',
  midfielder: 'Midfielder',
  forward: 'Forward',
};
const POSITION_ICONS: Record<PlayerPosition, keyof typeof Ionicons.glyphMap> = {
  goalkeeper: 'hand-left-outline',
  defender: 'shield-outline',
  midfielder: 'flash-outline',
  forward: 'trending-up-outline',
};

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

// Parse stored phone into dial code + local number
function parseStoredPhone(phone: string): { code: typeof COUNTRY_CODES[0]; local: string } {
  if (!phone) return { code: COUNTRY_CODES[0], local: '' };
  // Try longest dial codes first (e.g. +593 before +5)
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);
  for (const cc of sorted) {
    if (phone.startsWith(cc.dial)) {
      return { code: cc, local: phone.slice(cc.dial.length) };
    }
  }
  // No match — strip leading + and digits that look like a code
  return { code: COUNTRY_CODES[0], local: phone.replace(/^\+/, '') };
}

const CALENDAR_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CALENDAR_MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseDateStr(dateStr: string): Date | null {
  // Try MM/DD/YYYY
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const d = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
    if (!isNaN(d.getTime())) return d;
  }
  // Try YYYY-MM-DD (ISO)
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function formatDateDisplay(dateStr: string): string {
  const d = parseDateStr(dateStr);
  if (!d) return dateStr;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function formatDateForInput(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function monthLabel(d: Date): string {
  return `${CALENDAR_MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildCalendarGrid(monthDate: Date): Date[] {
  const first = startOfMonth(monthDate);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const days: Date[] = [];
  // Build 6 rows (42 cells), then trim trailing row if entirely next month
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  // If last row (days 35-41) is entirely in the next month, drop it
  const lastRowStart = days[35];
  if (lastRowStart.getMonth() !== monthDate.getMonth()) {
    return days.slice(0, 35);
  }
  return days;
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface EditableInfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  editing: boolean;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
}

function EditableInfoRow({ icon, label, value, editing, onChangeText, placeholder, keyboardType = 'default' }: EditableInfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        {editing ? (
          <TextInput
            style={styles.infoInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder ?? label}
            placeholderTextColor={Colors.textMuted}
            keyboardType={keyboardType}
          />
        ) : (
          <Text style={styles.infoValue}>{value || '—'}</Text>
        )}
      </View>
    </View>
  );
}

export default function TeamProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, user, signOut, refreshProfile } = useAuth();
  const [teamId, setTeamId] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [teamRole, setTeamRole] = useState<string | null>(null);
  const [jerseyNumber, setJerseyNumber] = useState<number | null>(null);
  const [positions, setPositions] = useState<PlayerPosition[]>([]);

  const isCoach = profile?.role === 'coach';
  const [pushEnabled, setPushEnabled] = useState(false);
  const [eventReminders, setEventReminders] = useState(true);
  const [lineupNotifications, setLineupNotifications] = useState(true);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields — personal info (profiles table)
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editNationality, setEditNationality] = useState('');

  // Editable fields — player details (team_players + profiles table)
  const [editJersey, setEditJersey] = useState('');
  const [editHeightFt, setEditHeightFt] = useState('');
  const [editHeightIn, setEditHeightIn] = useState('');
  const [editWeight, setEditWeight] = useState('');

  // Phone country code
  const [selectedPhoneCode, setSelectedPhoneCode] = useState(COUNTRY_CODES[0]);
  const [showPhoneCodePicker, setShowPhoneCodePicker] = useState(false);
  const [phoneCodeQuery, setPhoneCodeQuery] = useState('');

  // Picker state
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [dobCalendarMonth, setDobCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [dobPickerMode, setDobPickerMode] = useState<'calendar' | 'year' | 'month'>('calendar');
  const [dobPickerYearPage, setDobPickerYearPage] = useState(() => Math.floor(new Date().getFullYear() / 12) * 12);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');

  const syncFormFromProfile = useCallback(() => {
    if (!profile) return;
    setEditFullName(profile.full_name || '');
    const parsed = parseStoredPhone(profile.phone || '');
    setSelectedPhoneCode(parsed.code);
    setEditPhone(parsed.local);
    setEditDob(profile.date_of_birth || '');
    setEditNationality(profile.nationality || '');
    setEditHeightFt(profile.height_ft != null ? String(profile.height_ft) : '');
    setEditHeightIn(profile.height_in != null ? String(profile.height_in) : '');
    setEditWeight(profile.weight_lbs != null ? String(profile.weight_lbs) : '');
  }, [profile]);

  const loadTeamData = useCallback(async () => {
    if (!user) return;

    syncFormFromProfile();

    // Resolve teamId dynamically from the user's memberships
    let resolvedTeamId = teamId;
    if (!resolvedTeamId) {
      if (isCoach) {
        const { data: coachTeam } = await supabase
          .from('team_coaches')
          .select('team_id')
          .eq('coach_id', user.id)
          .limit(1)
          .maybeSingle();
        resolvedTeamId = coachTeam?.team_id ?? null;
      } else {
        const { data: playerTeam } = await supabase
          .from('team_players')
          .select('team_id')
          .eq('player_id', user.id)
          .limit(1)
          .maybeSingle();
        resolvedTeamId = playerTeam?.team_id ?? null;
      }
      if (resolvedTeamId) setTeamId(resolvedTeamId);
    }

    if (!resolvedTeamId) {
      setRefreshing(false);
      return;
    }

    if (isCoach) {
      const { data } = await supabase
        .from('team_coaches')
        .select('role')
        .eq('team_id', resolvedTeamId)
        .eq('coach_id', user.id)
        .single();
      if (data) setTeamRole(data.role === 'head_coach' ? 'Head Coach' : 'Assistant Coach');
    } else {
      const { data } = await supabase
        .from('team_players')
        .select('jersey_number, positions')
        .eq('team_id', resolvedTeamId)
        .eq('player_id', user.id)
        .single();
      if (data) {
        setJerseyNumber(data.jersey_number);
        setEditJersey(data.jersey_number != null ? String(data.jersey_number) : '');
        setPositions(data.positions || []);
        setTeamRole('Player');
      }
    }
    setRefreshing(false);
  }, [teamId, user, isCoach, syncFormFromProfile]);

  useFocusEffect(useCallback(() => { loadTeamData(); }, [loadTeamData]));

  const dobCalendarDays = buildCalendarGrid(dobCalendarMonth);
  const selectedDob = parseDateStr(editDob);
  const filteredCountries = COUNTRY_OPTIONS.filter((c) =>
    c.toLowerCase().includes(countryQuery.trim().toLowerCase()),
  );
  const filteredPhoneCodes = COUNTRY_CODES.filter((cc) =>
    cc.name.toLowerCase().includes(phoneCodeQuery.trim().toLowerCase()) ||
    cc.dial.includes(phoneCodeQuery.trim()),
  );

  const openDobPicker = () => {
    const parsed = parseDateStr(editDob) ?? new Date();
    setDobCalendarMonth(startOfMonth(parsed));
    setDobPickerMode('calendar');
    setDobPickerYearPage(Math.floor(parsed.getFullYear() / 12) * 12);
    setShowDobPicker(true);
  };

  const selectDobFromPicker = (date: Date) => {
    setEditDob(formatDateForInput(date));
    setShowDobPicker(false);
  };

  const openCountryPicker = () => {
    setCountryQuery('');
    setShowCountryPicker(true);
  };

  const selectCountry = (country: string) => {
    setEditNationality(country);
    setShowCountryPicker(false);
  };

  const handleEdit = () => {
    syncFormFromProfile();
    setEditJersey(jerseyNumber != null ? String(jerseyNumber) : '');
    setEditing(true);
  };

  const handleCancel = () => {
    syncFormFromProfile();
    setEditJersey(jerseyNumber != null ? String(jerseyNumber) : '');
    setEditing(false);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate all fields
    const validationErrors: string[] = [];

    if (!editFullName.trim()) {
      validationErrors.push('Full name is required.');
    }

    if (editPhone.trim()) {
      const digitsOnly = editPhone.replace(/\D/g, '');
      if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        validationErrors.push('Phone number must be 7–15 digits.');
      }
    }

    // Build full phone for storage
    const fullPhone = editPhone.trim() ? `${selectedPhoneCode.dial}${editPhone.trim()}` : null;

    if (!isCoach && editDob.trim()) {
      const parsed = parseDateStr(editDob);
      if (!parsed) {
        validationErrors.push('Date of birth must be a valid date.');
      } else {
        const age = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        if (age < 5 || age > 100) {
          validationErrors.push('Date of birth is out of range.');
        }
      }
    }

    if (editNationality.trim() && !COUNTRY_OPTIONS.includes(editNationality.trim())) {
      validationErrors.push('Please select a valid nationality from the list.');
    }

    if (editHeightFt.trim()) {
      const ft = parseInt(editHeightFt, 10);
      if (isNaN(ft) || ft < 3 || ft > 8) {
        validationErrors.push('Height (ft) must be between 3 and 8.');
      }
    }

    if (editHeightIn.trim()) {
      const ins = parseInt(editHeightIn, 10);
      if (isNaN(ins) || ins < 0 || ins > 11) {
        validationErrors.push('Height (in) must be between 0 and 11.');
      }
    }

    if (editWeight.trim()) {
      const w = parseInt(editWeight, 10);
      if (isNaN(w) || w < 50 || w > 500) {
        validationErrors.push('Weight must be between 50 and 500 lbs.');
      }
    }

    if (!isCoach && editJersey.trim()) {
      const j = parseInt(editJersey, 10);
      if (isNaN(j) || j < 1 || j > 99) {
        validationErrors.push('Jersey number must be between 1 and 99.');
      }
    }

    if (validationErrors.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Validation Error', validationErrors.join('\n'));
      return;
    }

    setSaving(true);

    try {
      // Parse numeric fields
      const heightFt = editHeightFt ? parseInt(editHeightFt, 10) : null;
      const heightIn = editHeightIn ? parseInt(editHeightIn, 10) : null;
      const weightLbs = editWeight ? parseInt(editWeight, 10) : null;
      const nameParts = editFullName.trim().split(' ').filter(Boolean);

      // Convert DOB to ISO format for storage
      let dobIso: string | null = null;
      if (!isCoach && editDob.trim()) {
        const parsed = parseDateStr(editDob);
        if (parsed) {
          const mm = String(parsed.getMonth() + 1).padStart(2, '0');
          const dd = String(parsed.getDate()).padStart(2, '0');
          dobIso = `${parsed.getFullYear()}-${mm}-${dd}`;
        }
      }

      const profileUpdates: Record<string, any> = {
        full_name: editFullName.trim(),
        first_name: nameParts[0] || null,
        last_name: nameParts.length > 1 ? nameParts.slice(1).join(' ') : null,
        phone: fullPhone,
        nationality: editNationality.trim() || null,
        height_ft: heightFt,
        height_in: heightIn,
        weight_lbs: weightLbs,
      };
      if (!isCoach) {
        profileUpdates.date_of_birth = dobIso;
      }

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update jersey number on team_players (player only)
      if (!isCoach && teamId) {
        const jerseyNum = editJersey ? parseInt(editJersey, 10) : null;
        const { error: teamError } = await supabase
          .from('team_players')
          .update({ jersey_number: jerseyNum })
          .eq('team_id', teamId)
          .eq('player_id', user.id);

        if (teamError) throw teamError;
        setJerseyNumber(jerseyNum);
      }

      // Refresh the auth context profile
      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err?.message || '';
      if (msg.includes('Network request failed')) {
        Alert.alert('No Connection', 'Please check your internet connection and try again.');
      } else {
        Alert.alert('Save Failed', msg || 'Could not update profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await signOut();
        },
      },
    ]);
  };

  const fullName = profile?.full_name || 'User';
  const initials = getInitials(editing ? editFullName || fullName : fullName);
  const height = profile?.height_ft != null && profile?.height_in != null
    ? `${profile.height_ft}'${profile.height_in}"`
    : null;

  const renderInlineToggle = (value: boolean, setValue: (v: boolean) => void) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => setValue(!value)}
      style={[styles.inlineToggleTrack, value && styles.inlineToggleTrackActive]}
    >
      <View style={[styles.inlineToggleThumb, value && styles.inlineToggleThumbActive]} />
    </TouchableOpacity>
  );

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
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <GradientText
            text="Profile"
            style={styles.headerTitle}
            colors={['#FFFFFF', '#D4EBFC']}
          />
        </View>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTeamData(); }} tintColor="#fff" />
          }
        >
          {/* Avatar section */}
          <View style={styles.avatarSection}>
            <LinearGradient
              colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
              style={styles.avatarOuter}
            >
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </LinearGradient>
            <GradientText
              text={editing ? editFullName || fullName : fullName}
              style={styles.name}
              colors={['#FFFFFF', '#D4EBFC']}
            />
            {teamRole && (
              <Chip
                label={teamRole}
                tone={isCoach ? 'blue' : 'emerald'}
                style={styles.teamRoleChip}
              />
            )}
            {!isCoach && positions.length > 0 && (
              <View style={styles.positionRow}>
                {positions.map(pos => (
                  <View key={pos} style={[styles.posChip, { backgroundColor: POSITION_COLORS[pos] + '20' }]}>
                    <Ionicons name={POSITION_ICONS[pos]} size={14} color={POSITION_COLORS[pos]} />
                    <Text style={[styles.posChipText, { color: POSITION_COLORS[pos] }]}>
                      {POSITION_LABELS[pos]}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Edit / Save / Cancel buttons */}
            {!editing ? (
              <TouchableOpacity style={styles.editToggleBtn} onPress={handleEdit} activeOpacity={0.8}>
                <Ionicons name="create-outline" size={16} color="#fff" />
                <Text style={styles.editToggleBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  activeOpacity={0.8}
                  disabled={saving}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Profile Info Card */}
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Personal Information</Text>

            <EditableInfoRow
              icon="person-outline"
              label="Full Name"
              value={editing ? editFullName : fullName}
              editing={editing}
              onChangeText={setEditFullName}
              placeholder="Full name"
            />
            <EditableInfoRow
              icon="mail-outline"
              label="Email"
              value={profile?.email || ''}
              editing={false}
              onChangeText={() => {}}
            />
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="call-outline" size={16} color={Colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                {editing ? (
                  <View style={styles.phoneEditRow}>
                    <TouchableOpacity
                      style={styles.phoneCodeBtn}
                      onPress={() => { setPhoneCodeQuery(''); setShowPhoneCodePicker(true); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.phoneCodeFlag}>{selectedPhoneCode.flag}</Text>
                      <Text style={styles.phoneCodeText}>{selectedPhoneCode.dial}</Text>
                      <Ionicons name="chevron-down" size={12} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.phoneInput}
                      value={editPhone}
                      onChangeText={(text) => setEditPhone(text.replace(/[^0-9]/g, ''))}
                      placeholder="Phone number"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="phone-pad"
                    />
                  </View>
                ) : (
                  <Text style={styles.infoValue}>{profile?.phone || '—'}</Text>
                )}
              </View>
            </View>
            {!isCoach && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Date of Birth</Text>
                  {editing ? (
                    <TouchableOpacity onPress={openDobPicker} activeOpacity={0.7} style={styles.pickerTouchTarget}>
                      <Text style={[styles.pickerTouchText, !editDob && styles.pickerTouchPlaceholder]}>
                        {editDob ? formatDateDisplay(editDob) : 'Select date'}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.infoValue}>{profile?.date_of_birth ? formatDateDisplay(profile.date_of_birth) : '—'}</Text>
                  )}
                </View>
              </View>
            )}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="flag-outline" size={16} color={Colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nationality</Text>
                {editing ? (
                  <TouchableOpacity onPress={openCountryPicker} activeOpacity={0.7} style={styles.pickerTouchTarget}>
                    <Text style={[styles.pickerTouchText, !editNationality && styles.pickerTouchPlaceholder]}>
                      {editNationality || 'Select country'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.infoValue}>{profile?.nationality || '—'}</Text>
                )}
              </View>
            </View>
          </Card>

          {/* Player-specific stats */}
          {!isCoach && (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Player Details</Text>

              {editing ? (
                <View style={styles.editGrid}>
                  <View style={styles.editField}>
                    <Text style={styles.editFieldLabel}>Jersey #</Text>
                    <TextInput
                      style={styles.editFieldInput}
                      value={editJersey}
                      onChangeText={setEditJersey}
                      placeholder="—"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editFieldLabel}>Height (ft)</Text>
                    <TextInput
                      style={styles.editFieldInput}
                      value={editHeightFt}
                      onChangeText={setEditHeightFt}
                      placeholder="—"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      maxLength={1}
                    />
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editFieldLabel}>Height (in)</Text>
                    <TextInput
                      style={styles.editFieldInput}
                      value={editHeightIn}
                      onChangeText={setEditHeightIn}
                      placeholder="—"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editFieldLabel}>Weight (lbs)</Text>
                    <TextInput
                      style={styles.editFieldInput}
                      value={editWeight}
                      onChangeText={setEditWeight}
                      placeholder="—"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.statsGrid}>
                  {jerseyNumber != null && (
                    <View style={styles.statBox}>
                      <LinearGradient colors={Gradients.primary as unknown as string[]} style={styles.statCircle}>
                        <Text style={styles.statCircleText}>{jerseyNumber}</Text>
                      </LinearGradient>
                      <Text style={styles.statLabel}>Jersey</Text>
                    </View>
                  )}
                  {height && (
                    <View style={styles.statBox}>
                      <View style={[styles.statCircle, { backgroundColor: Colors.emeraldSoft }]}>
                        <Text style={[styles.statCircleText, { color: Colors.emerald }]}>{height}</Text>
                      </View>
                      <Text style={styles.statLabel}>Height</Text>
                    </View>
                  )}
                  {profile?.weight_lbs != null && (
                    <View style={styles.statBox}>
                      <View style={[styles.statCircle, { backgroundColor: Colors.purpleSoft }]}>
                        <Text style={[styles.statCircleText, { color: Colors.purple }]}>{profile.weight_lbs}</Text>
                      </View>
                      <Text style={styles.statLabel}>Weight (lbs)</Text>
                    </View>
                  )}
                  {jerseyNumber == null && !height && profile?.weight_lbs == null && (
                    <Text style={styles.emptyText}>No player details added yet.</Text>
                  )}
                </View>
              )}
            </Card>
          )}

          {/* Notification Preferences (coach only — players see these in Settings) */}
          {isCoach && (
            <Card padded={false} style={[styles.card, styles.notifCard]}>
              <Text style={styles.cardTitle}>Notification Preferences</Text>

              <View style={styles.notifRow}>
                <View style={[styles.infoIconWrap, { backgroundColor: Colors.blueSoft }]}>
                  <Ionicons name="notifications-outline" size={16} color={Colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoValue}>Push Notifications</Text>
                </View>
                <View style={styles.notifSwitchWrap}>
                  {renderInlineToggle(pushEnabled, setPushEnabled)}
                </View>
              </View>

              <View style={styles.notifRow}>
                <View style={[styles.infoIconWrap, { backgroundColor: Colors.amberSoft }]}>
                  <Ionicons name="alarm-outline" size={16} color={Colors.amber} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoValue}>Event Reminders</Text>
                </View>
                <View style={styles.notifSwitchWrap}>
                  {renderInlineToggle(eventReminders, setEventReminders)}
                </View>
              </View>

              <View style={[styles.notifRow, { borderBottomWidth: 0 }]}>
                <View style={[styles.infoIconWrap, { backgroundColor: Colors.emeraldSoft }]}>
                  <Ionicons name="clipboard-outline" size={16} color={Colors.emerald} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoValue}>Lineup Published</Text>
                </View>
                <View style={styles.notifSwitchWrap}>
                  {renderInlineToggle(lineupNotifications, setLineupNotifications)}
                </View>
              </View>
            </Card>
          )}

          {/* Help & Support (coach only — players see this in Settings) */}
          {isCoach && (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Help & Support</Text>

              <TouchableOpacity
                style={styles.infoRow}
                activeOpacity={0.7}
                onPress={() => Linking.openURL('https://matchfit.app/faq')}
              >
                <View style={[styles.infoIconWrap, { backgroundColor: Colors.emeraldSoft }]}>
                  <Ionicons name="help-circle-outline" size={16} color={Colors.emerald} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>FAQ</Text>
                  <Text style={styles.infoValue}>Frequently Asked Questions</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <View style={[styles.infoIconWrap, { backgroundColor: Colors.purpleSoft }]}>
                  <Ionicons name="information-circle-outline" size={16} color={Colors.purple} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>App Version</Text>
                  <Text style={styles.infoValue}>1.0.0</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Sign Out */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={Colors.red} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* DOB Calendar Picker Modal */}
      <Modal visible={showDobPicker} transparent animationType="fade" onRequestClose={() => setShowDobPicker(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setShowDobPicker(false)}>
          <Pressable style={styles.pickerCard} onPress={() => {}}>
            {dobPickerMode === 'calendar' && (
              <>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity style={styles.pickerNavBtn} onPress={() => setDobCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                    <Ionicons name="chevron-back" size={18} color={Colors.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setDobPickerYearPage(Math.floor(dobCalendarMonth.getFullYear() / 12) * 12); setDobPickerMode('year'); }} activeOpacity={0.7} style={styles.pickerTitleBtn}>
                    <Text style={styles.pickerTitle}>{monthLabel(dobCalendarMonth)}</Text>
                    <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pickerNavBtn} onPress={() => setDobCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.calWeekHeader}>
                  {CALENDAR_DAY_LABELS.map(l => <Text key={l} style={styles.calWeekText}>{l}</Text>)}
                </View>
                <View style={styles.calGrid}>
                  {dobCalendarDays.map((dayObj, idx) => {
                    const inMonth = dayObj.getMonth() === dobCalendarMonth.getMonth();
                    const isSelected = !!selectedDob && sameDay(dayObj, selectedDob);
                    const isFuture = dayObj > new Date();
                    return (
                      <TouchableOpacity key={`${dayObj.toISOString()}-${idx}`} style={[styles.calDayCell, isSelected && styles.calDayCellSelected]} disabled={isFuture} onPress={() => selectDobFromPicker(dayObj)} activeOpacity={0.8}>
                        <Text style={[styles.calDayText, !inMonth && styles.calDayMuted, isFuture && styles.calDayDisabled, isSelected && styles.calDaySelected]}>{dayObj.getDate()}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
            {dobPickerMode === 'year' && (
              <>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity style={styles.pickerNavBtn} onPress={() => setDobPickerYearPage(prev => prev - 12)}>
                    <Ionicons name="chevron-back" size={18} color={Colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>{dobPickerYearPage} – {dobPickerYearPage + 11}</Text>
                  <TouchableOpacity style={styles.pickerNavBtn} onPress={() => setDobPickerYearPage(prev => prev + 12)}>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.yearGrid}>
                  {Array.from({ length: 12 }, (_, i) => {
                    const yr = dobPickerYearPage + i;
                    const isCurrent = yr === dobCalendarMonth.getFullYear();
                    const isFutureYear = yr > new Date().getFullYear();
                    return (
                      <TouchableOpacity key={yr} style={[styles.yearCell, isCurrent && styles.yearCellSelected]} disabled={isFutureYear} onPress={() => { setDobCalendarMonth(new Date(yr, dobCalendarMonth.getMonth(), 1)); setDobPickerMode('month'); }} activeOpacity={0.7}>
                        <Text style={[styles.yearCellText, isCurrent && styles.yearCellTextSelected, isFutureYear && styles.calDayDisabled]}>{yr}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
            {dobPickerMode === 'month' && (
              <>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity style={styles.pickerNavBtn} onPress={() => setDobPickerMode('year')}>
                    <Ionicons name="chevron-back" size={18} color={Colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>{dobCalendarMonth.getFullYear()}</Text>
                  <View style={{ width: 30 }} />
                </View>
                <View style={styles.monthGrid}>
                  {CALENDAR_MONTH_LABELS.map((label, idx) => {
                    const isCurrent = idx === dobCalendarMonth.getMonth();
                    const now = new Date();
                    const isFutureMonth = dobCalendarMonth.getFullYear() > now.getFullYear() || (dobCalendarMonth.getFullYear() === now.getFullYear() && idx > now.getMonth());
                    return (
                      <TouchableOpacity key={label} style={[styles.monthCell, isCurrent && styles.monthCellSelected]} disabled={isFutureMonth} onPress={() => { setDobCalendarMonth(new Date(dobCalendarMonth.getFullYear(), idx, 1)); setDobPickerMode('calendar'); }} activeOpacity={0.7}>
                        <Text style={[styles.monthCellText, isCurrent && styles.monthCellTextSelected, isFutureMonth && styles.calDayDisabled]}>{label.slice(0, 3)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Country Picker Modal */}
      <Modal visible={showCountryPicker} transparent animationType="fade" onRequestClose={() => setShowCountryPicker(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setShowCountryPicker(false)}>
          <Pressable style={styles.pickerCard} onPress={() => {}}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Country</Text>
              <TouchableOpacity style={styles.pickerCloseBtn} onPress={() => setShowCountryPicker(false)}>
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
            <ScrollView style={styles.countryList} contentContainerStyle={styles.countryListContent} keyboardShouldPersistTaps="handled">
              {filteredCountries.length === 0 ? (
                <Text style={styles.noCountriesText}>No countries found.</Text>
              ) : (
                filteredCountries.map((country) => {
                  const isActive = editNationality === country;
                  return (
                    <TouchableOpacity key={country} style={[styles.countryOption, isActive && styles.countryOptionActive]} onPress={() => selectCountry(country)} activeOpacity={0.8}>
                      <Text style={[styles.countryOptionText, isActive && styles.countryOptionTextActive]}>{country}</Text>
                      {isActive ? <Ionicons name="checkmark" size={16} color={Colors.primary} /> : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Phone Country Code Picker Modal */}
      <Modal visible={showPhoneCodePicker} transparent animationType="fade" onRequestClose={() => setShowPhoneCodePicker(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setShowPhoneCodePicker(false)}>
          <Pressable style={styles.pickerCard} onPress={() => {}}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Country Code</Text>
              <TouchableOpacity style={styles.pickerCloseBtn} onPress={() => setShowPhoneCodePicker(false)}>
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
            <ScrollView style={styles.countryList} contentContainerStyle={styles.countryListContent} keyboardShouldPersistTaps="handled">
              {filteredPhoneCodes.length === 0 ? (
                <Text style={styles.noCountriesText}>No countries found.</Text>
              ) : (
                filteredPhoneCodes.map((cc) => {
                  const isActive = selectedPhoneCode.name === cc.name && selectedPhoneCode.dial === cc.dial;
                  return (
                    <TouchableOpacity
                      key={`${cc.name}-${cc.dial}`}
                      style={[styles.countryOption, isActive && styles.countryOptionActive]}
                      onPress={() => { setSelectedPhoneCode(cc); setShowPhoneCodePicker(false); }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.phoneCodeListRow}>
                        <Text style={styles.phoneCodeListFlag}>{cc.flag}</Text>
                        <Text style={[styles.countryOptionText, isActive && styles.countryOptionTextActive]}>{cc.name}</Text>
                      </View>
                      <Text style={[styles.phoneCodeListDial, isActive && styles.countryOptionTextActive]}>{cc.dial}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: UI.typography.bold,
    color: '#fff',
  },
  decorCircle1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.05)', top: -80, right: -60,
  },
  decorCircle2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: 120, left: -40,
  },
  content: {
    paddingTop: 16, paddingHorizontal: 20, paddingBottom: 120, gap: 16,
  },

  // Avatar section
  avatarSection: { alignItems: 'center', gap: 10, marginBottom: 8 },
  avatarOuter: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInner: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 28, color: Colors.primary, fontFamily: UI.typography.bold },
  name: { fontSize: 24, color: '#fff', fontFamily: UI.typography.bold },
  teamRoleChip: { alignSelf: 'center' },
  positionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  posChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: UI.radius.pill,
  },
  posChipText: { fontSize: 12, fontFamily: UI.typography.bold },

  // Edit / Save / Cancel buttons
  editToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: UI.radius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16, paddingVertical: 9,
  },
  editToggleBtnText: {
    color: '#fff', fontSize: 14, fontFamily: UI.typography.semibold,
  },
  editActions: {
    flexDirection: 'row', gap: 10, marginTop: 4,
  },
  cancelBtn: {
    borderRadius: UI.radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 18, paddingVertical: 9,
  },
  cancelBtnText: {
    color: '#fff', fontSize: 14, fontFamily: UI.typography.semibold,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: UI.radius.lg, backgroundColor: Colors.emerald,
    paddingHorizontal: 18, paddingVertical: 9,
  },
  saveBtnText: {
    color: '#fff', fontSize: 14, fontFamily: UI.typography.bold,
  },

  // Cards
  card: { borderRadius: 20, padding: 18, gap: 2 },
  notifCard: { padding: 14, gap: 2 },
  cardTitle: {
    fontSize: 17, color: Colors.textPrimary, fontFamily: UI.typography.bold, marginBottom: 8,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderSoft,
  },
  infoIconWrap: {
    width: 34, height: 34, borderRadius: 11, flexShrink: 0,
    backgroundColor: Colors.blueSoft, alignItems: 'center', justifyContent: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: Colors.textMuted, fontFamily: UI.typography.medium },
  infoValue: { fontSize: 15, color: Colors.textPrimary, fontFamily: UI.typography.semibold, marginTop: 1 },
  infoInput: {
    fontSize: 15, color: Colors.textPrimary, fontFamily: UI.typography.semibold,
    marginTop: 1, paddingVertical: 2, paddingHorizontal: 0,
    borderBottomWidth: 1, borderBottomColor: Colors.primary,
  },

  // Picker touch target (DOB, Nationality in edit mode)
  pickerTouchTarget: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 2, paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: Colors.surfaceMuted, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  pickerTouchText: {
    fontSize: 15, color: Colors.textPrimary, fontFamily: UI.typography.semibold, flex: 1,
  },
  pickerTouchPlaceholder: {
    color: Colors.textMuted,
  },

  // Phone edit row (code btn + input)
  phoneEditRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2,
  },
  phoneCodeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceMuted, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 8, paddingVertical: 6,
  },
  phoneCodeFlag: { fontSize: 16 },
  phoneCodeText: {
    fontSize: 14, color: Colors.textPrimary, fontFamily: UI.typography.semibold,
  },
  phoneInput: {
    flex: 1, fontSize: 15, color: Colors.textPrimary, fontFamily: UI.typography.semibold,
    paddingVertical: 4, paddingHorizontal: 0,
    borderBottomWidth: 1, borderBottomColor: Colors.primary,
  },

  // Phone code picker list items
  phoneCodeListRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  phoneCodeListFlag: { fontSize: 17 },
  phoneCodeListDial: {
    fontSize: 14, color: Colors.textSecondary, fontFamily: UI.typography.medium,
  },

  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingRight: 84,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSoft,
  },
  notifSwitchWrap: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    width: 54,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  inlineToggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.borderSoft,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  inlineToggleTrackActive: {
    backgroundColor: Colors.emeraldSoft,
    borderColor: '#A7F3D0',
  },
  inlineToggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  inlineToggleThumbActive: {
    alignSelf: 'flex-end',
    borderColor: '#6EE7B7',
  },

  // Stats grid (read-only mode)
  statsGrid: { flexDirection: 'row', gap: 16, justifyContent: 'center', paddingVertical: 8 },
  statBox: { alignItems: 'center', gap: 6 },
  statCircle: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  statCircleText: { fontSize: 18, color: '#fff', fontFamily: UI.typography.bold },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontFamily: UI.typography.medium },

  // Edit grid (player details)
  editGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 4,
  },
  editField: {
    width: '46%',
    gap: 4,
  },
  editFieldLabel: {
    fontSize: 12, color: Colors.textMuted, fontFamily: UI.typography.medium,
  },
  editFieldInput: {
    fontSize: 16, color: Colors.textPrimary, fontFamily: UI.typography.semibold,
    borderWidth: 1, borderColor: Colors.border, borderRadius: UI.radius.lg,
    backgroundColor: Colors.surfaceMuted, paddingHorizontal: 12, paddingVertical: 10,
  },

  // Empty text
  emptyText: {
    color: Colors.textSecondary, fontSize: 14, fontFamily: UI.typography.medium, textAlign: 'center',
  },

  // Modal / Picker styles
  pickerBackdrop: {
    flex: 1, backgroundColor: 'rgba(17,24,39,0.55)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  pickerCard: {
    width: '100%', maxWidth: 340, backgroundColor: Colors.surface,
    borderRadius: 18, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
  },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  pickerTitle: { fontSize: 16, fontFamily: UI.typography.bold, color: Colors.textPrimary },
  pickerNavBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  pickerTitleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pickerCloseBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  calWeekHeader: { flexDirection: 'row', marginBottom: 2 },
  calWeekText: {
    width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, color: Colors.textMuted, fontFamily: UI.typography.medium, paddingVertical: 4,
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDayCell: {
    width: `${100 / 7}%`, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18,
  },
  calDayCellSelected: { backgroundColor: Colors.primary },
  calDayText: { fontSize: 13, color: Colors.textPrimary, fontFamily: UI.typography.medium },
  calDayMuted: { color: Colors.textMuted },
  calDayDisabled: { opacity: 0.3 },
  calDaySelected: { color: '#fff', fontFamily: UI.typography.bold },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  yearCell: {
    width: '30%', flexGrow: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 10, backgroundColor: Colors.surfaceMuted,
  },
  yearCellSelected: { backgroundColor: Colors.primary },
  yearCellText: { fontSize: 14, color: Colors.textPrimary, fontFamily: UI.typography.semibold },
  yearCellTextSelected: { color: '#fff' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  monthCell: {
    width: '30%', flexGrow: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 10, backgroundColor: Colors.surfaceMuted,
  },
  monthCellSelected: { backgroundColor: Colors.primary },
  monthCellText: { fontSize: 14, color: Colors.textPrimary, fontFamily: UI.typography.semibold },
  monthCellTextSelected: { color: '#fff' },
  countrySearchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceMuted, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  countrySearchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontFamily: UI.typography.medium },
  countryList: { maxHeight: 300 },
  countryListContent: { gap: 2 },
  noCountriesText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20, fontFamily: UI.typography.medium },
  countryOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10,
  },
  countryOptionActive: { backgroundColor: Colors.blueSoft },
  countryOptionText: { fontSize: 14, color: Colors.textPrimary, fontFamily: UI.typography.medium },
  countryOptionTextActive: { color: Colors.primary, fontFamily: UI.typography.bold },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: UI.radius.xl,
    backgroundColor: Colors.redSoft, borderWidth: 1, borderColor: '#FECACA',
  },
  signOutText: { fontSize: 15, color: Colors.red, fontFamily: UI.typography.semibold },
});
