import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useGlobalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import GradientText from '@/components/ui/GradientText';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type EventType = 'game' | 'practice' | 'meeting';
type GameVenueType = 'home' | 'away';
type RepeatPreset = 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'custom';
type RepeatUnit = 'day' | 'week';
type EndMode = 'on_date' | 'after_count';
type DatePickerTarget = 'event_date' | 'repeat_end_date';

const EVENT_TYPE_OPTIONS: { key: EventType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'game', label: 'Game', icon: 'football-outline' },
  { key: 'practice', label: 'Practice', icon: 'fitness-outline' },
  { key: 'meeting', label: 'Meeting', icon: 'people-outline' },
];

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  game: '#118FF3',
  practice: '#118FF3',
  meeting: '#118FF3',
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const GAME_VENUE_OPTIONS: { key: GameVenueType; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'away', label: 'Away' },
];
const CALENDAR_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CALENDAR_MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Generate UUID v4 format string for recurring event groups
function generateUUIDv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function parseTime(raw: string): Date | null {
  const trimmed = raw.trim();
  // Try 12-hour: "7:30 PM", "7:30PM", "12:00 am"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (period === 'AM' && h === 12) h = 0;
    if (period === 'PM' && h !== 12) h += 12;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }
  // Try 24-hour: "19:30", "7:30"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }
  return null;
}

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

function buildKickoffTimestamp(dateStr: string, timeStr: string): string | null {
  const d = parseDateStr(dateStr);
  const t = parseTime(timeStr);
  if (!d || !t) return null;
  d.setHours(t.getHours(), t.getMinutes(), 0, 0);
  return d.toISOString();
}

function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let result = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) result += '/';
    result += digits[i];
  }
  return result;
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

function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let hour = 0; hour <= 23; hour++) {
    for (const minute of [0, 15, 30, 45]) {
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      const mm = String(minute).padStart(2, '0');
      times.push(`${hour12}:${mm} ${period}`);
    }
  }
  return times;
}

const TIME_OPTIONS = generateTimeOptions();

function getNearestQuarterIndex(now: Date): number {
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const quarter = 15;
  const rounded = Math.round(totalMinutes / quarter) * quarter;
  const normalized = ((rounded % 1440) + 1440) % 1440;
  return Math.floor(normalized / quarter);
}

function rotateTimesToNearestNow(now: Date): string[] {
  const startIndex = getNearestQuarterIndex(now);
  return [...TIME_OPTIONS.slice(startIndex), ...TIME_OPTIONS.slice(0, startIndex)];
}

function generateRecurringDates(opts: {
  startISO: string;
  interval: number;
  unit: RepeatUnit;
  daysOfWeek: number[];
  endMode: EndMode;
  endISO?: string;
  occurrences?: number;
}): string[] {
  const { startISO, interval, unit, daysOfWeek, endMode, endISO, occurrences } = opts;
  const start = new Date(`${startISO}T00:00:00`);
  const end = endMode === 'on_date' && endISO ? new Date(`${endISO}T23:59:59`) : null;
  const maxCount = endMode === 'after_count' && occurrences ? occurrences : 200;
  const dates: string[] = [];
  const CAP = 200;

  if (unit === 'day') {
    // Daily: iterate day-by-day with given interval, filter by daysOfWeek
    const current = new Date(start);
    while (dates.length < maxCount && dates.length < CAP) {
      if (end && current > end) break;
      if (daysOfWeek.length === 0 || daysOfWeek.includes(current.getDay())) {
        dates.push(toISODate(current));
      }
      current.setDate(current.getDate() + interval);
    }
  } else {
    // Weekly: jump N weeks, match selected days within each week
    if (daysOfWeek.length === 0) return dates;
    // Start from the beginning of the start date's week (Sunday)
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    let weekOffset = 0;
    while (dates.length < maxCount && dates.length < CAP) {
      const currentWeekStart = new Date(weekStart);
      currentWeekStart.setDate(weekStart.getDate() + weekOffset * 7 * interval);
      let pastEnd = true;
      for (const dow of daysOfWeek.sort((a, b) => a - b)) {
        const d = new Date(currentWeekStart);
        d.setDate(currentWeekStart.getDate() + dow);
        if (d < start) continue;
        if (end && d > end) continue;
        pastEnd = false;
        if (dates.length >= maxCount || dates.length >= CAP) break;
        dates.push(toISODate(d));
      }
      weekOffset++;
      // Safety: if we're past the end date for all days, break
      if (end) {
        const lastDayOfWeek = new Date(currentWeekStart);
        lastDayOfWeek.setDate(currentWeekStart.getDate() + 6);
        if (lastDayOfWeek > end && pastEnd) break;
      }
      // Safety for after_count without end date - don't loop forever
      if (!end && weekOffset > 500) break;
    }
  }
  return dates;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FormErrors {
  eventType?: string;
  gameVenue?: string;
  title?: string;
  opponent?: string;
  date?: string;
  time?: string;
  general?: string;
  repeatDays?: string;
  repeatEndDate?: string;
  recurring?: string;
}

export default function CreateEventScreen() {
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const paramTeamId = (localParams.teamId ?? globalParams.teamId) as string | undefined;
  const { user } = useAuth();

  // Fallback: if teamId not in params, fetch from team_coaches
  const [resolvedTeamId, setResolvedTeamId] = useState<string | undefined>(paramTeamId);

  React.useEffect(() => {
    if (paramTeamId) {
      setResolvedTeamId(paramTeamId);
      return;
    }
    // Fallback: get the user's team from team_coaches
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('team_coaches')
        .select('team_id')
        .eq('coach_id', user.id)
        .limit(1)
        .single();
      if (data?.team_id) {
        setResolvedTeamId(data.team_id);
      }
    })();
  }, [paramTeamId, user]);

  const teamId = resolvedTeamId;

  // Form state
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [title, setTitle] = useState('');
  const [opponent, setOpponent] = useState('');
  const [gameVenue, setGameVenue] = useState<GameVenueType | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // Recurrence state
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatPreset, setRepeatPreset] = useState<RepeatPreset | null>(null);
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit>('week');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [repeatEndDate, setRepeatEndDate] = useState('');
  const [endMode, setEndMode] = useState<EndMode>('on_date');
  const [repeatOccurrences, setRepeatOccurrences] = useState('');
  const [showCustomRepeatModal, setShowCustomRepeatModal] = useState(false);
  const [customDraft, setCustomDraft] = useState<{
    interval: number;
    unit: RepeatUnit;
    days: number[];
    endMode: EndMode;
    endDate: string;
    occurrences: string;
  }>({ interval: 1, unit: 'week', days: [], endMode: 'on_date', endDate: '', occurrences: '' });

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<DatePickerTarget>('event_date');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerDraft, setTimePickerDraft] = useState('');
  const [timePickerOriginal, setTimePickerOriginal] = useState('');
  const [timePickerOptions, setTimePickerOptions] = useState<string[]>(TIME_OPTIONS);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));

  // Day of week derived from the date field
  const selectedDayOfWeek = useMemo(() => {
    const parsed = parseDateStr(date);
    return parsed ? parsed.getDay() : null;
  }, [date]);

  // Apply a preset: auto-populate interval/unit/days
  function applyPreset(preset: RepeatPreset) {
    setRepeatPreset(preset);
    setErrors((prev) => ({ ...prev, repeatDays: undefined, recurring: undefined }));
    if (preset === 'daily') {
      setRepeatInterval(1);
      setRepeatUnit('day');
      setRepeatDays([0, 1, 2, 3, 4, 5, 6]);
    } else if (preset === 'weekdays') {
      setRepeatInterval(1);
      setRepeatUnit('day');
      setRepeatDays([1, 2, 3, 4, 5]);
    } else if (preset === 'weekly') {
      setRepeatInterval(1);
      setRepeatUnit('week');
      setRepeatDays(selectedDayOfWeek !== null ? [selectedDayOfWeek] : []);
    } else if (preset === 'biweekly') {
      setRepeatInterval(2);
      setRepeatUnit('week');
      setRepeatDays(selectedDayOfWeek !== null ? [selectedDayOfWeek] : []);
    } else if (preset === 'custom') {
      // Open modal with current state as draft
      setCustomDraft({
        interval: repeatInterval,
        unit: repeatUnit,
        days: repeatDays.length > 0 ? [...repeatDays] : (selectedDayOfWeek !== null ? [selectedDayOfWeek] : []),
        endMode,
        endDate: repeatEndDate,
        occurrences: repeatOccurrences,
      });
      setShowCustomRepeatModal(true);
    }
  }

  // Clear all repeat state
  function clearRepeatState() {
    setRepeatPreset(null);
    setRepeatInterval(1);
    setRepeatUnit('week');
    setRepeatDays([]);
    setRepeatEndDate('');
    setEndMode('on_date');
    setRepeatOccurrences('');
  }

  // Computed recurring dates preview
  const recurringDates = useMemo(() => {
    if (!repeatEnabled || !repeatPreset) return [];
    const parsed = parseDateStr(date);
    if (!parsed) return [];
    if (endMode === 'on_date') {
      const parsedEnd = parseDateStr(repeatEndDate);
      if (!parsedEnd) return [];
      return generateRecurringDates({
        startISO: toISODate(parsed),
        interval: repeatInterval,
        unit: repeatUnit,
        daysOfWeek: repeatDays,
        endMode: 'on_date',
        endISO: toISODate(parsedEnd),
      });
    } else {
      const count = parseInt(repeatOccurrences, 10);
      if (!count || count <= 0) return [];
      return generateRecurringDates({
        startISO: toISODate(parsed),
        interval: repeatInterval,
        unit: repeatUnit,
        daysOfWeek: repeatDays,
        endMode: 'after_count',
        occurrences: count,
      });
    }
  }, [repeatEnabled, repeatPreset, repeatDays, date, repeatEndDate, repeatInterval, repeatUnit, endMode, repeatOccurrences]);

  const recurringCount = recurringDates.length;

  // ── Validation ─────────────────────────────────────────────────────────
  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!eventType) e.eventType = 'Select an event type';
    if (eventType === 'game' && !gameVenue) e.gameVenue = 'Select home or away';
    if (!title.trim()) e.title = 'Title is required';
    if (title.trim().length > 80) e.title = 'Title must be 80 characters or less';
    if (eventType === 'game' && !opponent.trim()) e.opponent = 'Opponent is required for games';
    if (opponent.trim().length > 80) e.opponent = 'Opponent must be 80 characters or less';

    // Date
    if (!date.trim()) {
      e.date = 'Date is required';
    } else {
      const parsed = parseDateStr(date);
      if (!parsed) {
        e.date = 'Enter a valid date (MM/DD/YYYY)';
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsed < today) e.date = 'Date must be today or in the future';
      }
    }

    // Time
    if (!time.trim()) {
      e.time = 'Time is required';
    } else if (!parseTime(time)) {
      e.time = 'Enter a valid time (e.g. 7:30 PM)';
    }

    // Recurrence validation
    if (repeatEnabled) {
      if (!repeatPreset) e.repeatDays = 'Select a repeat frequency';
      else if (repeatUnit === 'week' && repeatDays.length === 0) e.repeatDays = 'Select at least one day';

      if (endMode === 'on_date') {
        if (!repeatEndDate.trim()) {
          e.repeatEndDate = 'End date is required';
        } else {
          const parsedEnd = parseDateStr(repeatEndDate);
          const parsedStart = parseDateStr(date);
          if (!parsedEnd) {
            e.repeatEndDate = 'Enter a valid date (MM/DD/YYYY)';
          } else if (parsedStart && parsedEnd <= parsedStart) {
            e.repeatEndDate = 'End date must be after start date';
          }
        }
      } else {
        const count = parseInt(repeatOccurrences, 10);
        if (!count || count <= 0) e.repeatEndDate = 'Enter a valid number of occurrences';
      }

      // Check generated dates
      if (!e.repeatDays && !e.repeatEndDate && recurringDates.length === 0) {
        e.recurring = 'No matching dates for this configuration';
      }
    }

    return e;
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setGeneralError('');
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!user) {
      setGeneralError('You must be logged in to create events.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!teamId) {
      setGeneralError('No team selected. Please go back and try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // Debug: log values being sent
    if (__DEV__) console.log('CREATE EVENT DEBUG:', { teamId, userId: user.id, eventType, title });

    setLoading(true);
    try {
      const parsedDate = parseDateStr(date)!;
      const isoDate = toISODate(parsedDate);
      const kickoff = buildKickoffTimestamp(date, time);

      if (repeatEnabled && recurringDates.length > 0) {
        // Recurring event
        const groupId = generateUUIDv4();
        const rows = recurringDates.map((d) => ({
          team_id: teamId,
          event_type: eventType,
          title: title.trim(),
          opponent: eventType === 'game' ? opponent.trim() || null : null,
          venue: eventType === 'game' ? gameVenue : null,
          location: location.trim() || null,
          date: d,
          kickoff_time: buildKickoffTimestamp(
            // Convert ISO date back to MM/DD/YYYY for buildKickoffTimestamp
            `${d.slice(5, 7)}/${d.slice(8, 10)}/${d.slice(0, 4)}`,
            time,
          ),
          notes: description.trim() || null,
          created_by: user.id,
          recurrence_group_id: groupId,
        }));

        const { error } = await supabase.from('events').insert(rows);
        if (error) {
          setGeneralError(error.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
      } else {
        // Single event
        const { error } = await supabase.from('events').insert({
          team_id: teamId,
          event_type: eventType,
          title: title.trim(),
          opponent: eventType === 'game' ? opponent.trim() || null : null,
          venue: eventType === 'game' ? gameVenue : null,
          location: location.trim() || null,
          date: isoDate,
          kickoff_time: kickoff,
          notes: description.trim() || null,
          created_by: user.id,
          recurrence_group_id: null,
        });

        if (error) {
          setGeneralError(error.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      setGeneralError(err.message ?? 'Something went wrong');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  // ── Determine button text ──────────────────────────────────────────────
  const buttonTitle = useMemo(() => {
    if (repeatEnabled && recurringCount > 1) return `Create ${recurringCount} Events`;
    return 'Create Event';
  }, [repeatEnabled, recurringCount]);

  const dateCalendarDays = useMemo(() => buildCalendarGrid(calendarMonth), [calendarMonth]);
  const hasTimePickerChanges = timePickerDraft !== timePickerOriginal;
  const activeDatePickerValue = datePickerTarget === 'repeat_end_date' ? repeatEndDate : date;
  const repeatRowSummary = useMemo(() => {
    if (!repeatEnabled || !repeatPreset) return '';
    if (repeatPreset === 'daily') return 'Every day';
    if (repeatPreset === 'weekdays') return 'Every weekday';

    const shortDays = repeatDays.map((d) => DAY_NAMES[d].slice(0, 3)).join(', ');
    if (repeatPreset === 'weekly') return shortDays ? `Every week on ${shortDays}` : 'Every week';
    if (repeatPreset === 'biweekly') return shortDays ? `Every 2 weeks on ${shortDays}` : 'Every 2 weeks';

    const unitLabel = `${repeatUnit}${repeatInterval > 1 ? 's' : ''}`;
    const daySuffix = repeatUnit === 'week' && shortDays ? ` on ${shortDays}` : '';
    return `Every ${repeatInterval > 1 ? `${repeatInterval} ` : ''}${unitLabel}${daySuffix}`;
  }, [repeatEnabled, repeatPreset, repeatDays, repeatUnit, repeatInterval]);

  function openDatePicker(target: DatePickerTarget = 'event_date') {
    setDatePickerTarget(target);
    const sourceValue = target === 'repeat_end_date' ? repeatEndDate : date;
    const base = parseDateStr(sourceValue) ?? new Date();
    setCalendarMonth(startOfMonth(base));
    setShowDatePicker(true);
  }

  function selectDateFromCalendar(selected: Date) {
    const formatted = formatDateForInput(selected);
    if (datePickerTarget === 'repeat_end_date') {
      setRepeatEndDate(formatted);
      setErrors((prev) => ({ ...prev, repeatEndDate: undefined }));
    } else {
      setDate(formatted);
      setErrors((prev) => ({ ...prev, date: undefined }));
    }
    setShowDatePicker(false);
  }

  function clearDateFromCalendar() {
    if (datePickerTarget === 'repeat_end_date') {
      setRepeatEndDate('');
      setErrors((prev) => ({ ...prev, repeatEndDate: undefined }));
    } else {
      setDate('');
      setErrors((prev) => ({ ...prev, date: undefined }));
    }
    setShowDatePicker(false);
  }

  function selectTimeFromPicker(selectedTime: string) {
    setTimePickerDraft(selectedTime);
  }

  function openTimePicker() {
    setTimePickerOriginal(time);
    setTimePickerDraft(time);
    setTimePickerOptions(rotateTimesToNearestNow(new Date()));
    setShowTimePicker(true);
  }

  function saveTimeFromPicker() {
    setTime(timePickerDraft);
    setErrors((prev) => ({ ...prev, time: undefined }));
    setShowTimePicker(false);
  }

  function openRepeatSetup() {
    setRepeatEnabled(true);
  }

  function removeRepeatSetup() {
    setRepeatEnabled(false);
    clearRepeatState();
    setErrors((prev) => ({
      ...prev,
      repeatDays: undefined,
      repeatEndDate: undefined,
      recurring: undefined,
    }));
  }

  // ── Render ─────────────────────────────────────────────────────────────
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
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ───────────────────────────────────────────── */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              activeOpacity={0.7}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <GradientText
                text="Create Event"
                style={styles.headerTitle}
                colors={['#FFFFFF', '#D4EBFC']}
              />
              <Text style={styles.headerSubtitle}>Fill in the details for your team</Text>
            </View>
          </View>

          <View style={styles.formStack}>
            {/* General error banner */}
            {generalError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={Colors.error} />
                <Text style={styles.errorBannerText}>{generalError}</Text>
              </View>
            ) : null}

            {/* ── Event Type ─────────────────────────────────────── */}
            <Text style={styles.sectionLabel}>Event Type</Text>
            <View style={styles.typeGrid}>
              {EVENT_TYPE_OPTIONS.map((opt) => {
                const isActive = eventType === opt.key;
                const color = EVENT_TYPE_COLORS[opt.key];
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.typePill,
                      isActive && { borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setEventType(opt.key);
                      setErrors((prev) => ({ ...prev, eventType: undefined }));
                      if (opt.key !== 'game') {
                        setGameVenue(null);
                        setErrors((prev) => ({ ...prev, gameVenue: undefined }));
                      }
                    }}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={isActive ? color : 'rgba(255,255,255,0.9)'}
                    />
                    <Text
                      style={[
                        styles.typePillLabel,
                        isActive && { color },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isActive && (
                      <View style={[styles.checkDot, { backgroundColor: color }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.eventType ? (
              <View style={styles.inlineError}>
                <Ionicons name="alert-circle" size={14} color={Colors.error} />
                <Text style={styles.inlineErrorText}>{errors.eventType}</Text>
              </View>
            ) : null}

            <View style={styles.divider} />

            {/* ── Event Details ───────────────────────────────────── */}
            <Text style={styles.sectionLabel}>Event Details</Text>

            <Input
              label="Event Title"
              icon="bookmark-outline"
              value={title}
              onChangeText={(t) => {
                setTitle(t);
                setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              maxLength={80}
              error={errors.title}
            />
            <Text style={styles.charCounter}>{title.length}/80</Text>

            {eventType === 'game' && (
              <Input
                label="Opponent"
                icon="shirt-outline"
                value={opponent}
                onChangeText={(t) => {
                  setOpponent(t);
                  setErrors((prev) => ({ ...prev, opponent: undefined }));
                }}
                error={errors.opponent}
              />
            )}

            <TouchableOpacity activeOpacity={0.9} onPress={openDatePicker}>
              <View pointerEvents="none">
                <Input
                  label="Date (MM/DD/YYYY)"
                  icon="calendar-outline"
                  value={date}
                  onChangeText={(t) => {
                    setDate(maskDate(t));
                    setErrors((prev) => ({ ...prev, date: undefined }));
                  }}
                  editable={false}
                  showSoftInputOnFocus={false}
                  error={errors.date}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} onPress={openTimePicker}>
              <View pointerEvents="none">
                <Input
                  label="Time (e.g. 7:30 PM)"
                  icon="time-outline"
                  value={time}
                  onChangeText={(t) => {
                    setTime(t);
                    setErrors((prev) => ({ ...prev, time: undefined }));
                  }}
                  editable={false}
                  showSoftInputOnFocus={false}
                  error={errors.time}
                />
              </View>
            </TouchableOpacity>

            {eventType === 'game' && (
              <>
                <Text style={styles.subSectionLabel}>Home or Away</Text>
                <View style={styles.typeGrid}>
                  {GAME_VENUE_OPTIONS.map((opt) => {
                    const isActive = gameVenue === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[
                          styles.typePill,
                          isActive && { borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          setGameVenue(opt.key);
                          setErrors((prev) => ({ ...prev, gameVenue: undefined }));
                        }}
                      >
                        <Ionicons
                          name={opt.key === 'home' ? 'home-outline' : 'car-outline'}
                          size={18}
                          color={isActive ? Colors.primary : 'rgba(255,255,255,0.9)'}
                        />
                        <Text
                          style={[
                            styles.typePillLabel,
                            isActive && { color: Colors.primary },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.gameVenue ? (
                  <View style={styles.inlineError}>
                    <Ionicons name="alert-circle" size={14} color={Colors.error} />
                    <Text style={styles.inlineErrorText}>{errors.gameVenue}</Text>
                  </View>
                ) : null}
              </>
            )}

            <View style={styles.divider} />

            {/* ── Optional Details ────────────────────────────────── */}
            <Text style={styles.sectionLabel}>Optional Details</Text>

            <Input
              label="Location"
              icon="location-outline"
              value={location}
              onChangeText={setLocation}
            />

            <View style={styles.textAreaWrap}>
              <TextInput
                style={styles.textArea}
                placeholder="Description (optional)"
                placeholderTextColor="#94A3B8"
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
            </View>
            <Text style={styles.charCounter}>{description.length}/500</Text>

            <View style={styles.divider} />

            {/* ── Repeat Section ──────────────────────────────────── */}
            <TouchableOpacity
              style={styles.repeatHeader}
              activeOpacity={0.8}
              onPress={openRepeatSetup}
            >
              <Text style={styles.repeatHeaderLabel} numberOfLines={1}>
                Repeat this event
              </Text>
              <View style={styles.repeatHeaderAction}>
                <Text style={styles.repeatHeaderActionText}>
                  {repeatEnabled ? 'Edit' : 'Add'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {repeatEnabled ? (
              <View style={styles.repeatHeaderMeta}>
                <Text style={styles.repeatHeaderSummary} numberOfLines={2}>
                  {repeatRowSummary || 'Choose a repeat frequency'}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={removeRepeatSetup}
                  style={styles.repeatHeaderCancelBtn}
                >
                  <Text style={styles.repeatHeaderCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {repeatEnabled && (
              <View style={styles.repeatBody}>
                {/* Preset chips */}
                <View style={styles.presetGrid}>
                  {([
                    { key: 'daily' as RepeatPreset, label: 'Every day' },
                    { key: 'weekdays' as RepeatPreset, label: 'Every weekday' },
                    { key: 'weekly' as RepeatPreset, label: selectedDayOfWeek !== null ? `Every week on ${DAY_NAMES[selectedDayOfWeek]}` : 'Every week' },
                    { key: 'biweekly' as RepeatPreset, label: selectedDayOfWeek !== null ? `Every 2 weeks on ${DAY_NAMES[selectedDayOfWeek]}` : 'Every 2 weeks' },
                    { key: 'custom' as RepeatPreset, label: 'Custom...' },
                  ]).map((opt) => {
                    const isActive = repeatPreset === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        style={[
                          styles.presetChip,
                          isActive && styles.presetChipActive,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => applyPreset(opt.key)}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            isActive && styles.presetChipTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {errors.repeatDays ? (
                  <View style={styles.inlineError}>
                    <Ionicons name="alert-circle" size={14} color={Colors.error} />
                    <Text style={styles.inlineErrorText}>{errors.repeatDays}</Text>
                  </View>
                ) : null}

                {/* Summary & end condition (shown when preset selected) */}
                {repeatPreset && repeatPreset !== 'custom' && (
                  <View style={styles.repeatSummaryBlock}>
                    <Text style={styles.repeatSummaryText}>
                      {repeatUnit === 'day' && repeatInterval === 1 && repeatDays.length === 7
                        ? 'Repeats every day'
                        : repeatUnit === 'day' && repeatDays.length === 5
                        ? 'Repeats every weekday'
                        : `Repeats every ${repeatInterval > 1 ? `${repeatInterval} ` : ''}${repeatUnit}${repeatInterval > 1 ? 's' : ''}${repeatDays.length > 0 && repeatUnit === 'week' ? ` on ${repeatDays.map((d) => DAY_NAMES[d]).join(', ')}` : ''}`}
                    </Text>
                  </View>
                )}

                {repeatPreset === 'custom' && (
                  <View style={styles.repeatSummaryBlock}>
                    <Text style={styles.repeatSummaryText}>
                      Every {repeatInterval > 1 ? `${repeatInterval} ` : ''}{repeatUnit}{repeatInterval > 1 ? 's' : ''}
                      {repeatUnit === 'week' && repeatDays.length > 0 ? ` on ${repeatDays.map((d) => DAY_NAMES[d]).join(', ')}` : ''}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setCustomDraft({
                          interval: repeatInterval,
                          unit: repeatUnit,
                          days: [...repeatDays],
                          endMode,
                          endDate: repeatEndDate,
                          occurrences: repeatOccurrences,
                        });
                        setShowCustomRepeatModal(true);
                      }}
                    >
                      <Text style={styles.editLink}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* End condition picker */}
                {repeatPreset && (
                  <View style={styles.endConditionBlock}>
                    <Text style={styles.repeatSubLabel}>Ends</Text>
                    <View style={styles.endModeRow}>
                      <TouchableOpacity
                        style={[styles.endModeBtn, endMode === 'on_date' && styles.endModeBtnActive]}
                        activeOpacity={0.7}
                        onPress={() => setEndMode('on_date')}
                      >
                        <Text style={[styles.endModeBtnText, endMode === 'on_date' && styles.endModeBtnTextActive]}>On date</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.endModeBtn, endMode === 'after_count' && styles.endModeBtnActive]}
                        activeOpacity={0.7}
                        onPress={() => setEndMode('after_count')}
                      >
                        <Text style={[styles.endModeBtnText, endMode === 'after_count' && styles.endModeBtnTextActive]}>After X times</Text>
                      </TouchableOpacity>
                    </View>

                    {endMode === 'on_date' ? (
                      <TouchableOpacity activeOpacity={0.9} onPress={() => openDatePicker('repeat_end_date')}>
                        <View pointerEvents="none">
                          <Input
                            label="End Date (MM/DD/YYYY)"
                            icon="calendar-outline"
                            value={repeatEndDate}
                            onChangeText={(t) => {
                              setRepeatEndDate(maskDate(t));
                              setErrors((prev) => ({ ...prev, repeatEndDate: undefined }));
                            }}
                            editable={false}
                            showSoftInputOnFocus={false}
                            error={errors.repeatEndDate}
                          />
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <Input
                        label="Number of occurrences"
                        icon="repeat-outline"
                        value={repeatOccurrences}
                        onChangeText={(t) => {
                          setRepeatOccurrences(t.replace(/\D/g, ''));
                          setErrors((prev) => ({ ...prev, repeatEndDate: undefined }));
                        }}
                        keyboardType="numeric"
                        maxLength={3}
                        error={errors.repeatEndDate}
                      />
                    )}
                  </View>
                )}

                {errors.recurring ? (
                  <View style={styles.inlineError}>
                    <Ionicons name="alert-circle" size={14} color={Colors.error} />
                    <Text style={styles.inlineErrorText}>{errors.recurring}</Text>
                  </View>
                ) : null}

                {recurringCount > 0 && (
                  <Text style={styles.previewText}>
                    Creates {recurringCount} event{recurringCount !== 1 ? 's' : ''}
                    {recurringCount >= 200 ? ' (max)' : ''}
                  </Text>
                )}
              </View>
            )}

            {/* ── Submit Button ───────────────────────────────────── */}
            <View style={styles.submitButtonWrap}>
              <Button
                title={buttonTitle}
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable style={styles.calendarModalBackdrop} onPress={() => setShowDatePicker(false)}>
          <Pressable style={styles.calendarModalCard} onPress={() => {}}>
            <View style={styles.calendarModalHeader}>
              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={() =>
                  setCalendarMonth(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                  )
                }
              >
                <Ionicons name="chevron-back" size={18} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.calendarModalTitle}>{monthLabel(calendarMonth)}</Text>
              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={() =>
                  setCalendarMonth(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  )
                }
              >
                <Ionicons name="chevron-forward" size={18} color="#0F172A" />
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
              {dateCalendarDays.map((dayObj, idx) => {
                const inMonth = dayObj.getMonth() === calendarMonth.getMonth();
                const isSelected = !!activeDatePickerValue && (() => {
                  const parsed = parseDateStr(activeDatePickerValue);
                  return parsed ? sameDay(parsed, dayObj) : false;
                })();
                const today = sameDay(dayObj, new Date());

                return (
                  <TouchableOpacity
                    key={`${dayObj.toISOString()}-${idx}`}
                    style={[
                      styles.calendarDayCell,
                      isSelected && styles.calendarDayCellSelected,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => selectDateFromCalendar(dayObj)}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        !inMonth && styles.calendarDayTextMuted,
                        today && styles.calendarDayTextToday,
                        isSelected && styles.calendarDayTextSelected,
                      ]}
                    >
                      {dayObj.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.calendarModalActions}>
              <TouchableOpacity
                style={styles.calendarActionBtn}
                onPress={clearDateFromCalendar}
              >
                <Text style={styles.calendarActionBtnText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calendarActionBtn}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.calendarActionBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calendarActionBtn, styles.calendarActionBtnPrimary]}
                onPress={() => {
                  const today = new Date();
                  setCalendarMonth(startOfMonth(today));
                  selectDateFromCalendar(today);
                }}
              >
                <Text style={styles.calendarActionBtnPrimaryText}>Today</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <Pressable style={styles.calendarModalBackdrop} onPress={() => setShowTimePicker(false)}>
          <Pressable style={styles.timeModalCard} onPress={() => {}}>
            <View style={styles.timeModalHeader}>
              <Text style={styles.timeModalTitle}>Select Time</Text>
              <TouchableOpacity
                style={styles.timeModalCloseBtn}
                onPress={() => setShowTimePicker(false)}
              >
                <Ionicons name="close" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.timeOptionsList}
              contentContainerStyle={styles.timeOptionsListContent}
              showsVerticalScrollIndicator={false}
            >
              {timePickerOptions.map((option) => {
                const isSelected = timePickerDraft === option;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.timeOptionBtn,
                      isSelected && styles.timeOptionBtnSelected,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => selectTimeFromPicker(option)}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        isSelected && styles.timeOptionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.calendarModalActions}>
              <TouchableOpacity
                style={styles.calendarActionBtn}
                onPress={() => setTimePickerDraft('')}
              >
                <Text style={styles.calendarActionBtnText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calendarActionBtn}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.calendarActionBtnText}>Cancel</Text>
              </TouchableOpacity>
              {hasTimePickerChanges ? (
                <TouchableOpacity
                  style={[styles.calendarActionBtn, styles.calendarActionBtnPrimary]}
                  onPress={saveTimeFromPicker}
                >
                  <Text style={styles.calendarActionBtnPrimaryText}>Save</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {/* ── Custom Repeat Modal ──────────────────────────────── */}
      <Modal
        visible={showCustomRepeatModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomRepeatModal(false)}
      >
        <Pressable style={styles.calendarModalBackdrop} onPress={() => setShowCustomRepeatModal(false)}>
          <Pressable style={styles.customRepeatCard} onPress={() => {}}>
            <View style={styles.customRepeatHeader}>
              <Text style={styles.customRepeatTitle}>Custom Repeat</Text>
            </View>

            {/* Frequency row */}
            <View style={styles.frequencyRow}>
              <Text style={styles.frequencyLabel}>Every</Text>
              <View style={styles.frequencyInputWrap}>
                <TextInput
                  style={styles.frequencyInput}
                  value={String(customDraft.interval)}
                  onChangeText={(t) => {
                    const n = parseInt(t.replace(/\D/g, ''), 10);
                    setCustomDraft((d) => ({ ...d, interval: n > 0 ? n : 1 }));
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <View style={styles.unitToggleRow}>
                <TouchableOpacity
                  style={[styles.unitBtn, customDraft.unit === 'day' && styles.unitBtnActive]}
                  onPress={() => setCustomDraft((d) => ({ ...d, unit: 'day' }))}
                >
                  <Text style={[styles.unitBtnText, customDraft.unit === 'day' && styles.unitBtnTextActive]}>
                    {customDraft.interval === 1 ? 'day' : 'days'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitBtn, customDraft.unit === 'week' && styles.unitBtnActive]}
                  onPress={() => setCustomDraft((d) => ({ ...d, unit: 'week' }))}
                >
                  <Text style={[styles.unitBtnText, customDraft.unit === 'week' && styles.unitBtnTextActive]}>
                    {customDraft.interval === 1 ? 'week' : 'weeks'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Day chips (week mode only) */}
            {customDraft.unit === 'week' && (
              <View style={styles.modalDayChipsSection}>
                <Text style={styles.modalDaySectionLabel}>Repeat on</Text>
                <View style={styles.dayChipsRow}>
                  {DAY_LABELS.map((label, idx) => {
                    const isActive = customDraft.days.includes(idx);
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.dayChip, isActive && styles.dayChipActive]}
                        activeOpacity={0.7}
                        onPress={() => {
                          setCustomDraft((d) => ({
                            ...d,
                            days: d.days.includes(idx)
                              ? d.days.filter((x) => x !== idx)
                              : [...d.days, idx],
                          }));
                        }}
                      >
                        <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={styles.calendarModalActions}>
              <TouchableOpacity
                style={styles.calendarActionBtn}
                onPress={() => setShowCustomRepeatModal(false)}
              >
                <Text style={styles.calendarActionBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calendarActionBtn, styles.calendarActionBtnPrimary]}
                onPress={() => {
                  setRepeatInterval(customDraft.interval);
                  setRepeatUnit(customDraft.unit);
                  setRepeatDays(customDraft.days);
                  setShowCustomRepeatModal(false);
                }}
              >
                <Text style={styles.calendarActionBtnPrimaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
    paddingTop: 72,
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },

  // Form stack (no full white panel)
  formStack: {
    gap: 10,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  errorBannerText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // Section label
  sectionLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 8,
  },
  subSectionLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: -2,
    marginBottom: 6,
  },

  // Type grid
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '47%' as any,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  typePillLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    flex: 1,
  },
  checkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Inline error
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginBottom: 4,
  },
  inlineErrorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginVertical: 16,
  },

  // Char counter
  charCounter: {
    textAlign: 'right',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: -14,
    marginBottom: 4,
  },

  // Text area
  textAreaWrap: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  textArea: {
    fontSize: 16,
    color: Colors.textPrimary,
    minHeight: 100,
  },

  // Repeat section
  repeatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    marginBottom: 10,
    width: '100%',
  },
  repeatHeaderAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  repeatHeaderActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  repeatHeaderLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 24,
    flex: 1,
    paddingRight: 12,
    minWidth: 0,
    marginTop: 2,
  },
  repeatHeaderMeta: {
    marginTop: -4,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  repeatHeaderSummary: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  repeatHeaderCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(252, 165, 165, 0.55)',
  },
  repeatHeaderCancelText: {
    color: '#FECACA',
    fontSize: 12,
    fontWeight: '800',
  },
  repeatBody: {
    gap: 10,
    marginTop: 4,
  },
  repeatSubLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    fontWeight: '700',
  },
  dayChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  dayChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  dayChipTextActive: {
    color: Colors.primary,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  presetChipActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  presetChipText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
  },
  presetChipTextActive: {
    color: Colors.primary,
  },
  repeatSummaryBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  repeatSummaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  editLink: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
    marginLeft: 8,
  },
  endConditionBlock: {
    gap: 8,
  },
  endModeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  endModeBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  endModeBtnActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  endModeBtnText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
  },
  endModeBtnTextActive: {
    color: Colors.primary,
  },
  previewText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },

  // Custom repeat modal
  customRepeatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
  },
  customRepeatHeader: {
    marginBottom: 16,
  },
  customRepeatTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  frequencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  frequencyLabel: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
  frequencyInputWrap: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    width: 48,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  frequencyInput: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    width: '100%',
    height: '100%',
  },
  unitToggleRow: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  unitBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
  },
  unitBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  unitBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  unitBtnTextActive: {
    color: Colors.primary,
  },
  modalDayChipsSection: {
    gap: 8,
    marginBottom: 16,
  },
  modalDaySectionLabel: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
  },
  modalEndsSection: {
    gap: 8,
    marginBottom: 8,
  },
  modalEndInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    height: 44,
  },
  modalEndInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
  },
  modalEndSuffix: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  submitButtonWrap: {
    marginTop: 28,
  },

  // Calendar modal
  calendarModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  calendarModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  calendarNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  calendarModalTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  calendarWeekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekHeaderText: {
    flex: 1,
    textAlign: 'center',
    color: '#64748B',
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
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  calendarDayTextMuted: {
    color: '#CBD5E1',
  },
  calendarDayTextToday: {
    color: Colors.primary,
    fontWeight: '800',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
  },
  calendarModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
  },
  calendarActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  calendarActionBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  calendarActionBtnPrimary: {
    backgroundColor: Colors.primary,
  },
  calendarActionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Time modal
  timeModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    maxHeight: '72%',
  },
  timeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  timeModalTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  timeModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  timeOptionsList: {
    maxHeight: 360,
  },
  timeOptionsListContent: {
    gap: 8,
    paddingBottom: 4,
  },
  timeOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timeOptionBtnSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeOptionText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
  timeOptionTextSelected: {
    color: '#FFFFFF',
  },
});
