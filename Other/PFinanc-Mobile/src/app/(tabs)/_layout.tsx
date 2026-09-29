/**
 * (tabs) layout — custom bottom nav, no default tab bar.
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import BottomNavBar from '../../components/navigation/BottomNavBar';
import QuickAddSheet from '../../components/navigation/QuickAddSheet';
import { Colors } from '../../theme';
import { TRANSACTIONS } from '../../services/financialService';

export default function TabsLayout() {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const pendingCount = TRANSACTIONS.filter(t => t.status === 'pending_review').length;

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <BottomNavBar
        onAddPress={() => setQuickAddOpen(true)}
        pendingCount={pendingCount}
      />
      <QuickAddSheet visible={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceCanvas },
});
