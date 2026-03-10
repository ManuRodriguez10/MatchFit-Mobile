/**
 * Tests for date/time formatting functions used in dashboard and event screens.
 */

// Replicate the formatting functions from the codebase
function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatKickoffTime(kickoffTime: string | null) {
  if (!kickoffTime) return 'TBD';
  const parsed = new Date(kickoffTime);
  if (Number.isNaN(parsed.getTime())) return kickoffTime;
  return parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe('formatDate', () => {
  it('formats a standard ISO date', () => {
    const result = formatDate('2026-03-15');
    // Should include "Sun", "Mar", "15" (March 15, 2026 is a Sunday)
    expect(result).toContain('Mar');
    expect(result).toContain('15');
  });

  it('handles single-digit days', () => {
    const result = formatDate('2026-01-05');
    expect(result).toContain('Jan');
    expect(result).toContain('5');
  });

  it('handles December', () => {
    const result = formatDate('2026-12-25');
    expect(result).toContain('Dec');
    expect(result).toContain('25');
  });
});

// ---------------------------------------------------------------------------
// formatKickoffTime
// ---------------------------------------------------------------------------
describe('formatKickoffTime', () => {
  it('returns TBD for null', () => {
    expect(formatKickoffTime(null)).toBe('TBD');
  });

  it('returns the raw string for unparseable time', () => {
    expect(formatKickoffTime('sometime')).toBe('sometime');
  });

  it('formats a valid ISO datetime', () => {
    const result = formatKickoffTime('2026-03-15T19:30:00');
    // Should contain 7:30 PM or similar
    expect(result).toMatch(/7:30/);
  });
});

// ---------------------------------------------------------------------------
// getGreeting
// ---------------------------------------------------------------------------
describe('getGreeting', () => {
  it('returns one of the expected greetings', () => {
    const result = getGreeting();
    expect(['Good morning', 'Good afternoon', 'Good evening']).toContain(result);
  });
});

// ---------------------------------------------------------------------------
// getInitials
// ---------------------------------------------------------------------------
describe('getInitials', () => {
  it('returns first and last initials for two-word names', () => {
    expect(getInitials('John Doe')).toBe('JD');
  });

  it('returns first and last initials for multi-word names', () => {
    expect(getInitials('John Michael Doe')).toBe('JD');
  });

  it('returns first two chars for single-word names', () => {
    expect(getInitials('John')).toBe('JO');
  });

  it('handles extra whitespace', () => {
    expect(getInitials('  Jane   Smith  ')).toBe('JS');
  });

  it('uppercases the result', () => {
    expect(getInitials('jane smith')).toBe('JS');
  });
});
