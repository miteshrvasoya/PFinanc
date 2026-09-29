/**
 * AddTransferScreen — Transfer between family accounts.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radii, Shadows } from '../theme';
import { formatINR } from '../utils/currency';
import { ACCOUNTS } from '../services/financialService';

export default function AddTransferScreen() {
  const router = useRouter();
  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx, setToIdx] = useState(1);
  const [amount] = useState('10,000');
  const fromAcc = ACCOUNTS[fromIdx];
  const toAcc = ACCOUNTS[toIdx];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={Colors.secondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Move Money</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.clearBtn}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Amount */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>TRANSFER AMOUNT</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <Text style={styles.amountValue}>{amount}</Text>
            </View>
          </View>

          {/* From/To Accounts */}
          <View style={styles.accountsCard}>
            <Text style={styles.fieldLabel}>From Account</Text>
            <Pressable style={styles.accountRow}>
              <View style={styles.accountIconWrap}>
                <Ionicons name="business-outline" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName}>{fromAcc.name}</Text>
                <Text style={styles.accountSub}>{fromAcc.maskedNumber} • Bal: {formatINR(fromAcc.balancePaise)}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={Colors.secondary} />
            </Pressable>

            {/* Swap button */}
            <View style={styles.swapRow}>
              <View style={styles.swapLine} />
              <Pressable style={styles.swapBtn} onPress={() => { setFromIdx(toIdx); setToIdx(fromIdx); }}>
                <Ionicons name="swap-vertical" size={18} color={Colors.primary} />
              </Pressable>
              <View style={styles.swapLine} />
            </View>

            <Text style={styles.fieldLabel}>To Account</Text>
            <Pressable style={styles.accountRow}>
              <View style={styles.accountIconWrap}>
                <Ionicons name="business-outline" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName}>{toAcc.name}</Text>
                <Text style={styles.accountSub}>{toAcc.maskedNumber ?? 'Cash Wallet'} • Bal: {formatINR(toAcc.balancePaise)}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={Colors.secondary} />
            </Pressable>
          </View>

          {/* Info note */}
          <View style={styles.infoNote}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.primaryContainer} />
            <Text style={styles.infoNoteText}>
              Transfers are marked as internal movements and won&apos;t affect your household budget.
            </Text>
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable style={styles.saveBtn} onPress={() => router.back()}>
            <Ionicons name="swap-horizontal" size={18} color="#ffffff" />
            <Text style={styles.saveBtnText}>Confirm Transfer</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceCanvas },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceCard,
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.onSurface },
  clearBtn: { fontSize: 13, fontWeight: '600', color: Colors.secondary, padding: Spacing.xs },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.marginMobile, gap: Spacing.md },
  amountCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  amountLabel: { fontSize: 11, color: Colors.secondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.xs },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  currencySymbol: { fontSize: 32, fontWeight: '700', color: Colors.primaryContainer },
  amountValue: { fontSize: 48, fontWeight: '800', color: Colors.primaryContainer, letterSpacing: -1 },
  accountsCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadows.sm,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.secondary, marginBottom: 4 },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surfaceSubtle,
  },
  accountIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.lg,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: { fontSize: 16, fontWeight: '600', color: Colors.onSurface },
  accountSub: { fontSize: 11, color: Colors.secondary, marginTop: 2 },
  swapRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  swapLine: { flex: 1, height: 1, backgroundColor: Colors.borderSubtle },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoNote: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    padding: Spacing.md,
    backgroundColor: Colors.primaryFixed,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  infoNoteText: { flex: 1, fontSize: 13, color: Colors.primary, lineHeight: 20 },
  footer: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceCanvas,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.lg,
    paddingVertical: 14,
    ...Shadows.sm,
  },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
});
