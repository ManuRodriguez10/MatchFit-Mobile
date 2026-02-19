import React from 'react';
import { View, Text, Image, ScrollView } from 'react-native';

// Drop-in replacement for react-native-reanimated that uses plain RN Views.
// This lets the app run in Expo Go without native Worklets.

const AnimatedView = React.forwardRef((props: any, ref: any) => {
  const { entering, exiting, layout, ...rest } = props;
  return <View ref={ref} {...rest} />;
});

const AnimatedText = React.forwardRef((props: any, ref: any) => {
  const { entering, exiting, layout, ...rest } = props;
  return <Text ref={ref} {...rest} />;
});

const AnimatedImage = React.forwardRef((props: any, ref: any) => {
  const { entering, exiting, layout, ...rest } = props;
  return <Image ref={ref} {...rest} />;
});

const AnimatedScrollView = React.forwardRef((props: any, ref: any) => {
  const { entering, exiting, layout, ...rest } = props;
  return <ScrollView ref={ref} {...rest} />;
});

function shimCreateAnimatedComponent(Component: any) {
  return React.forwardRef((props: any, ref: any) => {
    const { entering, exiting, layout, ...rest } = props;
    return <Component ref={ref} {...rest} />;
  });
}

const Animated = {
  View: AnimatedView,
  Text: AnimatedText,
  Image: AnimatedImage,
  ScrollView: AnimatedScrollView,
  createAnimatedComponent: shimCreateAnimatedComponent,
};

// Layout animation stubs - return chainable objects
const createAnimationBuilder = () => {
  const builder: any = {};
  const chainable = (..._args: any[]) => builder;
  builder.delay = chainable;
  builder.duration = chainable;
  builder.springify = chainable;
  builder.damping = chainable;
  builder.stiffness = chainable;
  builder.withInitialValues = chainable;
  builder.withCallback = chainable;
  builder.easing = chainable;
  builder.build = chainable;
  return builder;
};

export const FadeIn = createAnimationBuilder();
export const FadeInDown = createAnimationBuilder();
export const FadeInUp = createAnimationBuilder();
export const FadeInLeft = createAnimationBuilder();
export const FadeInRight = createAnimationBuilder();
export const FadeOut = createAnimationBuilder();
export const FadeOutDown = createAnimationBuilder();
export const FadeOutUp = createAnimationBuilder();
export const SlideInDown = createAnimationBuilder();
export const SlideInUp = createAnimationBuilder();
export const SlideInLeft = createAnimationBuilder();
export const SlideInRight = createAnimationBuilder();
export const SlideOutDown = createAnimationBuilder();
export const SlideOutUp = createAnimationBuilder();
export const ZoomIn = createAnimationBuilder();
export const ZoomOut = createAnimationBuilder();
export const BounceIn = createAnimationBuilder();
export const BounceInDown = createAnimationBuilder();
export const Layout = createAnimationBuilder();
export const LinearTransition = createAnimationBuilder();

// Shared value / animated style stubs
export function useSharedValue(initialValue: any) {
  const ref = React.useRef({ value: initialValue });
  return ref.current;
}

export function useAnimatedStyle(updater: () => any, _deps?: any[]) {
  return {};
}

export function useAnimatedProps(updater: () => any, _deps?: any[]) {
  return {};
}

export function useDerivedValue(updater: () => any, _deps?: any[]) {
  const ref = React.useRef({ value: undefined });
  return ref.current;
}

export function useAnimatedScrollHandler(_handler: any) {
  return () => {};
}

// Animation function stubs
export const withSpring = (toValue: any, _config?: any, _cb?: any) => toValue;
export const withTiming = (toValue: any, _config?: any, _cb?: any) => toValue;
export const withDelay = (_delay: number, animation: any) => animation;
export const withSequence = (...animations: any[]) => animations[animations.length - 1];
export const withRepeat = (animation: any, _reps?: number, _reverse?: boolean, _cb?: any) => animation;
export const withDecay = (_config?: any) => 0;
export const cancelAnimation = (_sv: any) => {};
export const runOnJS = (fn: any) => fn;
export const runOnUI = (fn: any) => fn;
export const interpolate = (value: number, inputRange: number[], outputRange: number[]) => {
  const i = inputRange.findIndex((v) => v >= value);
  if (i <= 0) return outputRange[0];
  if (i >= inputRange.length) return outputRange[outputRange.length - 1];
  const ratio = (value - inputRange[i - 1]) / (inputRange[i] - inputRange[i - 1]);
  return outputRange[i - 1] + ratio * (outputRange[i] - outputRange[i - 1]);
};
export const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };
export const Easing = {
  linear: (t: number) => t,
  ease: (t: number) => t,
  bezier: () => (t: number) => t,
  in: (fn: any) => fn,
  out: (fn: any) => fn,
  inOut: (fn: any) => fn,
};

export function createAnimatedComponent(Component: any) {
  return React.forwardRef((props: any, ref: any) => {
    const { entering, exiting, layout, ...rest } = props;
    return <Component ref={ref} {...rest} />;
  });
}

export default Animated;
