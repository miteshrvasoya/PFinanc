/**
 * AddInvestmentScreen — Placeholder for investment entry.
 * Shows a coming-soon card with the same shell pattern.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radii } from '../theme';

export default function AddInvestmentScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.secondary} />
        </Pressable>
        <Text style={styles.title}>Add Investment</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name="analytics-outline" size={40} color={Colors.primaryContainer} />
        </View>
        <Text style={styles.heading}>Track Investment</Text>
        <Text style={styles.sub}>Manually record stocks, mutual funds, or other assets to your household portfolio.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
          <Text style={styles.primaryBtnText}>Coming Soon</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceCanvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.marginMobile,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceCard,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.lg },
  title: { fontSize: 18, fontWeight: '700', color: Colors.onSurface },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: 16 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  heading: { fontSize: 24, fontWeight: '700', color: Colors.onSurface, textAlign: 'center' },
  sub: { fontSize: 14, color: Colors.secondary, textAlign: 'center', lineHeight: 22 },
  primaryBtn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.lg,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
