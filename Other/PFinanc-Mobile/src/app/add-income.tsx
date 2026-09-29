/**
 * AddIncomeScreen — Reuses Add Expense pattern for Income entry.
 * Pre-fills type to "income" and relabels actions accordingly.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radii, Shadows } from '../theme';

type TxType = 'expense' | 'income' | 'transfer';

const SOURCES = ['Salary', 'Freelance', 'Rent Received', 'Dividend'];

export default function AddIncomeScreen() {
  const router = useRouter();
  const [txType, setTxType] = useState<TxType>('income');
  const [amount, setAmount] = useState('65,000');
  const [source, setSource] = useState('Salary Deposit');
  const [notes, setNotes] = useState('Monthly salary for October');
  const [cursorAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, [cursorAnim]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable style={styles.closeBtn} onPress={() => router.back()}>
              <Ionicons name="close" size={24} color={Colors.secondary} />
            </Pressable>
            <Text style={styles.headerTitle}>Add Income</Text>
            <Pressable onPress={() => { setAmount(''); setSource(''); setNotes(''); }}>
              <Text style={styles.clearBtn}>Clear</Text>
            </Pressable>
          </View>
          <View style={styles.typeSwitcher}>
            {(['expense', 'income', 'transfer'] as TxType[]).map(t => (
              <Pressable
                key={t}
                style={[styles.typeTab, txType === t && styles.typeTabActive]}
                onPress={() => setTxType(t)}
              >
                <Text style={[styles.typeTabText, txType === t && styles.typeTabTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Amount Hero */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>AMOUNT RECEIVED</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.currencySymbol, { color: Colors.incomeGreen }]}>₹</Text>
              <Text style={[styles.amountValue, { color: Colors.incomeGreen }]}>{amount || '0'}</Text>
              <Animated.View style={[styles.cursor, { opacity: cursorAnim, backgroundColor: Colors.incomeGreen }]} />
            </View>
            <View style={[styles.budgetRow, { backgroundColor: Colors.incomeGreenBg }]}>
              <Ionicons name="trending-up" size={14} color={Colors.incomeGreen} />
              <Text style={[styles.budgetText, { color: Colors.incomeGreen }]}>Income recorded to household</Text>
            </View>
          </View>

          {/* Source Input */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Source / Payer</Text>
            <View style={styles.merchantInput}>
              <Ionicons name="business-outline" size={20} color={Colors.secondary} />
              <TextInput
                style={styles.merchantTextInput}
                value={source}
                onChangeText={setSource}
                placeholder="Company, person, or source"
                placeholderTextColor={Colors.outlineVariant}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {SOURCES.map(s => (
                  <Pressable key={s} style={[styles.chip, source === s && styles.chipActive]} onPress={() => setSource(s)}>
                    <Text style={[styles.chipText, source === s && styles.chipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Category */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Income Category</Text>
            <Pressable style={styles.categorySelector}>
              <View style={styles.categorySelectorLeft}>
                <View style={[styles.categoryIconWrap, { backgroundColor: Colors.incomeGreenBg }]}>
                  <Ionicons name="briefcase-outline" size={20} color={Colors.incomeGreen} />
                </View>
                <Text style={styles.categoryName}>Salary & Employment</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.secondary} />
            </Pressable>
          </View>

          {/* Account */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Received In</Text>
            <Pressable style={styles.selectorRow}>
              <View style={styles.selectorLeft}>
                <View style={[styles.accountIconWrap, { backgroundColor: Colors.incomeGreenBg }]}>
                  <Ionicons name="business-outline" size={16} color={Colors.incomeGreen} />
                </View>
                <View>
                  <Text style={styles.selectorTitle}>ICICI Bank (•••• 5678)</Text>
                  <Text style={styles.selectorSub}>Salary Account</Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.secondary} />
            </Pressable>
          </View>

          {/* Date */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Date</Text>
            <Pressable style={styles.selectorRow}>
              <View style={styles.selectorLeft}>
                <View style={styles.dateIconWrap}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.secondary} />
                </View>
                <Text style={styles.selectorTitle}>Today, 27 Sep 2026</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.secondary} />
            </Pressable>
          </View>

          {/* Notes */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add note..."
              placeholderTextColor={Colors.secondary}
            />
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.saveBtn, { backgroundColor: Colors.incomeGreen }]}
            onPress={() => router.back()}
          >
            <Ionicons name="checkmark" size={20} color="#ffffff" />
            <Text style={styles.saveBtnText}>Save Income</Text>
          </Pressable>
          <View style={styles.privacyRow}>
            <Ionicons name="lock-closed" size={13} color={Colors.tertiary} />
            <Text style={styles.privacyText}>Stored securely on device • No cloud sync required</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceCanvas },
  flex: { flex: 1 },
  header: {
    backgroundColor: Colors.surfaceCard,
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    gap: Spacing.sm,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.lg },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.onSurface },
  clearBtn: { fontSize: 13, fontWeight: '600', color: Colors.primary, padding: Spacing.xs },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: 4,
  },
  typeTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radii.lg - 2 },
  typeTabActive: {
    backgroundColor: Colors.surfaceCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typeTabText: { fontSize: 13, color: Colors.secondary },
  typeTabTextActive: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
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
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginVertical: Spacing.xs },
  currencySymbol: { fontSize: 32, fontWeight: '700', color: Colors.primary },
  amountValue: { fontSize: 48, fontWeight: '800', color: Colors.primary, letterSpacing: -1 },
  cursor: { width: 3, height: 32, backgroundColor: Colors.primaryContainer, borderRadius: 2, marginLeft: 2 },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginTop: Spacing.xs,
  },
  budgetText: { fontSize: 11, color: Colors.secondary },
  fieldCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadows.sm,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.secondary },
  merchantInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceCard,
  },
  merchantTextInput: { flex: 1, fontSize: 16, color: Colors.onSurface },
  chipRow: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  chipActive: { backgroundColor: Colors.incomeGreenBg, borderColor: '#A7F3D0' },
  chipText: { fontSize: 13, color: Colors.onSurfaceVariant },
  chipTextActive: { color: Colors.incomeGreen, fontWeight: '600' },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  categorySelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: { fontSize: 16, fontWeight: '600', color: Colors.onSurface },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surfaceCard,
  },
  selectorLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  accountIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorTitle: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  selectorSub: { fontSize: 12, color: Colors.secondary },
  notesInput: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.onSurface,
  },
  footer: {
    paddingHorizontal: Spacing.marginMobile,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceCanvas,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: 14,
    ...Shadows.sm,
  },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  privacyText: { fontSize: 11, color: Colors.secondary },
});
