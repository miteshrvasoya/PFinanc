import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '../../../src/api/accounts';
import { transfersApi } from '../../../src/api/transfers';
import { Button, Input } from '../../../src/components/ui';
import { Colors, Spacing, Typography } from '../../../src/theme';
import { formatINR } from '../../../src/utils/currency';
import { toISODateString } from '../../../src/utils/date';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TransferScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: '',
    date: toISODateString(),
    notes: '',
  });

  const { data: accountsData } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.getAll });
  const accounts = accountsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: transfersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      Alert.alert('Transfer Created', 'Your transfer has been recorded successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => Alert.alert('Error', err.displayMessage ?? 'Transfer failed'),
  });

  const handleSubmit = () => {
    if (!form.from_account_id || !form.to_account_id) {
      Alert.alert('Select Accounts', 'Please select both source and destination accounts.');
      return;
    }
    if (form.from_account_id === form.to_account_id) {
      Alert.alert('Invalid', 'Source and destination accounts cannot be the same.');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid transfer amount.');
      return;
    }
    createMutation.mutate({
      from_account_id: form.from_account_id,
      to_account_id: form.to_account_id,
      amount: parseFloat(form.amount),
      date: form.date,
      notes: form.notes.trim() || undefined,
    });
  };

  const fromAccount = accounts.find((a: any) => a.id === form.from_account_id);
  const toAccount = accounts.find((a: any) => a.id === form.to_account_id);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Transfer</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Visual Transfer Flow */}
          <View style={styles.flowCard}>
            <View style={styles.flowAccount}>
              <Text style={styles.flowLabel}>From</Text>
              <View style={[styles.flowAcctBox, !form.from_account_id && styles.flowAcctEmpty]}>
                <MaterialCommunityIcons name="bank" size={18} color={form.from_account_id ? Colors.danger : Colors.onSurfaceSubtle} />
                <Text style={[styles.flowAcctName, !form.from_account_id && { color: Colors.onSurfaceSubtle }]} numberOfLines={1}>
                  {fromAccount?.name ?? 'Select Account'}
                </Text>
              </View>
              {fromAccount && (
                <Text style={styles.flowBalance}>{formatINR(fromAccount.balance)}</Text>
              )}
            </View>

            <View style={styles.flowArrow}>
              <MaterialCommunityIcons name="arrow-right-circle" size={32} color={Colors.secondary} />
              {form.amount ? (
                <Text style={styles.flowAmount}>{formatINR(parseFloat(form.amount))}</Text>
              ) : null}
            </View>

            <View style={styles.flowAccount}>
              <Text style={styles.flowLabel}>To</Text>
              <View style={[styles.flowAcctBox, !form.to_account_id && styles.flowAcctEmpty]}>
                <MaterialCommunityIcons name="bank" size={18} color={form.to_account_id ? Colors.success : Colors.onSurfaceSubtle} />
                <Text style={[styles.flowAcctName, !form.to_account_id && { color: Colors.onSurfaceSubtle }]} numberOfLines={1}>
                  {toAccount?.name ?? 'Select Account'}
                </Text>
              </View>
              {toAccount && (
                <Text style={styles.flowBalance}>{formatINR(toAccount.balance)}</Text>
              )}
            </View>
          </View>

          {/* From Account */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Source Account *</Text>
            <View style={styles.acctPills}>
              {accounts.map((acc: any) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.acctPill,
                    form.from_account_id === acc.id && styles.acctPillFrom,
                    form.to_account_id === acc.id && styles.acctPillDisabled,
                  ]}
                  onPress={() => {
                    if (form.to_account_id === acc.id) return;
                    setForm((f) => ({ ...f, from_account_id: acc.id }));
                  }}
                  disabled={form.to_account_id === acc.id}
                >
                  <Text style={[
                    styles.acctPillText,
                    form.from_account_id === acc.id && styles.acctPillTextActive,
                  ]} numberOfLines={1}>
                    {acc.name}
                  </Text>
                  <Text style={styles.acctPillBalance}>{formatINR(acc.balance, { compact: true })}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* To Account */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Destination Account *</Text>
            <View style={styles.acctPills}>
              {accounts.map((acc: any) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.acctPill,
                    form.to_account_id === acc.id && styles.acctPillTo,
                    form.from_account_id === acc.id && styles.acctPillDisabled,
                  ]}
                  onPress={() => {
                    if (form.from_account_id === acc.id) return;
                    setForm((f) => ({ ...f, to_account_id: acc.id }));
                  }}
                  disabled={form.from_account_id === acc.id}
                >
                  <Text style={[
                    styles.acctPillText,
                    form.to_account_id === acc.id && styles.acctPillTextActive,
                  ]} numberOfLines={1}>
                    {acc.name}
                  </Text>
                  <Text style={styles.acctPillBalance}>{formatINR(acc.balance, { compact: true })}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input
            label="Amount (₹) *"
            value={form.amount}
            onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))}
            keyboardType="decimal-pad"
            prefix="₹"
            placeholder="0.00"
          />
          <Input
            label="Date"
            value={form.date}
            onChangeText={(v) => setForm((f) => ({ ...f, date: v }))}
            placeholder="YYYY-MM-DD"
          />
          <Input
            label="Notes (optional)"
            value={form.notes}
            onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
            placeholder="Transfer reason..."
            multiline
          />

          <Button
            label="Confirm Transfer"
            fullWidth
            loading={createMutation.isPending}
            onPress={handleSubmit}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.layoutMargin, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface,
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  content: { padding: Spacing.layoutMargin, gap: Spacing.base, paddingBottom: 40 },
  flowCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.base, gap: Spacing.sm,
  },
  flowAccount: { flex: 1, gap: 6, alignItems: 'center' },
  flowLabel: { ...Typography.labelSm, color: Colors.onSurfaceMuted, textTransform: 'uppercase', letterSpacing: 1 },
  flowAcctBox: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceDim, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 8, width: '100%',
  },
  flowAcctEmpty: { borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  flowAcctName: { ...Typography.labelMd, color: Colors.onSurface, flex: 1 },
  flowBalance: { ...Typography.labelSm, color: Colors.onSurfaceMuted, fontVariant: ['tabular-nums'] },
  flowArrow: { alignItems: 'center', gap: 4 },
  flowAmount: { ...Typography.labelMd, color: Colors.secondary, fontVariant: ['tabular-nums'] },
  fieldGroup: { gap: Spacing.xs },
  fieldLabel: { ...Typography.labelMd, color: Colors.onSurface },
  acctPills: { gap: Spacing.sm },
  acctPill: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
    borderRadius: Spacing.buttonRadius, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, minHeight: 44,
  },
  acctPillFrom: { backgroundColor: Colors.dangerBg, borderColor: Colors.danger },
  acctPillTo: { backgroundColor: Colors.successBg, borderColor: Colors.success },
  acctPillDisabled: { opacity: 0.4 },
  acctPillText: { ...Typography.bodyMd, color: Colors.onSurface, flex: 1 },
  acctPillTextActive: { fontFamily: 'Inter_600SemiBold' },
  acctPillBalance: { ...Typography.labelSm, color: Colors.onSurfaceMuted, fontVariant: ['tabular-nums'] },
  submitBtn: { marginTop: Spacing.sm },
});
