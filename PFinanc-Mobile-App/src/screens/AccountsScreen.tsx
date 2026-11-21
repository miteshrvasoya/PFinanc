import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, ActivityIndicator, Alert, RefreshControl, Switch, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';

interface Account {
  id: string;
  name: string;
  account_type: 'BANK' | 'CASH' | 'CREDIT_CARD' | 'INVESTMENT' | 'OTHER';
  bank_name?: string;
  account_number_last4?: string;
  current_balance: number;
  currency: string;
  is_active: boolean;
  include_in_net_worth: boolean;
  color?: string;
  notes?: string;
  created_at: string;
}

const ACCOUNT_TYPE_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  BANK:         { icon: 'account-balance', label: 'Bank Account',   color: colors.primary,   bg: colors.primaryFixed },
  CASH:         { icon: 'payments',        label: 'Cash / Wallet',  color: '#b45309',        bg: '#fef3c7' },
  CREDIT_CARD:  { icon: 'credit-card',     label: 'Credit Card',    color: colors.error,     bg: colors.errorContainer },
  INVESTMENT:   { icon: 'trending-up',     label: 'Investment',     color: '#0f766e',        bg: '#ccfbf1' },
  OTHER:        { icon: 'wallet',          label: 'Other',          color: colors.outline,   bg: colors.surfaceContainerHigh },
};

const ACCOUNT_TYPES = ['BANK', 'CASH', 'CREDIT_CARD', 'INVESTMENT', 'OTHER'] as const;

interface AccountFormState {
  name: string;
  account_type: typeof ACCOUNT_TYPES[number];
  bank_name: string;
  account_number_last4: string;
  current_balance: string;
  currency: string;
  include_in_net_worth: boolean;
  notes: string;
}

const EMPTY_FORM: AccountFormState = {
  name: '',
  account_type: 'BANK',
  bank_name: '',
  account_number_last4: '',
  current_balance: '',
  currency: 'INR',
  include_in_net_worth: true,
  notes: '',
};

interface AccountsScreenProps {
  onBack?: () => void;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [isPrivacyMasked, setIsPrivacyMasked] = useState(false);

  const fetchAccounts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await apiClient.get('/api/accounts');
      if (res && res.success && Array.isArray(res.data)) {
        setAccounts(res.data);
      } else if (res && res.success && Array.isArray(res.data?.accounts)) {
        setAccounts(res.data.accounts);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (!msg.includes('JSON') && !msg.includes('404') && !msg.includes('not found')) {
        console.error('Failed to fetch accounts:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, []);

  const openAddModal = () => {
    setEditingAccount(null);
    setForm(EMPTY_FORM);
    setIsModalVisible(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setForm({
      name: account.name,
      account_type: account.account_type,
      bank_name: account.bank_name || '',
      account_number_last4: account.account_number_last4 || '',
      current_balance: account.current_balance.toString(),
      currency: account.currency || 'INR',
      include_in_net_worth: account.include_in_net_worth,
      notes: account.notes || '',
    });
    setIsModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Account name is required.');
      return;
    }
    if (!form.current_balance || isNaN(Number(form.current_balance))) {
      Alert.alert('Validation', 'Please enter a valid balance.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      account_type: form.account_type,
      bank_name: form.bank_name.trim() || null,
      account_number_last4: form.account_number_last4.trim().slice(-4) || null,
      current_balance: Number(form.current_balance),
      currency: form.currency || 'INR',
      include_in_net_worth: form.include_in_net_worth,
      notes: form.notes.trim() || null,
    };

    setSubmitting(true);
    try {
      let res;
      if (editingAccount) {
        res = await apiClient.put(`/api/accounts/${editingAccount.id}`, payload);
      } else {
        res = await apiClient.post('/api/accounts', payload);
      }
      if (res.success) {
        setIsModalVisible(false);
        fetchAccounts();
        Alert.alert('Success', editingAccount ? 'Account updated.' : 'Account added.');
      } else {
        throw new Error(res.message || 'Failed');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (account: Account) => {
    Alert.alert(
      `Delete "${account.name}"`,
      'This will permanently delete this account and all its transactions. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/api/accounts/${account.id}`);
              fetchAccounts();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not delete account');
            }
          }
        }
      ]
    );
  };

  const handleToggleActive = async (account: Account) => {
    try {
      await apiClient.put(`/api/accounts/${account.id}`, {
        ...account,
        is_active: !account.is_active,
      });
      setAccounts(prev =>
        prev.map(a => a.id === account.id ? { ...a, is_active: !a.is_active } : a)
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update account');
    }
  };

  const formatBalance = (val: number) => {
    if (isPrivacyMasked) return '₹••••••';
    return `₹${Math.abs(val).toLocaleString('en-IN')}`;
  };

  const totalBalance = accounts
    .filter(a => a.is_active && a.include_in_net_worth)
    .reduce((sum, a) => sum + (a.current_balance || 0), 0);

  const activeAccounts = accounts.filter(a => a.is_active);
  const inactiveAccounts = accounts.filter(a => !a.is_active);

  const renderAccount = (account: Account) => {
    const meta = ACCOUNT_TYPE_META[account.account_type] || ACCOUNT_TYPE_META.OTHER;
    const isNegative = account.current_balance < 0;
    return (
      <View key={account.id} style={[styles.accountCard, !account.is_active && styles.accountCardInactive]}>
        <View style={styles.accountTop}>
          <View style={[styles.accountIconWrapper, { backgroundColor: meta.bg }]}>
            <MaterialIcons name={meta.icon as any} size={22} color={meta.color} />
          </View>
          <View style={styles.accountInfo}>
            <Text style={[styles.accountName, !account.is_active && styles.textMuted]}>{account.name}</Text>
            <Text style={styles.accountMeta}>
              {meta.label}{account.bank_name ? ` · ${account.bank_name}` : ''}
              {account.account_number_last4 ? ` ····${account.account_number_last4}` : ''}
            </Text>
          </View>
          <View style={styles.accountRight}>
            <Text style={[styles.accountBalance, isNegative && styles.balanceNegative]}>
              {isNegative ? '-' : ''}{formatBalance(account.current_balance)}
            </Text>
            {!account.include_in_net_worth && (
              <Text style={styles.excludedBadge}>Excluded</Text>
            )}
          </View>
        </View>

        <View style={styles.accountActions}>
          <Pressable style={styles.accountActionBtn} onPress={() => openEditModal(account)}>
            <MaterialIcons name="edit" size={14} color={colors.primary} />
            <Text style={styles.accountActionText}>Edit</Text>
          </Pressable>
          <View style={styles.actionDivider} />
          <Pressable style={styles.accountActionBtn} onPress={() => handleToggleActive(account)}>
            <MaterialIcons
              name={account.is_active ? 'toggle-off' : 'toggle-on'}
              size={14}
              color={account.is_active ? colors.onSurfaceVariant : colors.primary}
            />
            <Text style={[styles.accountActionText, { color: account.is_active ? colors.onSurfaceVariant : colors.primary }]}>
              {account.is_active ? 'Disable' : 'Enable'}
            </Text>
          </Pressable>
          <View style={styles.actionDivider} />
          <Pressable style={styles.accountActionBtn} onPress={() => handleDelete(account)}>
            <MaterialIcons name="delete-outline" size={14} color={colors.error} />
            <Text style={[styles.accountActionText, { color: colors.error }]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Bank Accounts</Text>
            <Text style={styles.headerSubtitle}>{accounts.length} total · {activeAccounts.length} active</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconBtn} onPress={() => setIsPrivacyMasked(p => !p)}>
            <MaterialIcons name={isPrivacyMasked ? 'visibility-off' : 'visibility'} size={20} color={colors.primary} />
          </Pressable>
          <Pressable style={styles.addBtn} onPress={openAddModal}>
            <MaterialIcons name="add" size={18} color={colors.onPrimary} />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading accounts...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchAccounts(true)} tintColor={colors.primary} />
          }
        >
          {/* Summary Banner */}
          <View style={styles.summaryBanner}>
            <View>
              <Text style={styles.summaryLabel}>TOTAL NET BALANCE</Text>
              <Text style={styles.summaryValue}>
                {isPrivacyMasked ? '₹••••••' : `₹${Math.abs(totalBalance).toLocaleString('en-IN')}`}
              </Text>
              <Text style={styles.summaryNote}>Across {activeAccounts.length} active accounts · Net-worth included only</Text>
            </View>
            <View style={styles.summaryIconBox}>
              <MaterialIcons name="account-balance" size={28} color={colors.primaryFixed} />
            </View>
          </View>

          {/* Active Accounts */}
          {activeAccounts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ACTIVE ACCOUNTS</Text>
              {activeAccounts.map(renderAccount)}
            </View>
          )}

          {/* Inactive */}
          {inactiveAccounts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>INACTIVE / ARCHIVED</Text>
              {inactiveAccounts.map(renderAccount)}
            </View>
          )}

          {accounts.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrapper}>
                <MaterialIcons name="account-balance" size={36} color={colors.primaryContainer} />
              </View>
              <Text style={styles.emptyTitle}>No accounts yet</Text>
              <Text style={styles.emptySubtitle}>Add your first bank account, cash wallet, or credit card to start tracking.</Text>
              <Pressable style={styles.emptyAddBtn} onPress={openAddModal}>
                <MaterialIcons name="add" size={16} color={colors.onPrimary} />
                <Text style={styles.emptyAddBtnText}>Add First Account</Text>
              </Pressable>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingAccount ? 'Edit Account' : 'Add New Account'}</Text>
              <Pressable onPress={() => setIsModalVisible(false)} style={styles.modalCloseBtn}>
                <MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              {/* Account Type Selector */}
              <Text style={styles.fieldLabel}>Account Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
                {ACCOUNT_TYPES.map(type => {
                  const meta = ACCOUNT_TYPE_META[type];
                  const isSelected = form.account_type === type;
                  return (
                    <Pressable
                      key={type}
                      style={[styles.typeChip, isSelected && styles.typeChipActive]}
                      onPress={() => setForm(f => ({ ...f, account_type: type }))}
                    >
                      <MaterialIcons name={meta.icon as any} size={16} color={isSelected ? colors.onPrimary : colors.onSurfaceVariant} />
                      <Text style={[styles.typeChipText, isSelected && styles.typeChipTextActive]}>{meta.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Account Name */}
              <Text style={styles.fieldLabel}>Account Name *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="e.g. HDFC Savings, Petty Cash"
                placeholderTextColor={colors.outline}
              />

              {/* Bank Name */}
              {(form.account_type === 'BANK' || form.account_type === 'CREDIT_CARD') && (
                <>
                  <Text style={styles.fieldLabel}>Bank Name</Text>
                  <TextInput
                    style={styles.input}
                    value={form.bank_name}
                    onChangeText={v => setForm(f => ({ ...f, bank_name: v }))}
                    placeholder="e.g. HDFC Bank, ICICI Bank"
                    placeholderTextColor={colors.outline}
                  />
                  <Text style={styles.fieldLabel}>Last 4 Digits</Text>
                  <TextInput
                    style={styles.input}
                    value={form.account_number_last4}
                    onChangeText={v => setForm(f => ({ ...f, account_number_last4: v.replace(/\D/g, '').slice(0, 4) }))}
                    placeholder="e.g. 5678"
                    placeholderTextColor={colors.outline}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </>
              )}

              {/* Balance */}
              <Text style={styles.fieldLabel}>Current Balance *</Text>
              <View style={styles.inputRow}>
                <View style={styles.currencyPrefix}>
                  <Text style={styles.currencyPrefixText}>₹</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  value={form.current_balance}
                  onChangeText={v => setForm(f => ({ ...f, current_balance: v }))}
                  placeholder="0.00"
                  placeholderTextColor={colors.outline}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Notes */}
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={form.notes}
                onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                placeholder="Optional notes about this account..."
                placeholderTextColor={colors.outline}
                multiline
                numberOfLines={3}
              />

              {/* Include in Net Worth */}
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Include in Net Worth</Text>
                  <Text style={styles.switchDesc}>Count this account's balance toward your total net worth calculation</Text>
                </View>
                <Switch
                  value={form.include_in_net_worth}
                  onValueChange={v => setForm(f => ({ ...f, include_in_net_worth: v }))}
                  trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
                  thumbColor={form.include_in_net_worth ? colors.onPrimary : colors.surfaceContainerLowest}
                />
              </View>

              <Pressable style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <>
                    <MaterialIcons name={editingAccount ? 'save' : 'add-circle'} size={18} color={colors.onPrimary} />
                    <Text style={styles.submitBtnText}>{editingAccount ? 'Save Changes' : 'Add Account'}</Text>
                  </>
                )}
              </Pressable>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: colors.onSurface },
  headerSubtitle: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.onSurfaceVariant },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: colors.primary, borderRadius: 20,
  },
  addBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.onPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant, marginTop: 12 },
  scrollContent: { padding: 16, gap: 16 },
  summaryBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    borderRadius: 20, padding: 20,
  },
  summaryLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 0.5, color: 'rgba(164,208,187,0.7)', marginBottom: 4 },
  summaryValue: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28, color: colors.primaryFixed, letterSpacing: -1 },
  summaryNote: { fontFamily: 'Inter_400Regular', fontSize: 11, color: 'rgba(164,208,187,0.6)', marginTop: 4 },
  summaryIconBox: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(192,236,214,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  section: { gap: 10 },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold', fontSize: 10,
    letterSpacing: 0.8, color: colors.onSurfaceVariant,
    paddingHorizontal: 4,
  },
  accountCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  accountCardInactive: { opacity: 0.6 },
  accountTop: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  accountIconWrapper: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  accountInfo: { flex: 1 },
  accountName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.onSurface },
  accountMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.onSurfaceVariant, marginTop: 2 },
  accountRight: { alignItems: 'flex-end' },
  accountBalance: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: colors.primary, letterSpacing: -0.5 },
  balanceNegative: { color: colors.error },
  excludedBadge: {
    fontFamily: 'Inter_500Medium', fontSize: 9, color: colors.onSurfaceVariant,
    backgroundColor: colors.surfaceContainerHigh, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8, marginTop: 4,
  },
  textMuted: { color: colors.onSurfaceVariant },
  accountActions: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  accountActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10,
  },
  accountActionText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.primary },
  actionDivider: { width: 1, height: 18, backgroundColor: colors.outlineVariant },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyIconWrapper: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primaryFixed, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 17, color: colors.onSurface, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16,
  },
  emptyAddBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.onPrimary },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 20,
  },
  modalHandle: { width: 36, height: 4, backgroundColor: colors.outlineVariant, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  modalTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: colors.onSurface },
  modalCloseBtn: { padding: 4 },
  modalScroll: { padding: 20 },
  fieldLabel: {
    fontFamily: 'Inter_600SemiBold', fontSize: 11,
    color: colors.onSurfaceVariant, letterSpacing: 0.3,
    marginBottom: 6, marginTop: 14,
  },
  typeRow: { flexDirection: 'row', marginBottom: 4 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, marginRight: 8,
    borderWidth: 1, borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.onSurfaceVariant },
  typeChipTextActive: { color: colors.onPrimary },
  input: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.onSurface,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputFlex: { flex: 1 },
  currencyPrefix: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  currencyPrefixText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.primary },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12, borderWidth: 1, borderColor: colors.outlineVariant,
    gap: 12,
  },
  switchInfo: { flex: 1 },
  switchLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.onSurface },
  switchDesc: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.onSurfaceVariant, marginTop: 2, lineHeight: 16 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, paddingVertical: 15, borderRadius: 16, marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.onPrimary },
});
