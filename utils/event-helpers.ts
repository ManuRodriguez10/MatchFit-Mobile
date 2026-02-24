// ---------------------------------------------------------------------------
// Pure helper functions extracted from create-event.tsx for testability
// ---------------------------------------------------------------------------

export type RepeatUnit = 'day' | 'week';
export type EndMode = 'on_date' | 'after_count';
export type RepeatPreset = 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'custom';

export function parseDateStr(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateForInput(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let result = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) result += '/';
    result += digits[i];
  }
  return result;
}

export function parseTime(raw: string): Date | null {
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

export function buildKickoffTimestamp(dateStr: string, timeStr: string): string | null {
  const d = parseDateStr(dateStr);
  const t = parseTime(timeStr);
  if (!d || !t) return null;
  d.setHours(t.getHours(), t.getMinutes(), 0, 0);
  return d.toISOString();
}

export function generateRecurringDates(opts: {
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
    const current = new Date(start);
    while (dates.length < maxCount && dates.length < CAP) {
      if (end && current > end) break;
      if (daysOfWeek.length === 0 || daysOfWeek.includes(current.getDay())) {
        dates.push(toISODate(current));
      }
      current.setDate(current.getDate() + interval);
    }
  } else {
    if (daysOfWeek.length === 0) return dates;
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
      if (end) {
        const lastDayOfWeek = new Date(currentWeekStart);
        lastDayOfWeek.setDate(currentWeekStart.getDate() + 6);
        if (lastDayOfWeek > end && pastEnd) break;
      }
      if (!end && weekOffset > 500) break;
    }
  }
  return dates;
}

/**
 * Simulates applyPreset logic — returns the state that would be set.
 * selectedDayOfWeek is the day-of-week (0-6) from the date field, or null.
 */
export function computePresetState(
  preset: RepeatPreset,
  selectedDayOfWeek: number | null,
): { interval: number; unit: RepeatUnit; days: number[] } | null {
  if (preset === 'daily') {
    return { interval: 1, unit: 'day', days: [0, 1, 2, 3, 4, 5, 6] };
  }
  if (preset === 'weekdays') {
    return { interval: 1, unit: 'day', days: [1, 2, 3, 4, 5] };
  }
  if (preset === 'weekly') {
    return { interval: 1, unit: 'week', days: selectedDayOfWeek !== null ? [selectedDayOfWeek] : [] };
  }
  if (preset === 'biweekly') {
    return { interval: 2, unit: 'week', days: selectedDayOfWeek !== null ? [selectedDayOfWeek] : [] };
  }
  // 'custom' opens modal, no auto-state
  return null;
}

export interface FormErrors {
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

/**
 * Pure validation function extracted from CreateEventScreen.
 * Takes all form state as input, returns error map.
 */
export function validateEventForm(state: {
  eventType: string | null;
  gameVenue: string | null;
  title: string;
  opponent: string;
  date: string;
  time: string;
  repeatEnabled: boolean;
  repeatPreset: RepeatPreset | null;
  repeatUnit: RepeatUnit;
  repeatDays: number[];
  endMode: EndMode;
  repeatEndDate: string;
  repeatOccurrences: string;
  recurringDates: string[];
}): FormErrors {
  const e: FormErrors = {};
  if (!state.eventType) e.eventType = 'Select an event type';
  if (state.eventType === 'game' && !state.gameVenue) e.gameVenue = 'Select home or away';
  if (!state.title.trim()) e.title = 'Title is required';
  if (state.eventType === 'game' && !state.opponent.trim()) e.opponent = 'Opponent is required for games';

  // Date
  if (!state.date.trim()) {
    e.date = 'Date is required';
  } else {
    const parsed = parseDateStr(state.date);
    if (!parsed) {
      e.date = 'Enter a valid date (MM/DD/YYYY)';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsed < today) e.date = 'Date must be today or in the future';
    }
  }

  // Time
  if (!state.time.trim()) {
    e.time = 'Time is required';
  } else if (!parseTime(state.time)) {
    e.time = 'Enter a valid time (e.g. 7:30 PM)';
  }

  // Recurrence validation
  if (state.repeatEnabled) {
    if (!state.repeatPreset) e.repeatDays = 'Select a repeat frequency';
    else if (state.repeatUnit === 'week' && state.repeatDays.length === 0) e.repeatDays = 'Select at least one day';

    if (state.endMode === 'on_date') {
      if (!state.repeatEndDate.trim()) {
        e.repeatEndDate = 'End date is required';
      } else {
        const parsedEnd = parseDateStr(state.repeatEndDate);
        const parsedStart = parseDateStr(state.date);
        if (!parsedEnd) {
          e.repeatEndDate = 'Enter a valid date (MM/DD/YYYY)';
        } else if (parsedStart && parsedEnd <= parsedStart) {
          e.repeatEndDate = 'End date must be after start date';
        }
      }
    } else {
      const count = parseInt(state.repeatOccurrences, 10);
      if (!count || count <= 0) e.repeatEndDate = 'Enter a valid number of occurrences';
    }

    // Check generated dates
    if (!e.repeatDays && !e.repeatEndDate && state.recurringDates.length === 0) {
      e.recurring = 'No matching dates for this configuration';
    }
  }

  return e;
}
