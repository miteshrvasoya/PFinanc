/**
 * AddExpenseScreen — Matches Stitch "Add Expense" design.
 *
 * Features:
 * - Modal navigation bar (close + title + clear)
 * - Segmented type switcher (Expense | Income | Transfer)
 * - Hero rupee amount display with blink cursor
 * - Merchant input with suggestion chips
 * - Category selector
 * - Account selector + date picker
 * - Notes + receipt photo button
 * - Save Expense primary button
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

const SUGGESTIONS = ['Swiggy', 'Amazon', 'Grocery Store', 'Pharmacy'];
const CATEGORIES = [
  { id: 'food', label: 'Food & Dining', icon: 'restaurant-outline', sub: 'Household Shared • 62% consumed' },
  { id: 'shopping', label: 'Shopping', icon: 'bag-handle-outline', sub: '' },
  { id: 'bills', label: 'Utilities & Bills', icon: 'flash-outline', sub: '' },
  { id: 'groceries', label: 'Groceries', icon: 'storefront-outline', sub: '' },
];

export default function AddExpenseScreen() {
  const router = useRouter();
  const [txType, setTxType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('1,450');
  const [merchant, setMerchant] = useState('Swiggy');
  const [selectedCategory] = useState(CATEGORIES[0]);
  const [notes, setNotes] = useState('Dinner with family');
  const [cursorAnim] = useState(() => new Animated.Value(1));

  // Cursor blink
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, [cursorAnim]);

  const handleSave = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* ── Modal Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable style={styles.closeBtn} onPress={() => router.back()}>
              <Ionicons name="close" size={24} color={Colors.secondary} />
            </Pressable>
            <Text style={styles.headerTitle}>Add Expense</Text>
            <Pressable onPress={() => {
              setAmount('');
              setMerchant('');
              setNotes('');
            }}>
              <Text style={styles.clearBtn}>Clear</Text>
            </Pressable>
          </View>

          {/* Type Switcher */}
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

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Amount Hero ── */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>AMOUNT SPENT</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <Text style={styles.amountValue}>{amount || '0'}</Text>
              <Animated.View style={[styles.cursor, { opacity: cursorAnim }]} />
            </View>
            <View style={styles.budgetRow}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.tertiary} />
              <Text style={styles.budgetText}>Within daily household budget limit</Text>
            </View>
          </View>

          {/* ── Merchant Input ── */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>What did you spend on?</Text>
            <View style={styles.merchantInput}>
              <Ionicons name="storefront-outline" size={20} color={Colors.secondary} style={styles.fieldIcon} />
              <TextInput
                style={styles.merchantTextInput}
                value={merchant}
                onChangeText={setMerchant}
                placeholder="Store, person, or service name"
                placeholderTextColor={Colors.outlineVariant}
              />
            </View>
            {/* Suggestion chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipRow}>
                {SUGGESTIONS.map(s => (
                  <Pressable
                    key={s}
                    style={[styles.chip, merchant === s && styles.chipActive]}
                    onPress={() => setMerchant(s)}
                  >
                    <Text style={[styles.chipText, merchant === s && styles.chipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* ── Category ── */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Category</Text>
            <Pressable style={styles.categorySelector}>
              <View style={styles.categorySelectorLeft}>
                <View style={styles.categoryIconWrap}>
                  <Ionicons name={selectedCategory.icon as any} size={20} color={Colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.categoryName}>{selectedCategory.label}</Text>
                  {selectedCategory.sub && <Text style={styles.categorySub}>{selectedCategory.sub}</Text>}
                </View>
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.secondary} />
            </Pressable>
          </View>

          {/* ── Account + Date ── */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Paid From (Account)</Text>
            <Pressable style={styles.selectorRow}>
              <View style={styles.selectorLeft}>
                <View style={styles.accountIconWrap}>
                  <Ionicons name="business-outline" size={16} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.selectorTitle}>HDFC Bank (•••• 1234)</Text>
                  <Text style={styles.selectorSub}>Bal: ₹42,500</Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.secondary} />
            </Pressable>
          </View>

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

          {/* ── Notes & Receipt ── */}
          <View style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>Notes & Receipt (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add short note..."
              placeholderTextColor={Colors.secondary}
            />
            <Pressable style={styles.receiptBtn}>
              <Ionicons name="camera-outline" size={18} color={Colors.secondary} />
              <Text style={styles.receiptBtnText}>Add receipt photo</Text>
            </Pressable>
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* ── Save Footer ── */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.88 }]}
            onPress={handleSave}
          >
            <Ionicons name="checkmark" size={20} color="#ffffff" />
            <Text style={styles.saveBtnText}>Save Expense</Text>
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

  // Header
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
  typeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radii.lg - 2,
  },
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

  // Content
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.marginMobile, gap: Spacing.md },

  // Amount Card
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

  // Field cards
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
  fieldIcon: {},

  // Merchant
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
  chipActive: {
    backgroundColor: Colors.primaryFixed,
    borderColor: Colors.primaryContainer,
  },
  chipText: { fontSize: 13, color: Colors.onSurfaceVariant },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },

  // Category
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
  categorySub: { fontSize: 11, color: Colors.secondary, marginTop: 1 },

  // Selectors
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

  // Notes
  notesInput: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.onSurface,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: 10,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderStyle: 'dashed',
    backgroundColor: Colors.surfaceSubtle,
  },
  receiptBtnText: { fontSize: 13, fontWeight: '500', color: Colors.secondary },

  // Footer
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
