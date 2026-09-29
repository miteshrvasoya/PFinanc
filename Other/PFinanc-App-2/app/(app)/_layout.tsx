import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../src/theme';
import { Platform, StyleSheet, View } from 'react-native';

function TabBarIcon({ name, color }: { name: string; color: string | any }) {
  return <MaterialCommunityIcons name={name as any} size={24} color={color as string} />;
}

export default function AppLayout() {
  const router = useRouter();

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
          tabBarIcon: ({ color }) => <TabBarIcon name="home-variant" color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions/index"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color }) => <TabBarIcon name="swap-horizontal" color={color} />,
        }}
      />
      <Tabs.Screen
        name="action"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={styles.fabIconContainer}>
              <MaterialCommunityIcons name="plus" size={28} color={Colors.onPrimary} />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/quick-add');
          },
        }}
      />
      <Tabs.Screen
        name="investments/index"
        options={{
          title: 'Investments',
          tabBarIcon: ({ color }) => <TabBarIcon name="trending-up" color={color} />,
        }}
      />
      <Tabs.Screen
        name="accounts/index"
        options={{
          title: 'Accounts',
          tabBarIcon: ({ color }) => <TabBarIcon name="bank" color={color} />,
        }}
      />
      {/* Hidden tabs — accessible via router.push */}
      <Tabs.Screen name="transactions/[id]" options={{ href: null }} />
      <Tabs.Screen name="more/index" options={{ href: null }} />
      <Tabs.Screen name="accounts/[id]" options={{ href: null }} />
      <Tabs.Screen name="family/index" options={{ href: null, title: 'Family' }} />
      <Tabs.Screen name="more/import" options={{ href: null }} />
      <Tabs.Screen name="more/transfer" options={{ href: null }} />
      <Tabs.Screen name="automation/index" options={{ href: null }} />
      <Tabs.Screen name="automation/review" options={{ href: null }} />
      <Tabs.Screen name="automation/settings" options={{ href: null }} />
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
  fabIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? -10 : 20,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
});
