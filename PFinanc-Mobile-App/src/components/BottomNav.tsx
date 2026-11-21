import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

type Tab = 'home' | 'history' | 'portfolio' | 'more';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onQuickAddPress: () => void;
}

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const LEFT_TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'history', label: 'Activity', icon: 'receipt-long' },
];
const RIGHT_TABS: { key: Tab; label: string; icon: IconName }[] = [
  { key: 'portfolio', label: 'Portfolio', icon: 'show-chart' },
  { key: 'more', label: 'More', icon: 'grid-view' },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, onQuickAddPress }) => {
  const insets = useSafeAreaInsets();

  const renderTab = (tab: { key: Tab; label: string; icon: IconName }) => {
    const active = activeTab === tab.key;
    return (
      <Pressable
        key={tab.key}
        style={styles.tab}
        onPress={() => onTabChange(tab.key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={tab.label}
        hitSlop={4}
      >
        <View style={[styles.iconPill, active && styles.iconPillActive]}>
          <MaterialIcons
            name={tab.icon}
            size={22}
            color={active ? colors.onPrimary : colors.outline}
          />
        </View>
        <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 8) }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {LEFT_TABS.map(renderTab)}

        <View style={styles.fabSlot}>
          <Pressable
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
            onPress={onQuickAddPress}
            accessibilityRole="button"
            accessibilityLabel="Quick add"
          >
            <MaterialIcons name="add" size={30} color={colors.onPrimary} />
          </Pressable>
        </View>

        {RIGHT_TABS.map(renderTab)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    zIndex: 40,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.5)',
    shadowColor: '#0b1c15',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 14,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconPill: {
    width: 46,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: colors.primaryContainer,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10.5,
    color: colors.outline,
  },
  labelActive: {
    fontFamily: 'Inter_700Bold',
    color: colors.primaryContainer,
  },
  fabSlot: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: -30,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
    shadowColor: colors.primaryContainer,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.9,
  },
});
