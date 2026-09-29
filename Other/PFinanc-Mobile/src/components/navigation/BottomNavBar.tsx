/**
 * BottomNavBar — Floating pill navigation matching the Stitch design.
 * White/95 background, rounded-3xl pill, primary-container active state.
 * Center FAB elevated -16px above the nav bar.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Shadows } from '../../theme';

interface NavTab {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFilled: keyof typeof Ionicons.glyphMap;
  route: string;
}

const TABS: NavTab[] = [
  { id: 'home', label: 'Home', icon: 'home-outline', iconFilled: 'home', route: '/(tabs)/home' },
  { id: 'transactions', label: 'Transactions', icon: 'receipt-outline', iconFilled: 'receipt', route: '/(tabs)/transactions' },
  { id: 'investments', label: 'Invest', icon: 'trending-up-outline', iconFilled: 'trending-up', route: '/(tabs)/investments' },
  { id: 'more', label: 'More', icon: 'ellipsis-horizontal-outline', iconFilled: 'ellipsis-horizontal', route: '/(tabs)/more' },
];

interface BottomNavBarProps {
  onAddPress?: () => void;
  pendingCount?: number;
}

const TabItem = ({ tab, active, onPress, pendingCount = 0 }: { tab: NavTab; active: boolean; onPress: () => void; pendingCount?: number }) => {
  const scaleAnim = useRef(new Animated.Value(active ? 1.05 : 1)).current;
  const bgOpacity = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: active ? 1.05 : 1,
        useNativeDriver: true,
        friction: 6,
        tension: 80,
      }),
      Animated.timing(bgOpacity, {
        toValue: active ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      })
    ]).start();
  }, [active, scaleAnim, bgOpacity]);

  return (
    <Pressable
      style={styles.tabContainer}
      onPress={onPress}
    >
      <Animated.View style={[styles.tabBackground, { opacity: bgOpacity }]} />
      <Animated.View style={[styles.tabContent, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.tabIconWrapper}>
          <Ionicons
            name={active ? tab.iconFilled : tab.icon}
            size={24}
            color={active ? Colors.primaryContainer : Colors.secondary}
          />
          {tab.id === 'transactions' && pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
      </Animated.View>
    </Pressable>
  );
};

export default function BottomNavBar({ onAddPress, pendingCount = 0 }: BottomNavBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (route: string) => pathname.startsWith(route.replace('/(tabs)', ''));

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.container}>
        {/* Tabs 1-2 */}
        {TABS.slice(0, 2).map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            active={isActive(tab.route)}
            onPress={() => router.push(tab.route as any)}
            pendingCount={pendingCount}
          />
        ))}

        {/* Center FAB */}
        <View style={styles.fabWrapper} pointerEvents="box-none">
          <Pressable
            style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.92 }] }]}
            onPress={onAddPress}
            accessibilityLabel="Add transaction"
          >
            <Ionicons name="add" size={32} color="#ffffff" />
          </Pressable>
          <Text style={styles.fabLabel}>Add</Text>
        </View>

        {/* Tabs 3-4 */}
        {TABS.slice(2).map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            active={isActive(tab.route)}
            onPress={() => router.push(tab.route as any)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingHorizontal: 20,
    zIndex: 50,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 40,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(226,231,231,0.5)',
    ...Shadows.navBar,
  },
  tabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    position: 'relative',
  },
  tabBackground: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0, 51, 160, 0.08)',
    borderRadius: 24,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: Colors.signalRed,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.secondary,
    marginTop: 4,
  },
  tabLabelActive: {
    color: Colors.primaryContainer,
    fontWeight: '700',
  },
  fabWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 4,
    height: 70, // Gives enough height for the FAB to overlap out the top
    marginTop: -20,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.fab,
  },
  fabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.secondary,
    marginTop: 6,
  },
});
