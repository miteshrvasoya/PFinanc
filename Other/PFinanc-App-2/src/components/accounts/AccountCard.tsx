import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../ui/Card';
import { Colors, Spacing, Typography } from '../../theme';
import { formatINR } from '../../utils/currency';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  SAVINGS: 'bank',
  CURRENT: 'bank-outline',
  CREDIT_CARD: 'credit-card',
  INVESTMENT: 'chart-line',
  CASH: 'cash',
  WALLET: 'wallet',
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  SAVINGS: '#3B82F6',
  CURRENT: '#6366F1',
  CREDIT_CARD: '#EF4444',
  INVESTMENT: '#10B981',
  CASH: '#F59E0B',
  WALLET: '#8B5CF6',
};

interface AccountCardProps {
  account: {
    id: string;
    name: string;
    account_type: string;
    balance: number;
    member_name?: string;
    institution_name?: string;
  };
  onPress?: () => void;
}

export function AccountCard({ account, onPress }: AccountCardProps) {
  const icon = ACCOUNT_TYPE_ICONS[account.account_type] ?? 'bank';
  const iconColor = ACCOUNT_TYPE_COLORS[account.account_type] ?? Colors.secondary;
  const isNegative = account.balance < 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.card} elevation={1}>
        <View style={styles.top}>
          <View style={[styles.iconWrap, { backgroundColor: iconColor + '18' }]}>
            <MaterialCommunityIcons name={icon as any} size={22} color={iconColor} />
          </View>
          {account.member_name ? (
            <View style={styles.memberPill}>
              <Text style={styles.memberText}>{account.member_name}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.name} numberOfLines={1}>{account.name}</Text>
        {account.institution_name ? (
          <Text style={styles.institution}>{account.institution_name}</Text>
        ) : null}
        <Text style={[styles.balance, { color: isNegative ? Colors.danger : Colors.onSurface }]}>
          {formatINR(account.balance)}
        </Text>
        <Text style={styles.typeLabel}>{account.account_type.replace('_', ' ')}</Text>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: 180, gap: 4 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberPill: {
    backgroundColor: Colors.surfaceDim,
    borderRadius: Spacing.pillRadius,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  memberText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceMuted,
  },
  name: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  institution: { ...Typography.labelSm, color: Colors.onSurfaceMuted },
  balance: {
    ...Typography.numericData,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  typeLabel: { ...Typography.labelSm, color: Colors.onSurfaceSubtle },
});
