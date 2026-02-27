// MatchFit brand colors — aligned with web design system
export const Colors = {
  // Primary blues (matched to web: #118ff3)
  primary: '#118FF3',
  primaryDark: '#0C5798',
  primaryLight: '#E7F3FE',
  primarySoft: '#E7F3FE',

  // Backgrounds / surfaces
  background: '#F9FAFB',       // gray-50
  backgroundGradientTop: '#D4EBFC', // pale blue page top
  surface: '#FFFFFF',
  surfaceMuted: '#F3F4F6',     // gray-100
  surfaceTint: '#E7F3FE',

  // Text
  textPrimary: '#111827',      // gray-900
  textSecondary: '#4B5563',    // gray-600
  textMuted: '#9CA3AF',        // gray-400
  textOnDark: '#FFFFFF',
  textOnPrimary: '#FFFFFF',

  // Accent colors (semantic — from web)
  blue: '#118FF3',
  blueSoft: '#E7F3FE',
  emerald: '#10B981',
  emeraldDark: '#059669',
  emeraldSoft: '#D1FAE5',
  purple: '#8B5CF6',
  purpleDark: '#7C3AED',
  purpleSoft: '#EDE9FE',
  amber: '#D97706',
  amberSoft: '#FEF3C7',
  red: '#EF4444',
  redSoft: '#FEE2E2',

  // Legacy accent aliases (for backward compat)
  lavender: '#EDE9FE',
  lavenderStrong: '#8B5CF6',
  cream: '#FEF3C7',
  creamStrong: '#D97706',
  mint: '#D1FAE5',
  mintStrong: '#10B981',
  ink: '#111827',

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#D97706',

  // UI elements
  border: '#E5E7EB',          // gray-200
  borderSoft: '#F3F4F6',      // gray-100
  borderFocus: '#118FF3',

  // Overlays / shadows
  backdrop: 'rgba(0, 0, 0, 0.5)',
  cardShadow: 'rgba(15, 23, 42, 0.08)',
} as const;

// Gradients
export const Gradients = {
  // Brand
  primary: ['#118FF3', '#0C5798'],
  primaryLight: ['#60B5FF', '#118FF3'],
  brand: ['#118FF3', '#0C5798'],  // alias for sidebar/header use

  // Stat cards (from web dashboard)
  statBlue: ['#3B82F6', '#2563EB'],
  statEmerald: ['#10B981', '#059669'],
  statPurple: ['#8B5CF6', '#7C3AED'],

  // Page background
  pageBackground: ['#D4EBFC', '#E7F3FE', '#FFFFFF'],

  // Surfaces
  backgroundSubtle: ['#F9FAFB', '#FFFFFF'],
  success: ['#10B981', '#059669'],

  // Buttons
  darkButton: ['#1A1C22', '#111318'],
} as const;

export type ColorKey = keyof typeof Colors;
export type GradientKey = keyof typeof Gradients;
