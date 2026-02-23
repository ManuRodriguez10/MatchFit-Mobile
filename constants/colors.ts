// MatchFit brand colors + soft modern UI palette
export const Colors = {
  // Primary blues
  primary: '#3B82F6',
  primaryDark: '#1E3A8A',
  primaryLight: '#7CB7FF',
  primarySoft: '#E8F0FF',

  // Backgrounds / surfaces
  background: '#FCFBFF',
  backgroundLight: '#F4F2FA',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F4F8',
  surfaceTint: '#F0EDFA',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textOnDark: '#FFFFFF',

  // Accent pastels
  lavender: '#DCD1FF',
  lavenderStrong: '#B9A4FF',
  cream: '#F7E7B2',
  creamStrong: '#F1D77D',
  mint: '#CFEFE4',
  mintStrong: '#10B981',
  ink: '#16181D',

  // Status
  success: '#16A34A',
  error: '#EF4444',
  warning: '#F59E0B',

  // UI elements
  border: '#E5E7EB',
  borderSoft: '#ECECF3',
  borderFocus: '#3B82F6',

  // Overlays / shadows
  backdrop: 'rgba(0, 0, 0, 0.5)',
  cardShadow: 'rgba(15, 23, 42, 0.08)',
} as const;

// Gradients
export const Gradients = {
  primary: ['#4F8FF7', '#274FB5'],
  primaryLight: ['#7CB7FF', '#4F8FF7'],
  success: ['#20C997', '#0EA879'],
  backgroundSubtle: ['#F7F5FC', '#FFFFFF'],
  lavender: ['#DCCFFF', '#C5B2FF'],
  cream: ['#F8E8BE', '#F2DEA0'],
  darkButton: ['#1A1C22', '#111318'],
} as const;

export type ColorKey = keyof typeof Colors;
export type GradientKey = keyof typeof Gradients;
