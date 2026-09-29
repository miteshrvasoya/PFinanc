/**
 * ScanScreen — Receipt/QR scanner placeholder.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radii } from '../theme';

export default function ScanScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.secondary} />
        </Pressable>
        <Text style={styles.title}>Scan Receipt</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.body}>
        <View style={styles.scanFrame}>
          <Ionicons name="scan-outline" size={60} color={Colors.primaryContainer} />
        </View>
        <Text style={styles.heading}>Scan a Receipt or QR</Text>
        <Text style={styles.sub}>Point your camera at a receipt or payment QR code to auto-capture transaction details.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
          <Text style={styles.primaryBtnText}>Open Camera</Text>
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
  scanFrame: {
    width: 160, height: 160, borderRadius: 20,
    backgroundColor: Colors.primaryFixed,
    borderWidth: 3,
    borderColor: Colors.primaryContainer,
    borderStyle: 'dashed',
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
