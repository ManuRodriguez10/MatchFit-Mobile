import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

type TabIconName =
  | 'grid-outline'
  | 'calendar-outline'
  | 'people-outline'
  | 'person-outline'
  | 'settings-outline';

type TabIconConfig = {
  lib: 'ion' | 'mci';
  name: string;
};

const TAB_ICONS: Record<string, TabIconConfig> = {
  index: { lib: 'ion', name: 'grid-outline' },
  events: { lib: 'ion', name: 'calendar-outline' },
  roster: { lib: 'ion', name: 'people-outline' },
  lineups: { lib: 'mci', name: 'soccer-field' },
  profile: { lib: 'ion', name: 'person-outline' },
  settings: { lib: 'ion', name: 'settings-outline' },
};

function TeamTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const visibleRoutes = useMemo(
    () => state.routes.filter((r) => {
      if (r.name === 'TeamTabPlaceholder') return false;
      const options = descriptors[r.key]?.options;
      if (options && 'href' in options && options.href === null) return false;
      return true;
    }),
    [state.routes, descriptors]
  );

  const tabWidth = barWidth > 0 ? barWidth / Math.max(visibleRoutes.length, 1) : 0;
  const activeIndex = Math.max(
    0,
    visibleRoutes.findIndex((route) => route.key === state.routes[state.index]?.key)
  );

  useEffect(() => {
    if (!tabWidth) return;

    Animated.spring(translateX, {
      toValue: activeIndex * tabWidth,
      useNativeDriver: true,
      speed: 18,
      bounciness: 0,
    }).start();
  }, [activeIndex, tabWidth, translateX]);

  const activeOptions = descriptors[state.routes[state.index]?.key]?.options;
  const tabBarBackground = activeOptions?.tabBarBackground?.();

  return (
    <View
      style={[
        styles.tabBarOuter,
        { bottom: Platform.OS === 'ios' ? Math.max(insets.bottom + 2, 12) : 10 },
      ]}
    >
      <BlurView intensity={55} tint="dark" style={styles.tabBarBlur} />
      {tabBarBackground ?? (
        <LinearGradient
          colors={['#118FF3', '#0C5798']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.tabBarGradient}
        />
      )}

      <View style={styles.tabBarInner} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
        {tabWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activeSlider,
              {
                width: tabWidth,
                transform: [{ translateX }],
              },
            ]}
          >
            <View style={styles.activeChip} />
          </Animated.View>
        ) : null}

        {visibleRoutes.map((route) => {
          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
          const isFocused = routeIndex === state.index;
          const iconConfig = TAB_ICONS[route.name] ?? { lib: 'ion', name: 'grid-outline' };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tabButton}
            >
              {iconConfig.lib === 'mci' ? (
                <MaterialCommunityIcons
                  name={iconConfig.name as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={22}
                  color={isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.62)'}
                />
              ) : (
                <Ionicons
                  name={iconConfig.name as TabIconName}
                  size={22}
                  color={isFocused ? '#FFFFFF' : 'rgba(255,255,255,0.62)'}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TeamDetailLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => (
          <LinearGradient
            colors={['#118FF3', '#0C5798']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tabBarGradient}
          />
        ),
      }}
      tabBar={(props) => <TeamTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="lineups" options={{ title: 'Lineups' }} />
      <Tabs.Screen name="events" options={{ title: 'Events' }} />
      <Tabs.Screen name="roster" options={{ title: 'Roster' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
      <Tabs.Screen
        name="TeamTabPlaceholder"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    left: 18,
    right: 18,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 14,
  },
  tabBarBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBarGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    position: 'relative',
  },
  activeSlider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeChip: {
    width: 42,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
