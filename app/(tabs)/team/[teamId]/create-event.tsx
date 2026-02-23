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
  Switch,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Gradients } from '@/constants/colors';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type EventType = 'game' | 'practice' | 'meeting';

const EVENT_TYPE_OPTIONS: { key: EventType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'game', label: 'Game', icon: 'football-outline' },
  { key: 'practice', label: 'Practice', icon: 'fitness-outline' },
  { key: 'meeting', label: 'Meeting', icon: 'people-outline' },
];

const EVENT_TYPE_COLORS: Record<EventType, string> = {
  game: '#EF4444',
  practice: '#3B82F6',
  meeting: '#8B5CF6',
};

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function generateRecurringDates(
  startISO: string,
  endISO: string,
  daysOfWeek: number[],
): string[] {
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T23:59:59`);
  const dates: string[] = [];
  const current = new Date(start);

  while (current <= end && dates.length < 200) {
    if (daysOfWeek.includes(current.getDay())) {
      dates.push(current.toISOString().slice(0, 10));
    }
    current.setDate(current.getDate() + 1);
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
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const { user } = useAuth();
  const { height } = useWindowDimensions();

  // Form state
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [title, setTitle] = useState('');
  const [opponent, setOpponent] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // Recurrence state
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [repeatEndDate, setRepeatEndDate] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');

  // Computed recurring dates preview
  const recurringDates = useMemo(() => {
    if (!repeatEnabled || repeatDays.length === 0) return [];
    const parsed = parseDateStr(date);
    const parsedEnd = parseDateStr(repeatEndDate);
    if (!parsed || !parsedEnd) return [];
    return generateRecurringDates(toISODate(parsed), toISODate(parsedEnd), repeatDays);
  }, [repeatEnabled, repeatDays, date, repeatEndDate]);

  const recurringCount = recurringDates.length;

  // ── Validation ─────────────────────────────────────────────────────────
  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!eventType) e.eventType = 'Select an event type';
    if (!title.trim()) e.title = 'Title is required';
    if (eventType === 'game' && !opponent.trim()) e.opponent = 'Opponent is required for games';

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
      if (repeatDays.length === 0) e.repeatDays = 'Select at least one day';
      if (!repeatEndDate.trim()) {
        e.repeatEndDate = 'End date is required';
      } else {
        const parsedEnd = parseDateStr(repeatEndDate);
        const parsedStart = parseDateStr(date);
        if (!parsedEnd) {
          e.repeatEndDate = 'Enter a valid date (MM/DD/YYYY)';
        } else if (parsedStart && parsedEnd <= parsedStart) {
          e.repeatEndDate = 'End date must be after start date';
        } else if (parsedStart && parsedEnd) {
          const dates = generateRecurringDates(
            toISODate(parsedStart),
            toISODate(parsedEnd),
            repeatDays,
          );
          if (dates.length === 0) e.recurring = 'No matching dates in that range';
        }
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

    setLoading(true);
    try {
      const parsedDate = parseDateStr(date)!;
      const isoDate = toISODate(parsedDate);
      const kickoff = buildKickoffTimestamp(date, time);

      if (repeatEnabled && recurringDates.length > 0) {
        // Recurring event
        const groupId = crypto.randomUUID();
        const rows = recurringDates.map((d) => ({
          team_id: teamId,
          event_type: eventType,
          title: title.trim(),
          opponent: eventType === 'game' ? opponent.trim() || null : null,
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

  // ── Day chip toggle ────────────────────────────────────────────────────
  function toggleDay(day: number) {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function selectWeekdays() {
    setRepeatDays([1, 2, 3, 4, 5]);
  }

  function selectEveryDay() {
    setRepeatDays([0, 1, 2, 3, 4, 5, 6]);
  }

  // ── Determine button text ──────────────────────────────────────────────
  const buttonTitle = useMemo(() => {
    if (repeatEnabled && recurringCount > 1) return `Create ${recurringCount} Events`;
    return 'Create Event';
  }, [repeatEnabled, recurringCount]);

  const formCardHeight = useMemo(() => {
    // Fixed in-frame form panel height so it never collides with the floating team tab bar.
    // Leaves a visible gap above the navbar and scrolls inside the card instead.
    const reservedBottom = Platform.OS === 'ios' ? 245 : 210; // navbar + gap
    const reservedTop = Platform.OS === 'ios' ? 175 : 150; // header block + top spacing
    const available = height - reservedTop - reservedBottom;
    return Math.max(500, Math.min(620, available));
  }, [height]);

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
              <Text style={styles.headerTitle}>Create Event</Text>
              <Text style={styles.headerSubtitle}>Fill in the details for your team</Text>
            </View>
          </View>

          {/* ── White card ───────────────────────────────────────── */}
          <View style={[styles.card, { height: formCardHeight }]}>
            <ScrollView
              style={styles.cardScroll}
              contentContainerStyle={styles.cardContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
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
                      isActive && { borderColor: color, backgroundColor: color + '12' },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setEventType(opt.key);
                      setErrors((prev) => ({ ...prev, eventType: undefined }));
                    }}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={isActive ? color : '#94A3B8'}
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

            <Input
              label="Date (MM/DD/YYYY)"
              icon="calendar-outline"
              value={date}
              onChangeText={(t) => {
                setDate(maskDate(t));
                setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              keyboardType="numeric"
              maxLength={10}
              error={errors.date}
            />

            <Input
              label="Time (e.g. 7:30 PM)"
              icon="time-outline"
              value={time}
              onChangeText={(t) => {
                setTime(t);
                setErrors((prev) => ({ ...prev, time: undefined }));
              }}
              error={errors.time}
            />

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
            <View style={styles.repeatHeader}>
              <Text style={styles.repeatHeaderLabel} numberOfLines={1}>
                Repeat this event
              </Text>
              <View style={styles.repeatSwitchWrap}>
                <Switch
                  value={repeatEnabled}
                  onValueChange={setRepeatEnabled}
                  trackColor={{ false: '#E2E8F0', true: Colors.primary + '60' }}
                  thumbColor={repeatEnabled ? Colors.primary : '#fff'}
                />
              </View>
            </View>

            {repeatEnabled && (
              <View style={styles.repeatBody}>
                <Text style={styles.repeatSubLabel}>Repeat on</Text>

                <View style={styles.dayChipsRow}>
                  {DAY_LABELS.map((label, idx) => {
                    const isActive = repeatDays.includes(idx);
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.dayChip,
                          isActive && styles.dayChipActive,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => toggleDay(idx)}
                      >
                        <Text
                          style={[
                            styles.dayChipText,
                            isActive && styles.dayChipTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.presetRow}>
                  <TouchableOpacity
                    style={styles.presetBtn}
                    activeOpacity={0.7}
                    onPress={selectWeekdays}
                  >
                    <Text style={styles.presetBtnText}>Weekdays</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetBtn}
                    activeOpacity={0.7}
                    onPress={selectEveryDay}
                  >
                    <Text style={styles.presetBtnText}>Every day</Text>
                  </TouchableOpacity>
                </View>

                {errors.repeatDays ? (
                  <View style={styles.inlineError}>
                    <Ionicons name="alert-circle" size={14} color={Colors.error} />
                    <Text style={styles.inlineErrorText}>{errors.repeatDays}</Text>
                  </View>
                ) : null}

                <Input
                  label="End Date (MM/DD/YYYY)"
                  icon="calendar-outline"
                  value={repeatEndDate}
                  onChangeText={(t) => {
                    setRepeatEndDate(maskDate(t));
                    setErrors((prev) => ({ ...prev, repeatEndDate: undefined }));
                  }}
                  keyboardType="numeric"
                  maxLength={10}
                  error={errors.repeatEndDate}
                />

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
            </ScrollView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 190,
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

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 0,
    gap: 0,
    overflow: 'hidden',
    marginBottom: 10,
  },
  cardScroll: {
    width: '100%',
    flex: 1,
  },
  cardContent: {
    width: '100%',
    padding: 20,
    gap: 10,
    paddingBottom: 44,
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
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 8,
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
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '47%' as any,
  },
  typePillLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
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
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },

  // Char counter
  charCounter: {
    textAlign: 'right',
    color: '#94A3B8',
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
  repeatHeaderLabel: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    paddingRight: 12,
    minWidth: 0,
  },
  repeatSwitchWrap: {
    width: 56,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  repeatBody: {
    gap: 10,
    marginTop: 4,
  },
  repeatSubLabel: {
    color: '#334155',
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
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  presetBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  previewText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  submitButtonWrap: {
    marginTop: 28,
  },
});
