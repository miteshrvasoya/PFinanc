import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography as Typo } from '../../theme';
import { formatINR } from '../../utils/currency';
import { formatRelativeDate } from '../../utils/date';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  status: string;
  transaction_date: string;
  category_name?: string;
  category_icon?: string;
  member_name?: string;
  account_name?: string;
}

interface TransactionRowProps {
  transaction: Transaction;
  onPress?: (t: Transaction) => void;
}

const TYPE_ICON: Record<string, any> = {
  INCOME: 'arrow-down-circle',
  EXPENSE: 'arrow-up-circle',
  TRANSFER: 'swap-horizontal-circle',
};

const CATEGORY_ICONS: Record<string, string> = {
  Food: 'food',
  Transport: 'car',
  Shopping: 'shopping',
  Bills: 'lightning-bolt',
  Health: 'heart-pulse',
  Entertainment: 'television-play',
  Travel: 'airplane',
  Salary: 'briefcase',
  Investment: 'chart-line',
  Transfer: 'bank-transfer',
};

function getCategoryIcon(name?: string): string {
  if (!name) return 'circle-outline';
  const match = Object.keys(CATEGORY_ICONS).find((k) => name.toLowerCase().includes(k.toLowerCase()));
  return match ? CATEGORY_ICONS[match] : 'tag-outline';
}

export function TransactionRow({ transaction: t, onPress }: TransactionRowProps) {
  const isIncome = t.type === 'INCOME';
  const isTransfer = t.type === 'TRANSFER';
  const amountColor = isIncome ? Colors.success : isTransfer ? Colors.transfer : Colors.onSurface;
  const amountPrefix = isIncome ? '+' : isTransfer ? '' : '-';
  const iconName = t.category_icon ?? getCategoryIcon(t.category_name);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress?.(t)}
      activeOpacity={0.7}
    >
      {/* Category icon */}
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={iconName as any} size={20} color={Colors.onSurfaceMuted} />
      </View>

      {/* Center block */}
      <View style={styles.center}>
        <Text style={styles.description} numberOfLines={1}>{t.description}</Text>
        <Text style={styles.meta}>
          {formatRelativeDate(t.transaction_date)}
          {t.member_name ? ` · ${t.member_name}` : ''}
          {t.category_name ? ` · ${t.category_name}` : ''}
        </Text>
      </View>

      {/* Amount */}
      <Text style={[styles.amount, { color: amountColor }]}>
        {amountPrefix}{formatINR(Math.abs(t.amount))}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    minHeight: Spacing.listRowMinHeight,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconWrap: {
    width: Spacing.avatarMd,
    height: Spacing.avatarMd,
    borderRadius: 10,
    backgroundColor: Colors.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, gap: 3 },
  description: {
    ...Typo.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  meta: {
    ...Typo.labelSm,
    color: Colors.onSurfaceMuted,
  },
  amount: {
    ...Typo.numericData,
    fontVariant: ['tabular-nums'],
  },
});
