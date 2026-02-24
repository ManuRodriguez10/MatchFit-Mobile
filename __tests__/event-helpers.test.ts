import {
  parseDateStr,
  toISODate,
  formatDateForInput,
  maskDate,
  parseTime,
  generateRecurringDates,
  computePresetState,
  validateEventForm,
} from '../utils/event-helpers';

// ---------------------------------------------------------------------------
// parseDateStr
// ---------------------------------------------------------------------------
describe('parseDateStr', () => {
  it('parses valid MM/DD/YYYY', () => {
    const d = parseDateStr('03/15/2026')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2); // March = 2
    expect(d.getDate()).toBe(15);
  });

  it('returns null for invalid format', () => {
    expect(parseDateStr('2026-03-15')).toBeNull();
    expect(parseDateStr('3/15/2026')).toBeNull();
    expect(parseDateStr('')).toBeNull();
  });

  it('returns null for impossible dates', () => {
    expect(parseDateStr('02/30/2026')).toBeNull();
    expect(parseDateStr('13/01/2026')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// toISODate / formatDateForInput
// ---------------------------------------------------------------------------
describe('toISODate', () => {
  it('formats date as YYYY-MM-DD', () => {
    expect(toISODate(new Date(2026, 2, 15))).toBe('2026-03-15');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('formatDateForInput', () => {
  it('formats date as MM/DD/YYYY', () => {
    expect(formatDateForInput(new Date(2026, 2, 15))).toBe('03/15/2026');
  });
});

// ---------------------------------------------------------------------------
// maskDate
// ---------------------------------------------------------------------------
describe('maskDate', () => {
  it('inserts slashes at correct positions', () => {
    expect(maskDate('03152026')).toBe('03/15/2026');
  });

  it('handles partial input', () => {
    expect(maskDate('03')).toBe('03');
    expect(maskDate('031')).toBe('03/1');
    expect(maskDate('0315')).toBe('03/15');
  });

  it('strips non-digits', () => {
    expect(maskDate('03/15/2026')).toBe('03/15/2026');
  });
});

// ---------------------------------------------------------------------------
// parseTime
// ---------------------------------------------------------------------------
describe('parseTime', () => {
  it('parses 12-hour time', () => {
    const d = parseTime('7:30 PM')!;
    expect(d.getHours()).toBe(19);
    expect(d.getMinutes()).toBe(30);
  });

  it('parses 12:00 AM as midnight', () => {
    const d = parseTime('12:00 AM')!;
    expect(d.getHours()).toBe(0);
  });

  it('parses 12:00 PM as noon', () => {
    const d = parseTime('12:00 PM')!;
    expect(d.getHours()).toBe(12);
  });

  it('parses 24-hour time', () => {
    const d = parseTime('19:30')!;
    expect(d.getHours()).toBe(19);
    expect(d.getMinutes()).toBe(30);
  });

  it('returns null for invalid time', () => {
    expect(parseTime('25:00')).toBeNull();
    expect(parseTime('abc')).toBeNull();
    expect(parseTime('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computePresetState (mirrors applyPreset logic)
// ---------------------------------------------------------------------------
describe('computePresetState', () => {
  // Test #4: "Every day" sets daily interval, all 7 days
  it('daily — sets interval 1, unit day, all 7 days', () => {
    const result = computePresetState('daily', 3)!;
    expect(result.interval).toBe(1);
    expect(result.unit).toBe('day');
    expect(result.days).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  // Test #5: "Every weekday" sets Mon-Fri
  it('weekdays — sets interval 1, unit day, Mon-Fri', () => {
    const result = computePresetState('weekdays', 3)!;
    expect(result.interval).toBe(1);
    expect(result.unit).toBe('day');
    expect(result.days).toEqual([1, 2, 3, 4, 5]);
  });

  // Test #6: "Every week on [Day]" uses the date's day of week
  it('weekly — uses selectedDayOfWeek from date field', () => {
    // Wednesday = 3
    const result = computePresetState('weekly', 3)!;
    expect(result.interval).toBe(1);
    expect(result.unit).toBe('week');
    expect(result.days).toEqual([3]);
  });

  it('weekly — updates when date changes (Monday = 1)', () => {
    const result = computePresetState('weekly', 1)!;
    expect(result.days).toEqual([1]);
  });

  // Test #7: biweekly same day-name behavior
  it('biweekly — interval 2, uses selectedDayOfWeek', () => {
    const result = computePresetState('biweekly', 5)!;
    expect(result.interval).toBe(2);
    expect(result.unit).toBe('week');
    expect(result.days).toEqual([5]); // Friday
  });

  // Test #9: no date entered — weekly/biweekly have empty days
  it('weekly with no date (null) — empty days', () => {
    const result = computePresetState('weekly', null)!;
    expect(result.days).toEqual([]);
  });

  it('biweekly with no date (null) — empty days', () => {
    const result = computePresetState('biweekly', null)!;
    expect(result.days).toEqual([]);
  });

  // Test #8: custom returns null (opens modal)
  it('custom — returns null', () => {
    expect(computePresetState('custom', 3)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// generateRecurringDates
// ---------------------------------------------------------------------------
describe('generateRecurringDates', () => {
  // Test #11: valid end date — returns correct count
  it('daily with end date — generates correct number of dates', () => {
    const dates = generateRecurringDates({
      startISO: '2026-03-01',
      interval: 1,
      unit: 'day',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      endMode: 'on_date',
      endISO: '2026-03-07',
    });
    expect(dates).toEqual([
      '2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04',
      '2026-03-05', '2026-03-06', '2026-03-07',
    ]);
    expect(dates.length).toBe(7);
  });

  // Test #13: "After X times" — enter 10 shows 10 events
  it('daily after 10 occurrences — returns exactly 10 dates', () => {
    const dates = generateRecurringDates({
      startISO: '2026-03-01',
      interval: 1,
      unit: 'day',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      endMode: 'after_count',
      occurrences: 10,
    });
    expect(dates.length).toBe(10);
    expect(dates[0]).toBe('2026-03-01');
    expect(dates[9]).toBe('2026-03-10');
  });

  // Test #21: daily + after 200 — caps at 200
  it('daily after 200 occurrences — caps at 200', () => {
    const dates = generateRecurringDates({
      startISO: '2026-01-01',
      interval: 1,
      unit: 'day',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      endMode: 'after_count',
      occurrences: 300,
    });
    expect(dates.length).toBe(200);
  });

  // Test #24: end date same as start date — 1 event
  it('daily with end date = start date — creates 1 event', () => {
    const dates = generateRecurringDates({
      startISO: '2026-03-15',
      interval: 1,
      unit: 'day',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      endMode: 'on_date',
      endISO: '2026-03-15',
    });
    expect(dates.length).toBe(1);
    expect(dates[0]).toBe('2026-03-15');
  });

  // Weekly: generates correct dates for a specific day
  it('weekly on Wednesday — only Wednesdays', () => {
    // 2026-03-04 is a Wednesday
    const dates = generateRecurringDates({
      startISO: '2026-03-04',
      interval: 1,
      unit: 'week',
      daysOfWeek: [3], // Wednesday
      endMode: 'on_date',
      endISO: '2026-04-01',
    });
    expect(dates.length).toBe(5); // Mar 4, 11, 18, 25, Apr 1
    dates.forEach((d) => {
      expect(new Date(`${d}T00:00:00`).getDay()).toBe(3);
    });
  });

  // Biweekly
  it('biweekly on Wednesday — every 2 weeks', () => {
    const dates = generateRecurringDates({
      startISO: '2026-03-04',
      interval: 2,
      unit: 'week',
      daysOfWeek: [3],
      endMode: 'on_date',
      endISO: '2026-05-31',
    });
    // Mar 4, Mar 18, Apr 1, Apr 15, Apr 29, May 13, May 27
    expect(dates.length).toBe(7);
    // Verify 2-week gap by comparing date parts (avoids DST issues)
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(`${dates[i - 1]}T12:00:00`);
      const curr = new Date(`${dates[i]}T12:00:00`);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(14);
    }
  });

  // Test #23: biweekly far out — caps at 200
  it('biweekly with end date very far out — caps at 200', () => {
    const dates = generateRecurringDates({
      startISO: '2026-01-01',
      interval: 2,
      unit: 'week',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // all days = lots of dates
      endMode: 'on_date',
      endISO: '2030-12-31',
    });
    expect(dates.length).toBe(200);
  });

  // Test #22: weekly with no matching day in selected days
  it('weekly with empty daysOfWeek — returns empty', () => {
    const dates = generateRecurringDates({
      startISO: '2026-03-04',
      interval: 1,
      unit: 'week',
      daysOfWeek: [],
      endMode: 'on_date',
      endISO: '2026-04-01',
    });
    expect(dates.length).toBe(0);
  });

  // Weekdays only (Mon-Fri)
  it('daily weekdays only — skips Sat and Sun', () => {
    // 2026-03-02 is a Monday
    const dates = generateRecurringDates({
      startISO: '2026-03-02',
      interval: 1,
      unit: 'day',
      daysOfWeek: [1, 2, 3, 4, 5],
      endMode: 'on_date',
      endISO: '2026-03-08', // Sunday
    });
    expect(dates.length).toBe(5); // Mon-Fri
    dates.forEach((d) => {
      const dow = new Date(`${d}T00:00:00`).getDay();
      expect(dow).toBeGreaterThanOrEqual(1);
      expect(dow).toBeLessThanOrEqual(5);
    });
  });

  // After count with weekly
  it('weekly after 5 occurrences — returns exactly 5', () => {
    const dates = generateRecurringDates({
      startISO: '2026-03-04',
      interval: 1,
      unit: 'week',
      daysOfWeek: [3],
      endMode: 'after_count',
      occurrences: 5,
    });
    expect(dates.length).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// validateEventForm
// ---------------------------------------------------------------------------
describe('validateEventForm', () => {
  // Helper to build a valid base state
  function validBase() {
    return {
      eventType: 'practice' as string,
      gameVenue: null as string | null,
      title: 'Morning Practice',
      opponent: '',
      date: formatDateForInput(futureDate(7)),
      time: '7:30 PM',
      repeatEnabled: false,
      repeatPreset: null as any,
      repeatUnit: 'week' as const,
      repeatDays: [] as number[],
      endMode: 'on_date' as const,
      repeatEndDate: '',
      repeatOccurrences: '',
      recurringDates: [] as string[],
    };
  }

  function futureDate(daysAhead: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d;
  }

  it('valid single event — no errors', () => {
    const errors = validateEventForm(validBase());
    expect(Object.keys(errors).length).toBe(0);
  });

  it('missing event type', () => {
    const errors = validateEventForm({ ...validBase(), eventType: null });
    expect(errors.eventType).toBeDefined();
  });

  it('game without venue', () => {
    const errors = validateEventForm({ ...validBase(), eventType: 'game', gameVenue: null, opponent: 'Team B' });
    expect(errors.gameVenue).toBeDefined();
  });

  it('game without opponent', () => {
    const errors = validateEventForm({ ...validBase(), eventType: 'game', gameVenue: 'home', opponent: '' });
    expect(errors.opponent).toBeDefined();
  });

  it('missing title', () => {
    const errors = validateEventForm({ ...validBase(), title: '' });
    expect(errors.title).toBeDefined();
  });

  it('missing date', () => {
    const errors = validateEventForm({ ...validBase(), date: '' });
    expect(errors.date).toBeDefined();
  });

  it('invalid date format', () => {
    const errors = validateEventForm({ ...validBase(), date: '2026-03-15' });
    expect(errors.date).toBeDefined();
  });

  it('past date', () => {
    const errors = validateEventForm({ ...validBase(), date: '01/01/2020' });
    expect(errors.date).toBe('Date must be today or in the future');
  });

  it('missing time', () => {
    const errors = validateEventForm({ ...validBase(), time: '' });
    expect(errors.time).toBeDefined();
  });

  it('invalid time', () => {
    const errors = validateEventForm({ ...validBase(), time: 'noon' });
    expect(errors.time).toBeDefined();
  });

  // Test #25: repeat ON but no preset
  it('repeat enabled, no preset — "Select a repeat frequency"', () => {
    const errors = validateEventForm({
      ...validBase(),
      repeatEnabled: true,
      repeatPreset: null,
      repeatEndDate: formatDateForInput(futureDate(30)),
      recurringDates: [],
    });
    expect(errors.repeatDays).toBe('Select a repeat frequency');
  });

  // Test #26: weekly custom, no days
  it('repeat enabled, weekly with no days — "Select at least one day"', () => {
    const errors = validateEventForm({
      ...validBase(),
      repeatEnabled: true,
      repeatPreset: 'custom',
      repeatUnit: 'week',
      repeatDays: [],
      repeatEndDate: formatDateForInput(futureDate(30)),
      recurringDates: [],
    });
    expect(errors.repeatDays).toBe('Select at least one day');
  });

  // Test #10: end date before start date
  it('repeat end date before start date — error', () => {
    const startDate = futureDate(14);
    const endDate = futureDate(7);
    const errors = validateEventForm({
      ...validBase(),
      date: formatDateForInput(startDate),
      repeatEnabled: true,
      repeatPreset: 'daily',
      repeatUnit: 'day',
      repeatDays: [0, 1, 2, 3, 4, 5, 6],
      endMode: 'on_date',
      repeatEndDate: formatDateForInput(endDate),
      recurringDates: [],
    });
    expect(errors.repeatEndDate).toBe('End date must be after start date');
  });

  // Test #12: after_count with 0 or empty
  it('after_count with empty occurrences — error', () => {
    const errors = validateEventForm({
      ...validBase(),
      repeatEnabled: true,
      repeatPreset: 'daily',
      repeatUnit: 'day',
      repeatDays: [0, 1, 2, 3, 4, 5, 6],
      endMode: 'after_count',
      repeatOccurrences: '',
      recurringDates: [],
    });
    expect(errors.repeatEndDate).toBe('Enter a valid number of occurrences');
  });

  it('after_count with 0 — error', () => {
    const errors = validateEventForm({
      ...validBase(),
      repeatEnabled: true,
      repeatPreset: 'daily',
      repeatUnit: 'day',
      repeatDays: [0, 1, 2, 3, 4, 5, 6],
      endMode: 'after_count',
      repeatOccurrences: '0',
      recurringDates: [],
    });
    expect(errors.repeatEndDate).toBe('Enter a valid number of occurrences');
  });

  // repeat end date missing (on_date mode)
  it('on_date mode with empty end date — error', () => {
    const errors = validateEventForm({
      ...validBase(),
      repeatEnabled: true,
      repeatPreset: 'daily',
      repeatUnit: 'day',
      repeatDays: [0, 1, 2, 3, 4, 5, 6],
      endMode: 'on_date',
      repeatEndDate: '',
      recurringDates: [],
    });
    expect(errors.repeatEndDate).toBe('End date is required');
  });

  // Valid repeat config — no errors
  it('valid repeat config with on_date — no repeat errors', () => {
    const startDate = futureDate(7);
    const endDate = futureDate(30);
    const dates = generateRecurringDates({
      startISO: toISODate(startDate),
      interval: 1,
      unit: 'day',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      endMode: 'on_date',
      endISO: toISODate(endDate),
    });
    const errors = validateEventForm({
      ...validBase(),
      date: formatDateForInput(startDate),
      repeatEnabled: true,
      repeatPreset: 'daily',
      repeatUnit: 'day',
      repeatDays: [0, 1, 2, 3, 4, 5, 6],
      endMode: 'on_date',
      repeatEndDate: formatDateForInput(endDate),
      recurringDates: dates,
    });
    expect(errors.repeatDays).toBeUndefined();
    expect(errors.repeatEndDate).toBeUndefined();
    expect(errors.recurring).toBeUndefined();
  });

  it('valid repeat config with after_count — no repeat errors', () => {
    const startDate = futureDate(7);
    const dates = generateRecurringDates({
      startISO: toISODate(startDate),
      interval: 1,
      unit: 'day',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      endMode: 'after_count',
      occurrences: 10,
    });
    const errors = validateEventForm({
      ...validBase(),
      date: formatDateForInput(startDate),
      repeatEnabled: true,
      repeatPreset: 'daily',
      repeatUnit: 'day',
      repeatDays: [0, 1, 2, 3, 4, 5, 6],
      endMode: 'after_count',
      repeatOccurrences: '10',
      recurringDates: dates,
    });
    expect(errors.repeatDays).toBeUndefined();
    expect(errors.repeatEndDate).toBeUndefined();
    expect(errors.recurring).toBeUndefined();
  });

  // No matching dates for config
  it('valid config but no generated dates — recurring error', () => {
    const errors = validateEventForm({
      ...validBase(),
      repeatEnabled: true,
      repeatPreset: 'daily',
      repeatUnit: 'day',
      repeatDays: [0, 1, 2, 3, 4, 5, 6],
      endMode: 'on_date',
      repeatEndDate: formatDateForInput(futureDate(30)),
      recurringDates: [], // somehow no dates generated
    });
    expect(errors.recurring).toBe('No matching dates for this configuration');
  });

  // Test #28: single event (repeat OFF) — no repeat errors
  it('repeat disabled — no repeat validation', () => {
    const errors = validateEventForm(validBase());
    expect(errors.repeatDays).toBeUndefined();
    expect(errors.repeatEndDate).toBeUndefined();
    expect(errors.recurring).toBeUndefined();
  });
});
