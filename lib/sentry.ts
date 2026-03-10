import * as Sentry from '@sentry/react-native';

/**
 * Initialize Sentry error tracking.
 * Set EXPO_PUBLIC_SENTRY_DSN in .env to enable.
 * In development, Sentry is disabled to avoid noise.
 */
export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn || __DEV__) {
    return;
  }

  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
    attachStacktrace: true,
  });
}

/**
 * Capture an exception in production, log in development.
 */
export function captureError(error: unknown, context?: Record<string, any>) {
  if (__DEV__) {
    console.error('[Error]', error, context);
    return;
  }

  if (error instanceof Error) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } else {
    Sentry.captureMessage(String(error), { extra: context });
  }
}

export { Sentry };
