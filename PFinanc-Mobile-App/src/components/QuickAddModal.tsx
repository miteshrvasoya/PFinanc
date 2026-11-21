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
  visible, onClose, initialData, initialTab
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

  // Selector overlay state
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectorTitle, setSelectorTitle] = useState('');
  const [selectorType, setSelectorType] = useState<'account' | 'toAccount' | 'category'>('account');

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

  // ─── Open selector sheet ─────────────────────────────────────────────────────
  const openSelector = (type: 'account' | 'toAccount' | 'category') => {
    setSelectorType(type);
    const titles: Record<string, string> = {
      account: activeTab === 'Transfer' ? 'Select From Account' : 'Select Account',
      toAccount: 'Select Destination Account',
      category: 'Select Category',
    };
    setSelectorTitle(titles[type]);
    setSelectorVisible(true);
  };

  const handleSelectorSelect = (item: Account | Category) => {
    if (selectorType === 'account') setSelectedAccount(item as Account);
    else if (selectorType === 'toAccount') setSelectedToAccount(item as Account);
    else setSelectedCategory(item as Category);
    setSelectorVisible(false);
  };

  // ─── Validation helpers ───────────────────────────────────────────────────────
  const validateAndSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
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
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Selector list data ───────────────────────────────────────────────────────
  const selectorListData: (Account | Category)[] =
    selectorType === 'category' ? categories : accounts;

  const getItemIcon = (item: Account | Category): string => {
    if ('account_type' in item) {
      return item.account_type === 'BANK' ? 'account-balance'
        : item.account_type === 'CREDIT_CARD' ? 'credit-card'
        : item.account_type === 'INVESTMENT' ? 'trending-up'
        : 'account-balance-wallet';
    }
    return getMaterialIcon((item as Category).icon) || 'category';
  };

  const getItemSubtitle = (item: Account | Category): string => {
    if ('account_type' in item) {
      const a = item as Account;
      return `${a.account_type}${a.bank_name ? ` · ${a.bank_name}` : ''} · ₹${(a.current_balance || 0).toLocaleString('en-IN')}`;
    }
    return '';
  };

  const getItemColor = (item: Account | Category): string => {
    if ('color' in item && (item as Category).color) return (item as Category).color!;
    return colors.surfaceContainerHigh;
  };

  const activeAccounts = accounts.filter(a => a.is_active);
  const filteredCategories = activeTab === 'Expense'
    ? categories.filter(c => !c.category_type || c.category_type === 'EXPENSE' || c.category_type === 'BOTH')
    : activeTab === 'Income'
    ? categories.filter(c => !c.category_type || c.category_type === 'INCOME' || c.category_type === 'BOTH')
    : categories;

  const displayCategories = selectorType === 'category'
    ? (activeTab === 'Transfer' ? categories : filteredCategories)
    : [];

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>
              {isEditMode ? 'Edit Transaction' : 'New Transaction'}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {/* Tab Switcher */}
          <View style={styles.segmentBg}>
            {tabs.map(tab => {
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  style={[styles.segmentTab, isActive && styles.segmentTabActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.segmentTabText, isActive && styles.segmentTabTextActive]}>
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isLoading ? (
            <View style={{ height: 220, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading your accounts & categories...</Text>
            </View>
          ) : (
            <>
              {/* No accounts warning */}
              {activeAccounts.length === 0 && (
                <View style={styles.warningBanner}>
                  <MaterialIcons name="info" size={18} color="#b45309" />
                  <Text style={styles.warningText}>
                    No active accounts found. Go to <Text style={{ fontFamily: 'Inter_600SemiBold' }}>More → Accounts</Text> to add one.
                  </Text>
                </View>
              )}

              {/* No categories warning */}
              {activeTab !== 'Transfer' && filteredCategories.length === 0 && (
                <View style={styles.warningBanner}>
                  <MaterialIcons name="info" size={18} color="#b45309" />
                  <Text style={styles.warningText}>
                    No categories found for {activeTab}. Add categories first.
                  </Text>
                </View>
              )}

              {/* Amount */}
              <View style={styles.amountSection}>
                <Text style={[styles.currencySymbol, !amount && { color: colors.outlineVariant }]}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.outlineVariant}
                  autoFocus
                  selectionColor={colors.primary}
                />
              </View>

              {/* Fields */}
              <View style={styles.fieldsCard}>
                {/* Account */}
                <Pressable
                  style={styles.fieldRow}
                  onPress={() => openSelector('account')}
                  disabled={activeAccounts.length === 0}
                >
                  <View style={styles.fieldLeft}>
                    <View style={[styles.fieldIcon, { backgroundColor: 'rgba(192, 236, 214, 0.4)' }]}>
                      <MaterialIcons name="account-balance" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>
                        {activeTab === 'Transfer' ? 'From Account' : 'Account'}
                      </Text>
                      <Text style={[styles.fieldValue, !selectedAccount && { color: colors.outline }]}>
                        {selectedAccount
                          ? `${selectedAccount.name}${selectedAccount.bank_name ? ` · ${selectedAccount.bank_name}` : ''}`
                          : 'No accounts — add one first'}
                      </Text>
                      {selectedAccount && (
                        <Text style={styles.fieldSubValue}>
                          Balance: ₹{(selectedAccount.current_balance || 0).toLocaleString('en-IN')}
                        </Text>
                      )}
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
                </Pressable>

                {/* To Account (Transfer only) */}
                {activeTab === 'Transfer' && (
                  <Pressable
                    style={styles.fieldRow}
                    onPress={() => openSelector('toAccount')}
                    disabled={activeAccounts.length < 2}
                  >
                    <View style={styles.fieldLeft}>
                      <View style={[styles.fieldIcon, { backgroundColor: 'rgba(255, 222, 164, 0.4)' }]}>
                        <MaterialIcons name="swap-horiz" size={18} color={colors.secondary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>To Account</Text>
                        <Text style={[styles.fieldValue, !selectedToAccount && { color: colors.outline }]}>
                          {selectedToAccount
                            ? `${selectedToAccount.name}${selectedToAccount.bank_name ? ` · ${selectedToAccount.bank_name}` : ''}`
                            : activeAccounts.length < 2 ? 'Need at least 2 accounts' : 'Select Account'}
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
                  </Pressable>
                )}

                {/* Category */}
                {activeTab !== 'Transfer' && (
                  <Pressable
                    style={styles.fieldRow}
                    onPress={() => openSelector('category')}
                    disabled={filteredCategories.length === 0}
                  >
                    <View style={styles.fieldLeft}>
                      <View style={[styles.fieldIcon, { backgroundColor: selectedCategory?.color || colors.surfaceContainerHigh }]}>
                        <MaterialIcons
                          name={getMaterialIcon(selectedCategory?.icon) || 'category'}
                          size={18}
                          color={colors.onSurface}
                        />
                      </View>
                      <View>
                        <Text style={styles.fieldLabel}>Category</Text>
                        <Text style={[styles.fieldValue, !selectedCategory && { color: colors.outline }]}>
                          {selectedCategory?.name || (filteredCategories.length === 0 ? 'No categories — add one first' : 'Select Category')}
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
                  </Pressable>
                )}

                {/* Date */}
                <Pressable style={styles.fieldRow} onPress={() => setShowDatePicker(true)}>
                  <View style={styles.fieldLeft}>
                    <View style={[styles.fieldIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
                      <MaterialIcons name="calendar-today" size={18} color={colors.onSurfaceVariant} />
                    </View>
                    <View>
                      <Text style={styles.fieldLabel}>Date</Text>
                      <Text style={styles.fieldValue}>
                        {selectedDate.toDateString() === new Date().toDateString()
                          ? 'Today'
                          : selectedDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
                </Pressable>

                {showDatePicker && (
                  <View style={{ backgroundColor: colors.surfaceContainerLowest, alignItems: 'center' }}>
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
                      <Pressable
                        style={[styles.primaryBtn, { height: 40, width: '90%', marginBottom: 12 }]}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={styles.primaryBtnText}>Confirm Date</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* Merchant / Payee */}
                <View style={styles.fieldRow}>
                  <View style={styles.fieldLeft}>
                    <View style={[styles.fieldIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
                      <MaterialIcons name="storefront" size={18} color={colors.onSurfaceVariant} />
                    </View>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.fieldLabel}>Merchant / Payee (Optional)</Text>
                      <TextInput
                        style={styles.noteInput}
                        value={merchantName}
                        onChangeText={setMerchantName}
                        placeholder="e.g. Swiggy, Amazon, Salary"
                        placeholderTextColor={colors.outline}
                      />
                    </View>
                  </View>
                </View>

                {/* Note */}
                <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.fieldLeft}>
                    <View style={[styles.fieldIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
                      <MaterialIcons name="edit" size={18} color={colors.onSurfaceVariant} />
                    </View>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.fieldLabel}>Note (Optional)</Text>
                      <TextInput
                        style={styles.noteInput}
                        value={note}
                        onChangeText={setNote}
                        placeholder="Add a remark..."
                        placeholderTextColor={colors.outline}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Save Button */}
              <View style={styles.footer}>
                <Pressable
                  style={[styles.primaryBtn, isSubmitting && { opacity: 0.7 }]}
                  onPress={validateAndSave}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.onPrimary} />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {isEditMode ? 'Save Changes' : activeTab === 'Transfer' ? 'Transfer' : `Save ${activeTab}`}
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* ── Selector Sheet Overlay ── */}
        {selectorVisible && (
          <View style={styles.selectorOverlay}>
            <Pressable style={styles.backdrop} onPress={() => setSelectorVisible(false)} />
            <View style={styles.selectorSheet}>
              <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>{selectorTitle}</Text>
                <Pressable onPress={() => setSelectorVisible(false)} style={styles.closeButton}>
                  <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
                </Pressable>
              </View>

              {/* Empty state */}
              {(selectorType === 'category' ? displayCategories : activeAccounts).length === 0 ? (
                <View style={styles.selectorEmpty}>
                  <MaterialIcons name="info-outline" size={32} color={colors.outline} />
                  <Text style={styles.selectorEmptyTitle}>
                    {selectorType === 'category' ? 'No categories available' : 'No accounts available'}
                  </Text>
                  <Text style={styles.selectorEmptyDesc}>
                    {selectorType === 'category'
                      ? 'Add categories from the settings first.'
                      : 'Go to More → Accounts to add a bank account.'}
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {(selectorType === 'category' ? displayCategories : activeAccounts).map(item => {
                    const isSelected = selectorType === 'category'
                      ? selectedCategory?.id === item.id
                      : selectorType === 'toAccount'
                      ? selectedToAccount?.id === item.id
                      : selectedAccount?.id === item.id;

                    return (
                      <Pressable
                        key={item.id}
                        style={[styles.selectorItem, isSelected && styles.selectorItemSelected]}
                        onPress={() => handleSelectorSelect(item)}
                      >
                        <View style={[styles.fieldIcon, { backgroundColor: getItemColor(item) }]}>
                          <MaterialIcons
                            name={getItemIcon(item) as any}
                            size={18}
                            color={colors.onSurface}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fieldValue, isSelected && { color: colors.primary }]}>
                            {'name' in item ? (item as Category).name : (item as Account).name}
                          </Text>
                          {getItemSubtitle(item) ? (
                            <Text style={styles.fieldLabel}>{getItemSubtitle(item)}</Text>
                          ) : null}
                        </View>
                        {isSelected && (
                          <MaterialIcons name="check-circle" size={18} color={colors.primary} />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

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
