import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, TextInput, Platform,
  KeyboardAvoidingView, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';
import { getMaterialIcon } from '../utils/iconMapper';

interface QuickAddModalProps {
  visible: boolean;
  onClose: () => void;
  initialData?: any;      // for Edit mode: { raw: transaction object }
  initialTab?: string;    // 'Expense' | 'Income' | 'Transfer'
  onSaved?: () => void;   // called after a successful save so screens can refresh
}

interface Account {
  id: string;
  name: string;
  account_type: string;
  bank_name?: string;
  current_balance: number;
  currency: string;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  category_type?: string; // 'EXPENSE' | 'INCOME' | 'BOTH'
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  visible, onClose, initialData, initialTab, onSaved
}) => {
  const isEditMode = !!(initialData && initialData.raw);
  const tabs = isEditMode ? ['Expense', 'Income'] : ['Expense', 'Income', 'Transfer'];

  const [activeTab, setActiveTab] = useState(initialTab || 'Expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [merchantName, setMerchantName] = useState('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedToAccount, setSelectedToAccount] = useState<Account | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showNote, setShowNote] = useState(false);

  // ─── Load accounts & categories from API ────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accRes, catRes] = await Promise.all([
        apiClient.get('/api/accounts'),
        apiClient.get('/api/categories'),
      ]);

      // Accounts
      let accs: Account[] = [];
      if (accRes && accRes.success) {
        accs = (Array.isArray(accRes.data) ? accRes.data : accRes.data?.accounts || [])
          .filter((a: Account) => a.is_active);
      }
      setAccounts(accs);

      // Categories
      let cats: Category[] = [];
      if (catRes && catRes.success && Array.isArray(catRes.data)) {
        cats = catRes.data;
      }
      setCategories(cats);

      // ── Pre-fill for Edit Mode ──
      if (isEditMode) {
        const raw = initialData.raw;
        setAmount(String(raw.amount || ''));
        setNote(raw.description || raw.notes || '');
        setMerchantName(raw.merchant_name || '');
        setActiveTab(raw.transaction_type === 'INCOME' ? 'Income' : 'Expense');
        setSelectedDate(new Date(raw.transaction_date));

        const matchedAcc = accs.find(a => a.id === raw.account_id);
        setSelectedAccount(matchedAcc ?? (accs[0] ?? null));

        const matchedCat = cats.find(c => c.id === raw.category_id);
        setSelectedCategory(matchedCat ?? (cats[0] ?? null));
      } else {
        // New mode – apply initialTab
        setActiveTab(initialTab || 'Expense');
        setSelectedAccount(accs[0] ?? null);
        setSelectedToAccount(accs.length > 1 ? accs[1] : null);
        // Default category: pick first one matching current tab type
        const tabType = (initialTab || 'Expense').toUpperCase();
        const defaultCat = cats.find(c => !c.category_type || c.category_type === tabType || c.category_type === 'BOTH')
          ?? cats[0] ?? null;
        setSelectedCategory(defaultCat);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (!msg.includes('JSON') && !msg.includes('404')) {
        console.error('QuickAddModal loadData error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [visible, isEditMode]);

  useEffect(() => {
    if (visible) {
      // Reset non-edit fields each open
      if (!isEditMode) {
        setAmount('');
        setNote('');
        setMerchantName('');
        setSelectedDate(new Date());
        setShowNote(false);
      } else {
        setShowNote(!!(initialData.raw.description || initialData.raw.notes));
      }
      loadData();
    }
  }, [visible]);

  // When activeTab changes in new mode, try to find a suitable default category
  useEffect(() => {
    if (!isEditMode && categories.length > 0) {
      const tabType = activeTab.toUpperCase();
      const suitable = categories.find(c =>
        !c.category_type || c.category_type === tabType || c.category_type === 'BOTH'
      );
      if (suitable) setSelectedCategory(suitable);
    }
  }, [activeTab]);

  // ─── Validation helpers ───────────────────────────────────────────────────────
  const validateAndSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Enter an amount', 'Please type how much money it was.');
      return;
    }
    if (!selectedAccount) {
      if (accounts.length === 0) {
        Alert.alert(
          'No Accounts Found',
          'You have no active bank accounts. Please add an account first in More → Accounts.',
        );
      } else {
        Alert.alert('No Account Selected', 'Please select an account.');
      }
      return;
    }
    if (activeTab !== 'Transfer' && !selectedCategory) {
      if (categories.length === 0) {
        Alert.alert(
          'No Categories Found',
          'You have no categories set up. Please add a category first in the settings.',
        );
      } else {
        Alert.alert('No Category Selected', 'Please select a category.');
      }
      return;
    }
    if (activeTab === 'Transfer') {
      if (!selectedToAccount) {
        Alert.alert('No Destination', 'Please select a destination account.');
        return;
      }
      if (selectedAccount.id === selectedToAccount.id) {
        Alert.alert('Invalid Transfer', 'Source and destination accounts must be different.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (activeTab === 'Transfer') {
        const res = await apiClient.post('/api/transfers', {
          source_account_id: selectedAccount.id,
          destination_account_id: selectedToAccount!.id,
          amount: parsedAmount,
          transfer_date: selectedDate.toISOString().split('T')[0],
          description: note || null,
        });
        if (!res.success) throw new Error(res.message || 'Transfer failed');
      } else {
        // Build the exact payload the backend expects
        const payload: Record<string, any> = {
          account_id: selectedAccount.id,
          category_id: selectedCategory!.id,
          transaction_type: activeTab.toUpperCase(),   // 'EXPENSE' | 'INCOME'
          amount: parsedAmount,
          currency: selectedAccount.currency || 'INR',
          transaction_date: selectedDate.toISOString().split('T')[0],
          description: note || null,
          merchant_name: merchantName.trim() || null,
          source_type: 'MANUAL',
          status: 'CONFIRMED',
        };

        let res;
        if (isEditMode && initialData.raw.id) {
          // Update: only send fields the backend allows to change
          res = await apiClient.put(`/api/transactions/${initialData.raw.id}`, {
            account_id: payload.account_id,
            category_id: payload.category_id,
            transaction_type: payload.transaction_type,
            amount: payload.amount,
            currency: payload.currency,
            transaction_date: payload.transaction_date,
            description: payload.description,
            merchant_name: payload.merchant_name,
          });
        } else {
          res = await apiClient.post('/api/transactions', payload);
        }

        if (!res.success) throw new Error(res.message || 'Could not save transaction');
      }
      onSaved?.();
      onClose();
    } catch (err: any) {
      Alert.alert('Something went wrong', err.message || 'Could not save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeAccounts = accounts.filter(a => a.is_active);
  const filteredCategories = activeTab === 'Expense'
    ? categories.filter(c => !c.category_type || c.category_type === 'EXPENSE' || c.category_type === 'BOTH')
    : activeTab === 'Income'
    ? categories.filter(c => !c.category_type || c.category_type === 'INCOME' || c.category_type === 'BOTH')
    : categories;

  // ─── Render ───────────────────────────────────────────────────────────────────
  const TAB_META: Record<string, { label: string; icon: string; color: string; verb: string }> = {
    Expense: { label: 'Money Out', icon: 'arrow-upward', color: colors.error, verb: 'Spent' },
    Income: { label: 'Money In', icon: 'arrow-downward', color: colors.primaryContainer, verb: 'Received' },
    Transfer: { label: 'Move Money', icon: 'swap-horiz', color: colors.secondary, verb: 'Moved' },
  };
  const meta = TAB_META[activeTab] || TAB_META.Expense;

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000);
  const isYesterday = selectedDate.toDateString() === yesterday.toDateString();
  const isCustomDate = !isToday(selectedDate) && !isYesterday;

  const saveLabel = isEditMode && initialData?.raw?.id
    ? 'Save changes'
    : activeTab === 'Transfer' ? 'Move money' : activeTab === 'Income' ? 'Save money in' : 'Save money out';

  const renderAccountChips = (selected: Account | null, onPick: (a: Account) => void, exclude?: string) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s2.chipRow}>
      {activeAccounts.filter(a => a.id !== exclude).map(a => {
        const on = selected?.id === a.id;
        return (
          <Pressable key={a.id} style={[s2.chip, on && s2.chipOn]} onPress={() => onPick(a)}>
            <MaterialIcons name="account-balance-wallet" size={16} color={on ? colors.onPrimary : colors.onSurfaceVariant} />
            <Text style={[s2.chipText, on && s2.chipTextOn]} numberOfLines={1}>{a.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheetContainer, { maxHeight: '92%' }]}>
          <View style={styles.dragHandle} />

          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>{isEditMode && initialData?.raw?.id ? 'Edit entry' : 'Add an entry'}</Text>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {/* Step 1: what happened? */}
          <View style={s2.tabs}>
            {tabs.map(tab => {
              const m = TAB_META[tab];
              const on = activeTab === tab;
              return (
                <Pressable key={tab} style={[s2.tab, on && { backgroundColor: m.color }]} onPress={() => setActiveTab(tab)}>
                  <MaterialIcons name={m.icon as any} size={18} color={on ? colors.onPrimary : m.color} />
                  <Text style={[s2.tabText, on && { color: colors.onPrimary }]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {isLoading ? (
            <View style={{ height: 220, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Getting things ready...</Text>
            </View>
          ) : (
            <>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
                {activeAccounts.length === 0 && (
                  <View style={styles.warningBanner}>
                    <MaterialIcons name="info" size={18} color="#b45309" />
                    <Text style={styles.warningText}>
                      You haven't added an account yet. Open <Text style={{ fontFamily: 'Inter_600SemiBold' }}>More → Accounts</Text> to add one.
                    </Text>
                  </View>
                )}

                {/* Step 2: how much? */}
                <Text style={s2.step}>How much?</Text>
                <View style={[styles.amountSection, s2.amountBox]}>
                  <Text style={[styles.currencySymbol, { color: amount ? meta.color : colors.outlineVariant }]}>₹</Text>
                  <TextInput
                    style={[styles.amountInput, amount ? { color: meta.color } : null]}
                    value={amount}
                    onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.outlineVariant}
                    autoFocus={!isEditMode}
                    selectionColor={colors.primary}
                  />
                </View>
                {!isEditMode && (
                  <View style={s2.quickAmounts}>
                    {[100, 500, 1000, 5000].map(v => (
                      <Pressable key={v} style={s2.quickAmt} onPress={() => setAmount(String((parseFloat(amount) || 0) + v))}>
                        <Text style={s2.quickAmtText}>+{v.toLocaleString('en-IN')}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Step 3: what for? */}
                {activeTab !== 'Transfer' && (
                  <>
                    <Text style={s2.step}>{activeTab === 'Income' ? 'What kind of income?' : 'What was it for?'}</Text>
                    {filteredCategories.length === 0 ? (
                      <Text style={s2.hint}>No categories found. Add categories from More → Insights.</Text>
                    ) : (
                      <View style={s2.catGrid}>
                        {filteredCategories.map(c => {
                          const on = selectedCategory?.id === c.id;
                          return (
                            <Pressable key={c.id} style={[s2.cat, on && s2.catOn]} onPress={() => setSelectedCategory(c)}>
                              <View style={[s2.catIcon, { backgroundColor: c.color || colors.surfaceContainerHigh }]}>
                                <MaterialIcons name={getMaterialIcon(c.icon) || 'category'} size={20} color={colors.primary} />
                              </View>
                              <Text style={[s2.catText, on && { color: colors.primary, fontFamily: 'Inter_700Bold' }]} numberOfLines={1}>{c.name}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </>
                )}

                {/* Step 4: which account? */}
                <Text style={s2.step}>{activeTab === 'Transfer' ? 'Take money from' : activeTab === 'Income' ? 'Which account got it?' : 'Paid from'}</Text>
                {renderAccountChips(selectedAccount, setSelectedAccount)}

                {activeTab === 'Transfer' && (
                  <>
                    <Text style={s2.step}>Send money to</Text>
                    {activeAccounts.length < 2
                      ? <Text style={s2.hint}>You need at least two accounts to move money.</Text>
                      : renderAccountChips(selectedToAccount, setSelectedToAccount, selectedAccount?.id)}
                  </>
                )}

                {/* Step 5: when? */}
                <Text style={s2.step}>When?</Text>
                <View style={s2.chipRow}>
                  <Pressable style={[s2.chip, isToday(selectedDate) && s2.chipOn]} onPress={() => setSelectedDate(new Date())}>
                    <Text style={[s2.chipText, isToday(selectedDate) && s2.chipTextOn]}>Today</Text>
                  </Pressable>
                  <Pressable style={[s2.chip, isYesterday && s2.chipOn]} onPress={() => setSelectedDate(yesterday)}>
                    <Text style={[s2.chipText, isYesterday && s2.chipTextOn]}>Yesterday</Text>
                  </Pressable>
                  <Pressable style={[s2.chip, isCustomDate && s2.chipOn]} onPress={() => setShowDatePicker(true)}>
                    <MaterialIcons name="calendar-today" size={14} color={isCustomDate ? colors.onPrimary : colors.onSurfaceVariant} />
                    <Text style={[s2.chipText, isCustomDate && s2.chipTextOn]}>
                      {isCustomDate ? selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Pick date'}
                    </Text>
                  </Pressable>
                </View>
                {showDatePicker && (
                  <View style={{ alignItems: 'center' }}>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      maximumDate={new Date()}
                      onChange={(_, date) => {
                        if (Platform.OS === 'android') setShowDatePicker(false);
                        if (date) setSelectedDate(date);
                      }}
                    />
                    {Platform.OS === 'ios' && (
                      <Pressable style={[styles.primaryBtn, { height: 40, width: '90%' }]} onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.primaryBtnText}>Done</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* Optional details */}
                {activeTab !== 'Transfer' && (
                  <>
                    <Text style={s2.step}>{activeTab === 'Income' ? 'Received from (optional)' : 'Paid to (optional)'}</Text>
                    <TextInput
                      style={s2.input}
                      value={merchantName}
                      onChangeText={setMerchantName}
                      placeholder={activeTab === 'Income' ? 'e.g. Company, Rent, Client' : 'e.g. Swiggy, Grocery shop, Petrol pump'}
                      placeholderTextColor={colors.outline}
                    />
                  </>
                )}
                {showNote ? (
                  <>
                    <Text style={s2.step}>Note (optional)</Text>
                    <TextInput style={s2.input} value={note} onChangeText={setNote} placeholder="Anything to remember?" placeholderTextColor={colors.outline} />
                  </>
                ) : (
                  <Pressable onPress={() => setShowNote(true)} style={s2.addNote}>
                    <MaterialIcons name="add" size={16} color={colors.primary} />
                    <Text style={s2.addNoteText}>Add a note</Text>
                  </Pressable>
                )}
              </ScrollView>

              {/* Plain-language summary + save */}
              <View style={styles.footer}>
                {!!parseFloat(amount) && (
                  <Text style={s2.summary} numberOfLines={1}>
                    {meta.verb} ₹{(parseFloat(amount) || 0).toLocaleString('en-IN')}
                    {activeTab !== 'Transfer' && selectedCategory ? ` on ${selectedCategory.name}` : ''}
                    {selectedAccount ? ` · ${selectedAccount.name}` : ''}
                  </Text>
                )}
                <Pressable
                  style={[styles.primaryBtn, { backgroundColor: meta.color }, isSubmitting && { opacity: 0.7 }]}
                  onPress={validateAndSave}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryBtnText}>{saveLabel}</Text>}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const s2 = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.surfaceContainer },
  tabText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.onSurface },
  step: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.onSurface, marginTop: 18, marginBottom: 10 },
  amountBox: { backgroundColor: colors.surfaceContainerLow, borderRadius: 16, paddingVertical: 10 },
  quickAmounts: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickAmt: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surfaceContainer },
  quickAmtText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.onSurfaceVariant },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: { width: '23%', alignItems: 'center', gap: 6, paddingVertical: 10, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  catOn: { borderColor: colors.primaryContainer, backgroundColor: colors.surfaceContainerLow },
  catIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant, paddingHorizontal: 2 },
  chipRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.surfaceContainer, maxWidth: 200 },
  chipOn: { backgroundColor: colors.primaryContainer },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.onSurface },
  chipTextOn: { color: colors.onPrimary },
  input: { height: 50, borderRadius: 14, paddingHorizontal: 14, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant, fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.onSurface },
  hint: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant },
  addNote: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16 },
  addNoteText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primary },
  summary: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: 10 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  dragHandle: {
    width: 40, height: 4,
    backgroundColor: 'rgba(193,200,194,0.6)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  headerTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: colors.onSurface },
  closeButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  segmentBg: {
    backgroundColor: colors.surfaceContainer,
    padding: 4, borderRadius: 12,
    flexDirection: 'row', marginBottom: 16,
  },
  segmentTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segmentTabActive: {
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 2, elevation: 1,
  },
  segmentTabText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.onSurfaceVariant },
  segmentTabTextActive: { color: colors.primary },
  loadingText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant },
  warningBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fef3c7', borderRadius: 10, padding: 12, marginBottom: 10,
  },
  warningText: {
    fontFamily: 'Inter_400Regular', fontSize: 12,
    color: '#92400e', flex: 1, lineHeight: 18,
  },
  amountSection: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', marginBottom: 20, gap: 8,
  },
  currencySymbol: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 32, color: colors.primary, marginTop: -4 },
  amountInput: {
    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 48,
    color: colors.primary, minWidth: 100, padding: 0, textAlign: 'center',
  },
  fieldsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: 'rgba(193,200,194,0.4)',
    borderRadius: 20, overflow: 'hidden', marginBottom: 20,
  },
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(193,200,194,0.3)',
  },
  fieldLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  fieldIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant, marginBottom: 1 },
  fieldValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.onSurface },
  fieldSubValue: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.onSurfaceVariant },
  noteInput: {
    fontFamily: 'Inter_500Medium', fontSize: 14,
    color: colors.onSurface, padding: 0, marginTop: 2,
  },
  footer: { marginTop: 'auto' },
  primaryBtn: {
    backgroundColor: colors.primary, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, color: colors.onPrimary },
  // Selector
  selectorOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 100 },
  selectorSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  selectorItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, gap: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(193,200,194,0.2)',
  },
  selectorItemSelected: { backgroundColor: 'rgba(192,236,214,0.15)' },
  selectorEmpty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  selectorEmptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.onSurface },
  selectorEmptyDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.onSurfaceVariant, textAlign: 'center' },
});
