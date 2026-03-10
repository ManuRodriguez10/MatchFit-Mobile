/**
 * Tests for input validation logic used across the app.
 */

// Replicate validation functions from the codebase

function validateTeamName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Team name is required';
  if (trimmed.length < 2) return 'Team name must be at least 2 characters';
  if (trimmed.length > 50) return 'Team name must be 50 characters or less';
  return null;
}

function validateDOB(month: string, day: string, year: string): string | null {
  if (!month && !day && !year) return null; // optional field
  if (!month || !day || !year) return 'Complete date required (MM/DD/YYYY)';

  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);

  if (isNaN(m) || m < 1 || m > 12) return 'Invalid month';
  if (isNaN(d) || d < 1 || d > 31) return 'Invalid day';

  // Days in month validation
  const daysInMonth = new Date(y, m, 0).getDate();
  if (d > daysInMonth) return `Month ${m} only has ${daysInMonth} days`;

  const currentYear = new Date().getFullYear();
  if (isNaN(y) || y < 1940 || y > currentYear) return `Year must be between 1940 and ${currentYear}`;

  return null;
}

// ---------------------------------------------------------------------------
// validateTeamName
// ---------------------------------------------------------------------------
describe('validateTeamName', () => {
  it('rejects empty string', () => {
    expect(validateTeamName('')).toBe('Team name is required');
  });

  it('rejects whitespace-only', () => {
    expect(validateTeamName('   ')).toBe('Team name is required');
  });

  it('rejects single character', () => {
    expect(validateTeamName('A')).toBe('Team name must be at least 2 characters');
  });

  it('accepts 2-character name', () => {
    expect(validateTeamName('FC')).toBeNull();
  });

  it('accepts normal name', () => {
    expect(validateTeamName('Manchester United')).toBeNull();
  });

  it('rejects name over 50 characters', () => {
    expect(validateTeamName('A'.repeat(51))).toBe('Team name must be 50 characters or less');
  });

  it('accepts exactly 50 characters', () => {
    expect(validateTeamName('A'.repeat(50))).toBeNull();
  });

  it('trims whitespace before validating', () => {
    expect(validateTeamName('  FC  ')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateDOB
// ---------------------------------------------------------------------------
describe('validateDOB', () => {
  it('returns null when all fields empty (optional)', () => {
    expect(validateDOB('', '', '')).toBeNull();
  });

  it('requires complete date if any field filled', () => {
    expect(validateDOB('03', '', '')).toBe('Complete date required (MM/DD/YYYY)');
    expect(validateDOB('', '15', '')).toBe('Complete date required (MM/DD/YYYY)');
    expect(validateDOB('', '', '2000')).toBe('Complete date required (MM/DD/YYYY)');
  });

  it('rejects invalid month', () => {
    expect(validateDOB('13', '15', '2000')).toBe('Invalid month');
    expect(validateDOB('0', '15', '2000')).toBe('Invalid month');
  });

  it('rejects invalid day', () => {
    expect(validateDOB('03', '0', '2000')).toBe('Invalid day');
    expect(validateDOB('03', '32', '2000')).toBe('Invalid day');
  });

  it('rejects Feb 30', () => {
    const result = validateDOB('02', '30', '2000');
    expect(result).toMatch(/Month 2 only has/);
  });

  it('allows Feb 29 in leap year', () => {
    expect(validateDOB('02', '29', '2000')).toBeNull();
  });

  it('rejects Feb 29 in non-leap year', () => {
    const result = validateDOB('02', '29', '2001');
    expect(result).toMatch(/Month 2 only has 28 days/);
  });

  it('rejects year before 1940', () => {
    const result = validateDOB('03', '15', '1930');
    expect(result).toMatch(/Year must be between 1940/);
  });

  it('rejects future year', () => {
    const futureYear = (new Date().getFullYear() + 1).toString();
    const result = validateDOB('03', '15', futureYear);
    expect(result).toMatch(/Year must be between 1940/);
  });

  it('accepts valid DOB', () => {
    expect(validateDOB('03', '15', '2000')).toBeNull();
  });

  it('accepts current year', () => {
    const currentYear = new Date().getFullYear().toString();
    expect(validateDOB('01', '01', currentYear)).toBeNull();
  });
});
