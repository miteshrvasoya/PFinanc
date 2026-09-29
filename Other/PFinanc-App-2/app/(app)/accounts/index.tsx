import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { accountsApi } from '../../../src/api/accounts';
import { AccountCard } from '../../../src/components/accounts/AccountCard';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { Button, Input } from '../../../src/components/ui';
import { Colors, Spacing, Typography } from '../../../src/theme';
import { formatINR } from '../../../src/utils/currency';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ACCOUNT_TYPES = ['SAVINGS', 'CURRENT', 'CREDIT_CARD', 'INVESTMENT', 'CASH', 'WALLET'];

export default function AccountsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    account_type: 'SAVINGS',
    opening_balance: '',
    institution_name: '',
    account_number_last4: '',
  });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => Alert.alert('Error', err.displayMessage ?? 'Failed to create account'),
  });

  const resetForm = () =>
    setForm({ name: '', account_type: 'SAVINGS', opening_balance: '', institution_name: '', account_number_last4: '' });

  const handleCreate = () => {
    if (!form.name.trim()) {
      Alert.alert('Required', 'Account name is required.');
      return;
    }
    createMutation.mutate({
      name: form.name.trim(),
      account_type: form.account_type,
      opening_balance: parseFloat(form.opening_balance || '0'),
      institution_name: form.institution_name.trim() || undefined,
      account_number_last4: form.account_number_last4.trim() || undefined,
    });
  };

  const accounts = data?.data ?? [];
  const totalBalance = accounts.reduce((s: number, a: any) => s + (parseFloat(a.balance) || 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Accounts</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <MaterialCommunityIcons name="plus" size={20} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* Total Balance Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>Total Balance</Text>
        <Text style={styles.bannerAmount}>{formatINR(totalBalance)}</Text>
        <Text style={styles.bannerSub}>{accounts.length} account{accounts.length !== 1 ? 's' : ''}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.secondary} />
        }
      >
        {isLoading
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
          : accounts.length === 0
          ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="bank-outline" size={56} color={Colors.onSurfaceSubtle} />
              <Text style={styles.emptyTitle}>No accounts yet</Text>
              <Text style={styles.emptyText}>Add your bank accounts, wallets, and investment accounts</Text>
              <Button label="Add First Account" onPress={() => setShowAddModal(true)} style={styles.emptyBtn} />
            </View>
          )
          : accounts.map((acc: any) => (
            <TouchableOpacity
              key={acc.id}
              onPress={() => router.push(`/(app)/accounts/${acc.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.accountRow}>
                <View style={styles.accountRowLeft}>
                  <View style={[styles.acctIcon, { backgroundColor: '#3B82F618' }]}>
                    <MaterialCommunityIcons name="bank" size={20} color={Colors.secondary} />
                  </View>
                  <View style={styles.acctInfo}>
                    <Text style={styles.acctName}>{acc.name}</Text>
                    <Text style={styles.acctMeta}>
                      {acc.account_type.replace('_', ' ')}
                      {acc.institution_name ? ` · ${acc.institution_name}` : ''}
                      {acc.account_number_last4 ? ` ····${acc.account_number_last4}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={styles.acctRight}>
                  <Text style={[
                    styles.acctBalance,
                    { color: parseFloat(acc.balance) < 0 ? Colors.danger : Colors.onSurface }
                  ]}>
                    {formatINR(acc.balance)}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.onSurfaceSubtle} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        }
      </ScrollView>

      {/* Add Account Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Account</Text>
            <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.onSurface} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Input
                label="Account Name *"
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="e.g. HDFC Savings"
              />

              {/* Account Type */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Account Type</Text>
                <View style={styles.typeGrid}>
                  {ACCOUNT_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeChip, form.account_type === t && styles.typeChipActive]}
                      onPress={() => setForm((f) => ({ ...f, account_type: t }))}
                    >
                      <Text style={[styles.typeChipLabel, form.account_type === t && styles.typeChipLabelActive]}>
                        {t.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Input
                label="Opening Balance (₹)"
                value={form.opening_balance}
                onChangeText={(v) => setForm((f) => ({ ...f, opening_balance: v }))}
                keyboardType="decimal-pad"
                prefix="₹"
                placeholder="0.00"
              />
              <Input
                label="Bank / Institution"
                value={form.institution_name}
                onChangeText={(v) => setForm((f) => ({ ...f, institution_name: v }))}
                placeholder="e.g. HDFC Bank"
              />
              <Input
                label="Last 4 Digits (optional)"
                value={form.account_number_last4}
                onChangeText={(v) => setForm((f) => ({ ...f, account_number_last4: v.slice(0, 4) }))}
                keyboardType="number-pad"
                placeholder="1234"
                maxLength={4}
              />

              <Button
                label="Add Account"
                fullWidth
                loading={createMutation.isPending}
                onPress={handleCreate}
                style={{ marginTop: Spacing.sm }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.layoutMargin,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  title: { ...Typography.headlineMd, color: Colors.onSurface },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  banner: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.layoutMargin,
    paddingVertical: Spacing.xl,
    gap: 4,
  },
  bannerLabel: { ...Typography.labelMd, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 },
  bannerAmount: {
    fontFamily: 'Inter_700Bold', fontSize: 32, letterSpacing: -0.64,
    color: Colors.onPrimary, fontVariant: ['tabular-nums'],
  },
  bannerSub: { ...Typography.bodySm, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  scroll: { flex: 1 },
  content: { padding: Spacing.layoutMargin, gap: Spacing.sm, paddingBottom: 32 },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    minHeight: 68,
  },
  accountRowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  acctIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  acctInfo: { flex: 1, gap: 3 },
  acctName: { ...Typography.bodyMd, fontFamily: 'Inter_600SemiBold', color: Colors.onSurface },
  acctMeta: { ...Typography.labelSm, color: Colors.onSurfaceMuted },
  acctRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  acctBalance: { ...Typography.numericData, fontVariant: ['tabular-nums'] },
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { ...Typography.headlineMd, color: Colors.onSurface },
  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceMuted, textAlign: 'center', maxWidth: 260 },
  emptyBtn: { marginTop: 8 },
  // Modal
  modalSafe: { flex: 1, backgroundColor: Colors.surface },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.layoutMargin, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { ...Typography.headlineMd, color: Colors.onSurface },
  modalContent: { padding: Spacing.layoutMargin, gap: Spacing.md, paddingBottom: 40 },
  fieldGroup: { gap: Spacing.xs },
  fieldLabel: { ...Typography.labelMd, color: Colors.onSurface },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Spacing.pillRadius, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipLabel: { ...Typography.labelMd, color: Colors.onSurfaceMuted },
  typeChipLabelActive: { color: Colors.onPrimary },
});
