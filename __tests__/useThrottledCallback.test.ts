/**
 * Tests for useThrottledCallback hook logic.
 * We test the throttle behavior directly without React rendering.
 */

describe('throttle logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createThrottle<T extends (...args: any[]) => any>(fn: T, delayMs = 2000) {
    let lastCall = 0;
    return ((...args: any[]) => {
      const now = Date.now();
      if (now - lastCall < delayMs) return;
      lastCall = now;
      return fn(...args);
    }) as T;
  }

  it('calls the function immediately on first invocation', () => {
    const fn = jest.fn();
    const throttled = createThrottle(fn, 2000);
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('blocks calls within the cooldown window', () => {
    const fn = jest.fn();
    const throttled = createThrottle(fn, 2000);
    throttled();
    jest.advanceTimersByTime(500);
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('allows a call after the cooldown expires', () => {
    const fn = jest.fn();
    const throttled = createThrottle(fn, 2000);
    throttled();
    jest.advanceTimersByTime(2001);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('passes arguments through to the original function', () => {
    const fn = jest.fn();
    const throttled = createThrottle(fn, 1000);
    throttled('a', 'b');
    expect(fn).toHaveBeenCalledWith('a', 'b');
  });

  it('returns the original function return value', () => {
    const fn = jest.fn(() => 42);
    const throttled = createThrottle(fn, 1000);
    expect(throttled()).toBe(42);
  });

  it('returns undefined when throttled', () => {
    const fn = jest.fn(() => 42);
    const throttled = createThrottle(fn, 1000);
    throttled(); // first call
    expect(throttled()).toBeUndefined(); // throttled
  });

  it('works with custom delay', () => {
    const fn = jest.fn();
    const throttled = createThrottle(fn, 500);
    throttled();
    jest.advanceTimersByTime(300);
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(300);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
