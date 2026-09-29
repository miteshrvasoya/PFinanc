/**
 * SMSReviewScreen — Matches Stitch "SMS Transaction Review" design.
 *
 * Features:
 * - Back navigation + "1 of 3 pending" badge
 * - "Review Transaction" header + dismiss X
 * - Detection context banner (SMS source, confidence badge)
 * - Raw SMS message preview
 * - Amount anchor card with structured key-value ledger
 * - Family Budget Impact info box
 * - Approve / Edit Details / Reject actions
 * - Footer (Privacy-First SMS Parser)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radii, Shadows } from '../theme';
import { TRANSACTIONS } from '../services/financialService';
import { formatINR } from '../utils/currency';

export default function SMSReviewScreen() {
  const router = useRouter();
  const pending = TRANSACTIONS.filter(t => t.status === 'pending_review');
  const [currentIdx, setCurrentIdx] = useState(0);
  const tx = pending[currentIdx];

  if (!tx) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={48} color={Colors.incomeGreen} />
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySub}>No transactions need review.</Text>
          <Pressable style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleApprove = () => {
    if (currentIdx < pending.length - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      router.back();
    }
  };

  const handleReject = () => {
    if (currentIdx < pending.length - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      router.back();
    }
  };

  const handleEdit = () => {
    router.push('/add-expense');
  };

  const absAmount = Math.abs(tx.amountPaise);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{currentIdx + 1} of {pending.length} pending</Text>
          </View>
        </View>
        <View style={styles.headerBottom}>
          <Text style={styles.headerTitle}>Review Transaction</Text>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={Colors.secondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Detection Context Banner ── */}
        <View style={styles.detectionCard}>
          <View style={styles.detectionHeader}>
            <View style={styles.detectionLeft}>
              <View style={styles.smsIconWrap}>
                <Ionicons name="chatbubble-outline" size={14} color={Colors.incomeGreen} />
              </View>
              <View>
                <Text style={styles.detectionTitle}>Detected from SMS</Text>
                <Text style={styles.detectionSub}>Verified Bank Gateway</Text>
              </View>
            </View>
            <View style={styles.confidenceBadge}>
              <Ionicons name="checkmark-circle" size={12} color={Colors.incomeGreen} />
              <Text style={styles.confidenceText}>High confidence match</Text>
            </View>
          </View>

          {/* Raw SMS */}
          <View style={styles.smsRaw}>
            <View style={styles.smsRawHeader}>
              <View style={styles.smsRawLabel}>
                <Ionicons name="terminal-outline" size={12} color={Colors.secondary} />
                <Text style={styles.smsRawLabelText}>MESSAGE PAYLOAD PREVIEW</Text>
              </View>
              <Text style={styles.smsRawTime}>2:34 PM</Text>
            </View>
            <Text style={styles.smsRawText}>
              {tx.smsRaw ?? `HDFC Bank: Rs ${(absAmount / 100).toFixed(2)} spent at ${tx.merchant} via card ending 1234.`}
            </Text>
          </View>
        </View>

        {/* ── Review Card ── */}
        <View style={styles.reviewCard}>
          {/* Amount anchor */}
          <View style={styles.amountAnchor}>
            <Text style={styles.amountLabel}>DEBITED AMOUNT</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountValue}>{formatINR(absAmount)}</Text>
              <Text style={styles.amountCents}>.00</Text>
            </View>
            <View style={styles.amountTypeBadge}>
              <Ionicons name="arrow-up-circle" size={12} color={Colors.signalRed} />
              <Text style={styles.amountTypeText}>Money spent (Expense)</Text>
            </View>
          </View>

          {/* Key-value ledger */}
          <View style={styles.ledger}>
            {/* Merchant */}
            <View style={styles.ledgerRow}>
              <View style={styles.ledgerKey}>
                <Ionicons name="storefront-outline" size={16} color={Colors.secondary} />
                <Text style={styles.ledgerKeyText}>Merchant</Text>
              </View>
              <View style={styles.merchantValue}>
                <View style={styles.merchantIcon}>
                  <Ionicons name="fast-food-outline" size={13} color={Colors.error} />
                </View>
                <Text style={styles.ledgerValueText}>{tx.merchant}</Text>
              </View>
            </View>

            {/* Category */}
            <View style={[styles.ledgerRow, styles.ledgerRowBorder]}>
              <View style={styles.ledgerKey}>
                <Ionicons name="grid-outline" size={16} color={Colors.secondary} />
                <Text style={styles.ledgerKeyText}>Category</Text>
              </View>
              <Pressable style={styles.categoryPill}>
                <View style={styles.categoryDot} />
                <Text style={styles.categoryPillText}>{tx.category}</Text>
                <Ionicons name="chevron-down" size={12} color={Colors.secondary} />
              </Pressable>
            </View>

            {/* Payment Source */}
            <View style={[styles.ledgerRow, styles.ledgerRowBorder]}>
              <View style={styles.ledgerKey}>
                <Ionicons name="wallet-outline" size={16} color={Colors.secondary} />
                <Text style={styles.ledgerKeyText}>Payment Source</Text>
              </View>
              <View style={styles.ledgerValueRight}>
                <Text style={styles.ledgerValueText}>HDFC Bank</Text>
                <Text style={styles.ledgerValueSub}>•••• 1234</Text>
              </View>
            </View>

            {/* Date & Time */}
            <View style={[styles.ledgerRow, styles.ledgerRowBorder]}>
              <View style={styles.ledgerKey}>
                <Ionicons name="calendar-outline" size={16} color={Colors.secondary} />
                <Text style={styles.ledgerKeyText}>Date & Time</Text>
              </View>
              <Text style={styles.ledgerMono}>
                {new Date(tx.datetime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, {new Date(tx.datetime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>
            </View>

            {/* Ingestion Method */}
            <View style={[styles.ledgerRow, styles.ledgerRowBorder]}>
              <View style={styles.ledgerKey}>
                <Ionicons name="sparkles-outline" size={16} color={Colors.secondary} />
                <Text style={styles.ledgerKeyText}>Ingestion Method</Text>
              </View>
              <View style={styles.ingestionBadge}>
                <Text style={styles.ingestionText}>Automatic SMS Detection</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Info Box ── */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={Colors.primaryContainer} style={{ flexShrink: 0, marginTop: 1 }} />
          <View style={styles.infoBoxText}>
            <Text style={styles.infoBoxTitle}>Family Budget Impact</Text>
            <Text style={styles.infoBoxBody}>
              We matched this SMS to your HDFC account. Approving this will add it to your monthly expenses and update your balance.
            </Text>
          </View>
        </View>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.approveBtn, pressed && { opacity: 0.88 }]}
            onPress={handleApprove}
          >
            <Ionicons name="checkmark" size={20} color="#ffffff" />
            <Text style={styles.approveBtnText}>Approve Transaction</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.editBtn, pressed && { backgroundColor: Colors.surfaceSubtle }]}
            onPress={handleEdit}
          >
            <Ionicons name="create-outline" size={16} color={Colors.secondary} />
            <Text style={styles.editBtnText}>Edit Details</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.rejectBtn, pressed && { backgroundColor: 'rgba(216,44,44,0.08)' }]}
            onPress={handleReject}
          >
            <Ionicons name="close-outline" size={14} color={Colors.signalRed} />
            <Text style={styles.rejectBtnText}>Reject / Not Mine</Text>
          </Pressable>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Ionicons name="lock-closed-outline" size={14} color={Colors.secondary} />
          <Text style={styles.footerText}>Privacy-First SMS Parser • Local Only</Text>
        </View>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.skipText}>Skip For Now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceCanvas },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: Spacing.lg },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: Colors.onSurface },
  emptySub: { fontSize: 14, color: Colors.secondary },
  doneBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.primaryContainer, borderRadius: Radii.lg },
  doneBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },

  // Header
  header: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: Spacing.xs,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  pendingBadgeText: { fontSize: 11, color: Colors.secondary },
  headerBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: Colors.onSurface, letterSpacing: -0.4 },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.marginMobile, gap: Spacing.md },

  // Detection card
  detectionCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  detectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smsIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.incomeGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  detectionSub: { fontSize: 11, color: Colors.secondary },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
    backgroundColor: Colors.incomeGreenBg,
  },
  confidenceText: { fontSize: 11, fontWeight: '600', color: Colors.incomeGreen },
  smsRaw: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(226,231,231,0.8)',
    gap: 6,
  },
  smsRawHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  smsRawLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  smsRawLabelText: { fontSize: 10, color: Colors.secondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  smsRawTime: { fontSize: 11, color: Colors.secondary },
  smsRawText: {
    fontSize: 13,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceCard,
    padding: 8,
    borderRadius: Radii.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    lineHeight: 20,
  },

  // Review card
  reviewCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  amountAnchor: {
    alignItems: 'center',
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    marginBottom: Spacing.xs,
  },
  amountLabel: { fontSize: 11, color: Colors.secondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  amountValue: { fontSize: 32, fontWeight: '700', color: Colors.onSurface, letterSpacing: -0.6 },
  amountCents: { fontSize: 18, color: Colors.secondary },
  amountTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.DEFAULT,
    backgroundColor: 'rgba(226,223,222,0.5)',
  },
  amountTypeText: { fontSize: 13, color: Colors.secondary },

  // Ledger
  ledger: { gap: 0 },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  ledgerRowBorder: { borderTopWidth: 1, borderTopColor: Colors.borderSubtle },
  ledgerKey: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ledgerKeyText: { fontSize: 14, color: Colors.secondary },
  ledgerValueText: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  ledgerValueSub: { fontSize: 11, color: Colors.secondary, marginTop: 1 },
  ledgerValueRight: { alignItems: 'flex-end' },
  ledgerMono: { fontSize: 11, color: Colors.onSurface },
  merchantValue: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  merchantIcon: {
    width: 24,
    height: 24,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surfaceCanvas,
  },
  categoryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primaryContainer },
  categoryPillText: { fontSize: 11, fontWeight: '600', color: Colors.onSurface },
  ingestionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.DEFAULT,
    backgroundColor: 'rgba(220,225,255,0.4)',
  },
  ingestionText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },

  // Info box
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryContainer,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  infoBoxText: { flex: 1 },
  infoBoxTitle: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  infoBoxBody: { fontSize: 13, color: Colors.secondary, marginTop: 4, lineHeight: 20 },

  // Actions
  actions: { gap: 10 },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.lg,
    ...Shadows.sm,
  },
  approveBtnText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  editBtnText: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: Radii.lg,
  },
  rejectBtnText: { fontSize: 13, fontWeight: '600', color: Colors.signalRed },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceCard,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerText: { fontSize: 11, color: Colors.secondary },
  skipText: { fontSize: 13, fontWeight: '600', color: Colors.secondary, textDecorationLine: 'underline' },
});
