import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../src/theme';
import { Platform, StyleSheet, View } from 'react-native';

function TabBarIcon({ name, color }: { name: string; color: string | any }) {
  return <MaterialCommunityIcons name={name as any} size={24} color={color as string} />;
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.navActive as string,
        tabBarInactiveTintColor: Colors.navInactive as string,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions/index"
        options={{
          title: 'Ledger',
          tabBarIcon: ({ color }) => <TabBarIcon name="format-list-bulleted" color={color} />,
        }}
      />
      <Tabs.Screen
        name="accounts/index"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color }) => <TabBarIcon name="bank" color={color} />,
        }}
      />
      <Tabs.Screen
        name="investments/index"
        options={{
          title: 'Invest',
          tabBarIcon: ({ color }) => <TabBarIcon name="chart-line" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more/index"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <TabBarIcon name="dots-horizontal" color={color} />,
        }}
      />
      {/* Hidden tabs — accessible via router.push */}
      <Tabs.Screen name="transactions/[id]" options={{ href: null }} />
      <Tabs.Screen name="accounts/[id]" options={{ href: null }} />
      <Tabs.Screen name="family/index" options={{ href: null, title: 'Family' }} />
      <Tabs.Screen name="more/import" options={{ href: null }} />
      <Tabs.Screen name="more/transfer" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: Platform.OS === 'ios' ? Spacing.navBarHeight + 20 : Spacing.navBarHeight,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    elevation: 8,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  tabLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  tabItem: { paddingTop: 4 },
});
