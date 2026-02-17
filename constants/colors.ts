// MatchFit Brand Colors (extracted from logo)
export const Colors = {
  // Primary Blues
  primary: '#3B82F6', // Bright blue from logo
  primaryDark: '#1E3A8A', // Darker blue from logo gradient
  primaryLight: '#60A5FA', // Lighter blue highlight

  // Backgrounds
  background: '#FFFFFF',
  backgroundLight: '#F0F9FF', // Very light blue

  // Text
  textPrimary: '#1E293B', // Dark slate
  textSecondary: '#64748B', // Slate gray

  // Status Colors
  success: '#10B981', // Green for confirmations
  error: '#EF4444', // Red for errors
  warning: '#F59E0B', // Amber for warnings

  // UI Elements
  border: '#E2E8F0', // Light gray for inputs
  borderFocus: '#3B82F6', // Primary blue for focused state

  // Overlays
  backdrop: 'rgba(0, 0, 0, 0.5)',
  cardShadow: 'rgba(59, 130, 246, 0.1)',
} as const;

// Gradients
export const Gradients = {
  primary: ['#3B82F6', '#1E3A8A'], // Blue gradient
  primaryLight: ['#60A5FA', '#3B82F6'], // Light blue gradient
  success: ['#10B981', '#059669'], // Green gradient
  backgroundSubtle: ['#F0F9FF', '#FFFFFF'], // Subtle background gradient
} as const;

export type ColorKey = keyof typeof Colors;
export type GradientKey = keyof typeof Gradients;
