import React, { useEffect, useMemo, useState } from 'react';
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import GradientText from '@/components/ui/GradientText';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type EventType = 'game' | 'practice' | 'meeting';
type GameVenueType = 'home' | 'away';

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

const GAME_VENUE_OPTIONS: { key: GameVenueType; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'away', label: 'Away' },
];

const CALENDAR_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CALENDAR_MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseTime(raw: string): Date | null {
  const trimmed = raw.trim();
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

function formatDateForInput(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTimeFromISO(isoString: string): string {
  const d = new Date(isoString);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
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
  const rounded = Math.round(totalMinutes / 15) * 15;
  const normalized = ((rounded % 1440) + 1440) % 1440;
  return Math.floor(normalized / 15);
}

function rotateTimesToNearestNow(now: Date): string[] {
  const startIndex = getNearestQuarterIndex(now);
  return [...TIME_OPTIONS.slice(startIndex), ...TIME_OPTIONS.slice(0, startIndex)];
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
}

export default function EditEventScreen() {
  const { teamId, eventId, recurrenceGroupId } = useLocalSearchParams<{
    teamId: string;
    eventId: string;
    recurrenceGroupId?: string;
  }>();

  // Form state
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [title, setTitle] = useState('');
  const [opponent, setOpponent] = useState('');
  const [gameVenue, setGameVenue] = useState<GameVenueType | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerDraft, setTimePickerDraft] = useState('');
  const [timePickerOriginal, setTimePickerOriginal] = useState('');
  const [timePickerOptions, setTimePickerOptions] = useState<string[]>(TIME_OPTIONS);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));

  const isRecurring = !!recurrenceGroupId;

  // Fetch event data on mount
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (error || !data) {
        setLoading(false);
        return;
      }
      setEventType(data.event_type as EventType);
      setTitle(data.title ?? '');
      setOpponent(data.opponent ?? '');
      setGameVenue(data.venue as GameVenueType | null);
      setLocation(data.location ?? '');
      setDescription(data.notes ?? '');
      if (data.date) {
        const d = new Date(`${data.date}T00:00:00`);
        setDate(formatDateForInput(d));
        setCalendarMonth(startOfMonth(d));
      }
      if (data.kickoff_time) {
        setTime(formatTimeFromISO(data.kickoff_time));
      }
      setLoading(false);
    })();
  }, [eventId]);

  const dateCalendarDays = useMemo(() => buildCalendarGrid(calendarMonth), [calendarMonth]);
  const hasTimePickerChanges = timePickerDraft !== timePickerOriginal;

  // ── Validation ─────────────────────────────────────────────────────────
  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!eventType) e.eventType = 'Select an event type';
    if (eventType === 'game' && !gameVenue) e.gameVenue = 'Select home or away';
    if (!title.trim()) e.title = 'Title is required';
    if (eventType === 'game' && !opponent.trim()) e.opponent = 'Opponent is required for games';
    if (!date.trim()) {
      e.date = 'Date is required';
    } else if (!parseDateStr(date)) {
      e.date = 'Enter a valid date (MM/DD/YYYY)';
    }
    if (!time.trim()) {
      e.time = 'Time is required';
    } else if (!parseTime(time)) {
      e.time = 'Enter a valid time (e.g. 7:30 PM)';
    }
    return e;
  }

  // ── Save ─────────────────────────────────────────────────────────────
  function handleSave() {
    setGeneralError('');
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (isRecurring) {
      Alert.alert(
        'Edit Recurring Event',
        'This event is part of a series.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'This Event Only', onPress: () => performSave('single') },
          { text: 'All Events in Series', onPress: () => performSave('all') },
        ],
      );
    } else {
      performSave('single');
    }
  }

  async function performSave(scope: 'single' | 'all') {
    setSaving(true);
    try {
      const parsedDate = parseDateStr(date)!;
      const isoDate = toISODate(parsedDate);
      const kickoff = buildKickoffTimestamp(date, time);

      if (scope === 'all' && recurrenceGroupId) {
        // Update shared fields for all events in series (NOT date)
        const { error } = await supabase
          .from('events')
          .update({
            event_type: eventType,
            title: title.trim(),
            opponent: eventType === 'game' ? opponent.trim() || null : null,
            venue: eventType === 'game' ? gameVenue : null,
            location: location.trim() || null,
            notes: description.trim() || null,
            kickoff_time: kickoff,
          })
          .eq('recurrence_group_id', recurrenceGroupId);
        if (error) {
          setGeneralError(error.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
      } else {
        const { error } = await supabase
          .from('events')
          .update({
            event_type: eventType,
            title: title.trim(),
            opponent: eventType === 'game' ? opponent.trim() || null : null,
            venue: eventType === 'game' ? gameVenue : null,
            location: location.trim() || null,
            date: isoDate,
            kickoff_time: kickoff,
            notes: description.trim() || null,
          })
          .eq('id', eventId);
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
      setSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  function handleDelete() {
    if (isRecurring) {
      Alert.alert(
        'Delete Recurring Event',
        'This event is part of a series.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'This Event Only', onPress: () => confirmDelete('single') },
          {
            text: 'All Events in Series',
            style: 'destructive',
            onPress: () => confirmDelete('all'),
          },
        ],
      );
    } else {
      confirmDelete('single');
    }
  }

  function confirmDelete(scope: 'single' | 'all') {
    const message =
      scope === 'all'
        ? 'Are you sure you want to delete all events in this series? This cannot be undone.'
        : 'Are you sure you want to delete this event? This cannot be undone.';

    Alert.alert('Delete Event', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => performDelete(scope) },
    ]);
  }

  async function performDelete(scope: 'single' | 'all') {
    setDeleting(true);
    try {
      let error;
      if (scope === 'all' && recurrenceGroupId) {
        ({ error } = await supabase
          .from('events')
          .delete()
          .eq('recurrence_group_id', recurrenceGroupId));
      } else {
        ({ error } = await supabase.from('events').delete().eq('id', eventId));
      }

      if (error) {
        setGeneralError(error.message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigate back past detail screen to events list
      router.back();
      setTimeout(() => router.back(), 100);
    } catch (err: any) {
      setGeneralError(err.message ?? 'Something went wrong');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setDeleting(false);
    }
  }

  // ── Picker helpers ─────────────────────────────────────────────────────
  function openDatePicker() {
    const base = parseDateStr(date) ?? new Date();
    setCalendarMonth(startOfMonth(base));
    setShowDatePicker(true);
  }

  function selectDateFromCalendar(selected: Date) {
    setDate(formatDateForInput(selected));
    setErrors((prev) => ({ ...prev, date: undefined }));
    setShowDatePicker(false);
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

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <LinearGradient colors={Gradients.primary as unknown as string[]} style={styles.gradient}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </LinearGradient>
    );
  }

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
          {/* Header */}
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
                text="Edit Event"
                style={styles.headerTitle}
                colors={['#FFFFFF', '#D4EBFC']}
              />
              <Text style={styles.headerSubtitle}>Update event details</Text>
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

            {/* Event Type */}
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
                      style={[styles.typePillLabel, isActive && { color }]}
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

            {/* Event Details */}
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
                  onChangeText={() => {}}
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
                  onChangeText={() => {}}
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
                          style={[styles.typePillLabel, isActive && { color: Colors.primary }]}
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

            {/* Optional Details */}
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

            {/* Save Button */}
            <View style={styles.submitButtonWrap}>
              <Button
                title="Save Changes"
                onPress={handleSave}
                loading={saving}
                disabled={saving || deleting}
              />
            </View>

            {/* Delete Button */}
            <TouchableOpacity
              style={styles.deleteBtn}
              activeOpacity={0.7}
              onPress={handleDelete}
              disabled={saving || deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  <Text style={styles.deleteBtnText}>Delete Event</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
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
                const isSelected = !!date && (() => {
                  const parsed = parseDateStr(date);
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

      {/* Time Picker Modal */}
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
                    onPress={() => setTimePickerDraft(option)}
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
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Form stack
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

  submitButtonWrap: {
    marginTop: 28,
  },

  // Delete button
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: UI.radius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginTop: 12,
    minHeight: 52,
  },
  deleteBtnText: {
    color: Colors.error,
    fontSize: 15,
    fontWeight: '700',
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
