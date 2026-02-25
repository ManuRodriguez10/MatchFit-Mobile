import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useGlobalSearchParams, router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Gradients } from '@/constants/colors';
import { UI } from '@/constants/ui';
import Card from '@/components/ui/Card';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

interface EventItem {
  id: string;
  event_type: 'game' | 'practice' | 'tournament' | 'meeting';
  title: string | null;
  opponent: string | null;
  location: string | null;
  date: string;
  kickoff_time: string | null;
  recurrence_group_id: string | null;
}

const EVENT_COLORS: Record<EventItem['event_type'], string> = {
  game: '#EF4444',
  practice: '#3B82F6',
  tournament: '#F59E0B',
  meeting: '#8B5CF6',
};

type TabKey = 'calendar' | 'week' | 'past';
const TAB_KEYS: TabKey[] = ['calendar', 'week', 'past'];

const TAB_LABELS: Record<TabKey, string> = {
  calendar: 'Calendar',
  week: 'This Week',
  past: 'Past',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekRange(d: Date): { start: Date; end: Date } {
  const day = d.getDay(); // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMon);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface DayCell {
  date: string; // ISO
  dayOfMonth: number;
  isCurrentMonth: boolean;
}

function getMonthDays(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0=Sun
  const offsetToMon = startDay === 0 ? -6 : 1 - startDay;
  const gridStart = new Date(year, month, 1 + offsetToMon);

  const cells: DayCell[] = [];
  const weeks = 6; // always render 6 rows for consistent height
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push({
      date: toISO(d),
      dayOfMonth: d.getDate(),
      isCurrentMonth: d.getMonth() === month && d.getFullYear() === year,
    });
  }
  return cells;
}

function eventTitle(event: EventItem): string {
  if (event.title?.trim()) return event.title.trim();
  if (event.event_type === 'game' && event.opponent) return `vs ${event.opponent}`;
  return event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TeamEventsScreen() {
  const { teamId } = useGlobalSearchParams<{ teamId: string }>();
  console.log('EVENTS teamId:', teamId);
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('calendar');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);
  const [selectedWeekDay, setSelectedWeekDay] = useState<string | null>(null);

  // ── Fetch all events (past + future) — re-fetch on every focus ────────
  const loadEvents = useCallback(() => {
    if (!teamId) { setLoading(false); return; }
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, event_type, title, opponent, location, date, kickoff_time, recurrence_group_id')
          .eq('team_id', teamId)
          .order('date', { ascending: true });
        if (error) console.warn('Events fetch error:', error.message);
        setEvents((data as EventItem[]) ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [teamId]);

  useFocusEffect(loadEvents);

  // ── Derived data ──────────────────────────────────────────────────────
  const todayStr = useMemo(() => toISO(new Date()), []);
  const { start: weekStart, end: weekEnd } = useMemo(() => getWeekRange(new Date()), []);

  const thisWeekEvents = useMemo(() => {
    const ws = toISO(weekStart);
    const we = toISO(weekEnd);
    return events.filter((e) => e.date >= ws && e.date <= we);
  }, [events, weekStart, weekEnd]);

  const pastEvents = useMemo(
    () => events.filter((e) => e.date < todayStr).reverse(),
    [events, todayStr],
  );

  const counts: Record<TabKey, number> = useMemo(
    () => ({
      calendar: events.length,
      week: thisWeekEvents.length,
      past: pastEvents.length,
    }),
    [events.length, thisWeekEvents.length, pastEvents.length],
  );

  // Calendar-specific
  const monthDays = useMemo(
    () => getMonthDays(calendarMonth.year, calendarMonth.month),
    [calendarMonth],
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, EventItem[]> = {};
    for (const e of events) {
      (map[e.date] ??= []).push(e);
    }
    return map;
  }, [events]);

  const eventsOnSelectedDay = useMemo(
    () => (selectedCalendarDay ? eventsByDate[selectedCalendarDay] ?? [] : []),
    [selectedCalendarDay, eventsByDate],
  );
  const eventsOnSelectedWeekDay = useMemo(
    () => (selectedWeekDay ? eventsByDate[selectedWeekDay] ?? [] : []),
    [selectedWeekDay, eventsByDate],
  );

  // Week grid dates
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [weekStart]);

  const monthLabel = new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric' },
  );

  // Match the floating team tab bar dimensions/offset so content always clears it.
  const floatingTabBarHeight = 58;
  const floatingTabBarOuterPadding =
    Platform.OS === 'ios' ? Math.max(insets.bottom + 2, 12) : 10;
  const navbarSafeGap = floatingTabBarHeight + floatingTabBarOuterPadding + 20;
  const contentBottomPadding = navbarSafeGap + 24;

  // Cap the nested week list so it scrolls inside the panel and stays above the floating navbar.
  const weekListMaxHeight = Math.max(
    240,
    Math.min(560, Math.round(viewportHeight - navbarSafeGap - 360)),
  );

  // Default selected day to today so Day View is immediately visible under calendar
  useEffect(() => {
    setSelectedCalendarDay((prev) => prev ?? todayStr);
  }, [todayStr]);

  // ── Navigators ────────────────────────────────────────────────────────
  const prevMonth = () =>
    setCalendarMonth((prev) => {
      const m = prev.month === 0 ? 11 : prev.month - 1;
      const y = prev.month === 0 ? prev.year - 1 : prev.year;
      return { year: y, month: m };
    });

  const nextMonth = () =>
    setCalendarMonth((prev) => {
      const m = prev.month === 11 ? 0 : prev.month + 1;
      const y = prev.month === 11 ? prev.year + 1 : prev.year;
      return { year: y, month: m };
    });

  // ── Render helpers ────────────────────────────────────────────────────

  const renderEventCard = (event: EventItem, options?: { showBorder?: boolean }) => (
    <TouchableOpacity
      key={event.id}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/team/event-detail',
          params: { teamId, eventId: event.id },
        })
      }
    >
      <Card
        muted
        style={[
          styles.eventCard,
          options?.showBorder && { borderLeftWidth: 4, borderLeftColor: EVENT_COLORS[event.event_type] },
        ]}
      >
        <View style={styles.eventTopRow}>
          <Text style={styles.eventTitle}>{eventTitle(event)}</Text>
          <View style={[styles.typePill, { backgroundColor: EVENT_COLORS[event.event_type] + '18' }]}>
            <Text style={[styles.typePillText, { color: EVENT_COLORS[event.event_type] }]}>
              {event.event_type}
            </Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={12} color="#64748B" />
          <Text style={styles.metaText}>
            {formatDisplayDate(event.date)}
            {event.kickoff_time ? `, ${event.kickoff_time}` : ''}
          </Text>
        </View>
        {event.location ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color="#64748B" />
            <Text style={styles.metaText}>{event.location}</Text>
          </View>
        ) : null}
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = (message: string) => (
    <Card muted style={styles.emptyWrap}>
      <Ionicons name="calendar-clear-outline" size={22} color="#94A3B8" />
      <Text style={styles.emptyText}>{message}</Text>
    </Card>
  );

  const renderModalEmptyState = (message: string) => (
    <View style={styles.modalEmptyPanel}>
      <Ionicons name="calendar-clear-outline" size={28} color="#94A3B8" />
      <Text style={styles.modalEmptyText}>{message}</Text>
    </View>
  );

  const openEventEditor = (event: EventItem) => {
    setSelectedWeekDay(null);
    router.push({
      pathname: '/team/edit-event',
      params: {
        teamId,
        eventId: event.id,
        ...(event.recurrence_group_id ? { recurrenceGroupId: event.recurrence_group_id } : {}),
      },
    });
  };

  const deleteEventFromModal = (event: EventItem) => {
    Alert.alert(
      'Delete Event',
      `Delete "${eventTitle(event)}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('events').delete().eq('id', event.id);
            if (error) {
              Alert.alert('Delete failed', error.message);
              return;
            }
            setEvents((prev) => prev.filter((e) => e.id !== event.id));
          },
        },
      ],
    );
  };

  const renderModalEventCard = (event: EventItem) => (
    <Card muted key={event.id} style={styles.modalEventCard}>
      <View style={styles.modalEventTopRow}>
        <View style={styles.modalEventTitleWrap}>
          <Text style={styles.eventTitle}>{eventTitle(event)}</Text>
          <View style={[styles.typePill, { backgroundColor: EVENT_COLORS[event.event_type] + '18' }]}>
            <Text style={[styles.typePillText, { color: EVENT_COLORS[event.event_type] }]}>
              {event.event_type}
            </Text>
          </View>
        </View>
        <View style={styles.modalEventActions}>
          <TouchableOpacity
            style={styles.modalIconBtn}
            activeOpacity={0.7}
            onPress={() => openEventEditor(event)}
          >
            <Ionicons name="create-outline" size={16} color="#334155" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalIconBtn}
            activeOpacity={0.7}
            onPress={() => deleteEventFromModal(event)}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.modalEventMetaBlock}>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={12} color="#64748B" />
          <Text style={styles.metaText}>
            {formatDisplayDate(event.date)}
            {event.kickoff_time ? `, ${event.kickoff_time}` : ''}
          </Text>
        </View>
        {event.location ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color="#64748B" />
            <Text style={styles.metaText}>{event.location}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );

  // ── Calendar tab ──────────────────────────────────────────────────────
  const renderCalendar = () => (
    <Card padded={false} style={styles.panel}>
      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} activeOpacity={0.7} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={nextMonth} activeOpacity={0.7} hitSlop={12}>
          <Ionicons name="chevron-forward" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* Weekday header */}
      <View style={styles.weekdayRow}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <Text key={d} style={styles.weekdayText}>
            {d}
          </Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.dayGrid}>
        {monthDays.map((cell, i) => {
          const isToday = cell.date === todayStr;
          const dayEvents = eventsByDate[cell.date];
          const isSelected = cell.date === selectedCalendarDay;
          const dotTypes = dayEvents
            ? ([...new Set(dayEvents.map((e) => e.event_type))] as EventItem['event_type'][]).slice(0, 3)
            : [];

          return (
            <TouchableOpacity
              key={i}
              style={styles.dayCell}
              activeOpacity={0.6}
              onPress={() => setSelectedCalendarDay(cell.date)}
            >
              <View style={[styles.dayNumberWrap, isToday && styles.dayToday, isSelected && !isToday && styles.daySelected]}>
                <Text
                  style={[
                    styles.dayNumber,
                    !cell.isCurrentMonth && styles.dayNumberFaded,
                    isToday && styles.dayNumberToday,
                  ]}
                >
                  {cell.dayOfMonth}
                </Text>
              </View>
              {dotTypes.length > 0 && (
                <View style={styles.dotRow}>
                  {dotTypes.map((t) => (
                    <View key={t} style={[styles.dot, { backgroundColor: EVENT_COLORS[t] }]} />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.panelBottomSpacer} />
    </Card>
  );

  // ── Day view (separate grid below calendar) ───────────────────────────
  const renderDayView = () => (
    <Card padded={false} style={styles.panel}>
      <View style={styles.dayViewHeader}>
        <View style={styles.dayViewHeaderTextWrap}>
          <Text style={styles.panelTitle}>
            {selectedCalendarDay ? formatDisplayDate(selectedCalendarDay) : formatDisplayDate(todayStr)}
          </Text>
          <Text style={styles.dayViewCountText}>
            {eventsOnSelectedDay.length} event{eventsOnSelectedDay.length === 1 ? '' : 's'} scheduled
          </Text>
        </View>
        <TouchableOpacity
          style={styles.dayViewAddBtn}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: '/team/create-event',
              params: { teamId },
            })
          }
        >
          <Ionicons name="add" size={14} color="#fff" />
          <Text style={styles.dayViewAddBtnText}>Add Event</Text>
        </TouchableOpacity>
      </View>
      {eventsOnSelectedDay.length === 0
        ? renderEmptyState('No events on this day.')
        : eventsOnSelectedDay.map((e) => renderModalEventCard(e))}
      <View style={styles.panelBottomSpacer} />
    </Card>
  );

  // ── This Week tab ─────────────────────────────────────────────────────
  const renderWeek = () => {
    const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (
      <Card padded={false} style={styles.panel}>
        <Text style={styles.panelTitle}>
          {formatShortDate(weekStart)} – {formatShortDate(weekEnd)}
        </Text>
        <Text style={styles.weekSubtitle}>This week's schedule</Text>

        {/* Weekly list (top-to-bottom) */}
        <ScrollView
          style={[styles.weekListScroller, { maxHeight: weekListMaxHeight }]}
          contentContainerStyle={styles.weekGrid}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {weekDates.map((d, i) => {
            const iso = toISO(d);
            const isToday = iso === todayStr;
            const dayEvts = eventsByDate[iso] ?? [];

            return (
              <TouchableOpacity
                key={i}
                style={[styles.weekRow, isToday && styles.weekRowToday]}
                activeOpacity={0.78}
                onPress={() => setSelectedWeekDay(iso)}
              >
                <View style={styles.weekRowDateWrap}>
                  <Text style={[styles.weekColDay, isToday && styles.weekColDayToday]}>
                    {DAY_ABBR[i]}
                  </Text>
                  <Text style={[styles.weekColDate, isToday && styles.weekColDateToday]}>
                    {d.getDate()}
                  </Text>
                </View>

                <View style={styles.weekColEvents}>
                  {dayEvts.length === 0 ? (
                    <Text style={styles.weekEmptyText}>No events</Text>
                  ) : (
                    dayEvts.map((e) => (
                      <View
                        key={e.id}
                        style={[styles.weekChip, { backgroundColor: EVENT_COLORS[e.event_type] + '20' }]}
                      >
                        <View style={[styles.weekChipDot, { backgroundColor: EVENT_COLORS[e.event_type] }]} />
                        <Text style={[styles.weekChipText, { color: EVENT_COLORS[e.event_type] }]} numberOfLines={1}>
                          {eventTitle(e)}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Legend */}
        <View style={styles.legendRow}>
          {(['game', 'practice', 'tournament', 'meeting'] as const).map((t) => (
            <View key={t} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: EVENT_COLORS[t] }]} />
              <Text style={styles.legendText}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.panelBottomSpacer} />
      </Card>
    );
  };

  // ── Past tab ──────────────────────────────────────────────────────────
  const renderPast = () => (
    <Card padded={false} style={styles.panel}>
      <Text style={styles.panelTitle}>Past Events</Text>
      {pastEvents.length === 0
        ? renderEmptyState('No past events yet.')
        : pastEvents.map((e) => renderEventCard(e, { showBorder: true }))}
      <View style={styles.panelBottomSpacer} />
    </Card>
  );

  // ── Main render ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <LinearGradient colors={Gradients.primary as unknown as string[]} style={styles.gradient}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.stateText}>Loading...</Text>
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Team Calendar</Text>
            <Text style={styles.subtitle}>Schedule and upcoming sessions</Text>
          </View>
          <TouchableOpacity style={styles.createBtn} activeOpacity={0.7} onPress={() => router.push({ pathname: '/team/create-event', params: { teamId } })}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {TAB_KEYS.map((key) => {
            const isActive = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
                activeOpacity={0.7}
                onPress={() => setActiveTab(key)}
              >
                <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>
                  {TAB_LABELS[key]} ({counts[key]})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab content */}
        {activeTab === 'calendar' && (
          <>
            {renderCalendar()}
            {renderDayView()}
          </>
        )}
        {activeTab === 'week' && renderWeek()}
        {activeTab === 'past' && renderPast()}
      </ScrollView>

      <Modal
        visible={!!selectedWeekDay}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedWeekDay(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedWeekDay(null)}>
          <Pressable style={styles.modalCardWrap} onPress={() => {}}>
            <Card padded={false} style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTextWrap}>
                  <Text style={styles.modalTitle}>
                    {selectedWeekDay ? formatDisplayDate(selectedWeekDay) : 'Selected Day'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {eventsOnSelectedWeekDay.length} event{eventsOnSelectedWeekDay.length === 1 ? '' : 's'} scheduled
                  </Text>
                </View>
                <View style={styles.modalHeaderActions}>
                  <TouchableOpacity
                    style={styles.modalAddBtn}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push({
                        pathname: '/team/create-event',
                        params: { teamId },
                      })
                    }
                  >
                    <Ionicons name="add" size={14} color="#fff" />
                    <Text style={styles.modalAddBtnText}>Add Event</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSelectedWeekDay(null)} hitSlop={8}>
                    <Ionicons name="close" size={20} color="#334155" />
                  </TouchableOpacity>
                </View>
              </View>

              {eventsOnSelectedWeekDay.length === 0 ? (
                <View style={styles.modalEmptyContent}>
                  {renderModalEmptyState('No events on this day.')}
                </View>
              ) : (
                <ScrollView
                  style={styles.modalContent}
                  contentContainerStyle={styles.modalContentInner}
                  showsVerticalScrollIndicator={false}
                >
                  {eventsOnSelectedWeekDay.map((e) => renderModalEventCard(e))}
                </ScrollView>
              )}
            </Card>
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
    paddingTop: 88,
    paddingHorizontal: 20,
    gap: 16,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stateText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: UI.typography.medium,
  },

  // ── Header ────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: UI.typography.medium,
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
  },

  // ── Tab bar ───────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: UI.radius.pill,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  tabPillActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  tabPillText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
  },
  tabPillTextActive: {
    color: Colors.primary,
  },

  // ── Panel (white card) ────────────────────────────────────────────────
  panel: {
    borderRadius: 24,
    padding: 14,
    gap: 10,
  },
  panelBottomSpacer: {
    height: 6,
  },
  panelTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
  },

  // ── Event card ────────────────────────────────────────────────────────
  eventCard: {
    borderRadius: UI.radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 6,
    shadowOpacity: 0,
    elevation: 0,
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eventTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
    flex: 1,
  },
  typePill: {
    borderRadius: UI.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
    textTransform: 'capitalize',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: UI.typography.medium,
  },
  emptyWrap: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    shadowOpacity: 0,
    elevation: 0,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: UI.typography.medium,
  },

  // ── Calendar ──────────────────────────────────────────────────────────
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  monthLabel: {
    color: Colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%' as any,
    alignItems: 'center',
    paddingVertical: 5,
    minHeight: 48,
  },
  dayNumberWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    backgroundColor: Colors.primary,
  },
  daySelected: {
    backgroundColor: Colors.primarySoft,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: UI.typography.medium,
  },
  dayNumberFaded: {
    color: '#CBD5E1',
  },
  dayNumberToday: {
    color: '#fff',
    fontWeight: '800',
    fontFamily: UI.typography.bold,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dayViewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  dayViewHeaderTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  dayViewCountText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: UI.typography.medium,
    marginTop: 6,
  },
  dayViewAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 2,
  },
  dayViewAddBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
  },

  // ── This Week ─────────────────────────────────────────────────────────
  weekSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: UI.typography.medium,
    marginTop: -2,
  },
  weekGrid: {
    gap: 8,
  },
  weekListScroller: {
    minHeight: 220,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
    minHeight: 72,
  },
  weekRowToday: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: '#EFF6FF',
  },
  weekRowDateWrap: {
    width: 46,
    alignItems: 'center',
    gap: 0,
  },
  weekColDay: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    fontFamily: UI.typography.bold,
  },
  weekColDayToday: {
    color: Colors.primary,
  },
  weekColDate: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: UI.typography.bold,
  },
  weekColDateToday: {
    color: Colors.primary,
  },
  weekColEvents: {
    flex: 1,
    gap: 4,
    marginTop: 0,
  },
  weekEmptyText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: UI.typography.medium,
  },
  weekChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: UI.radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  weekChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weekChipText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
    flex: 1,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: UI.typography.medium,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCardWrap: {
    width: '100%',
    maxWidth: 520,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '62%',
    minHeight: 220,
    borderRadius: 24,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  modalHeaderTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: UI.typography.bold,
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: UI.typography.medium,
    marginTop: 2,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  modalAddBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: UI.typography.bold,
  },
  modalContent: {
    flexGrow: 0,
  },
  modalEmptyContent: {
    minHeight: 150,
    justifyContent: 'center',
  },
  modalEmptyPanel: {
    minHeight: 120,
    borderRadius: 18,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  modalEmptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: UI.typography.medium,
    textAlign: 'center',
  },
  modalContentInner: {
    gap: 10,
  },
  modalEventCard: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 0,
  },
  modalEventTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  modalEventTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  modalEventMetaBlock: {
    marginTop: 10,
    gap: 6,
  },
  modalEventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  modalIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
});
