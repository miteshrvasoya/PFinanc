import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../src/theme';

interface ActionItemProps {
  icon: string;
  label: string;
  description: string;
  color: string;
  onPress: () => void;
}

function ActionItem({ icon, label, description, color, onPress }: ActionItemProps) {
  return (
    <TouchableOpacity style={styles.actionItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon as any} size={28} color={color} />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionDesc}>{description}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.onSurfaceMuted} />
    </TouchableOpacity>
  );
}

export default function QuickAddModal() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Add New</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.group}>
          <ActionItem
            icon="arrow-up-circle"
            label="Expense"
            description="Add a new expense transaction"
            color={Colors.danger}
            onPress={() => {
              router.back();
              router.push('/(app)/transactions/'); // Should route to add expense
            }}
          />
          <ActionItem
            icon="arrow-down-circle"
            label="Income"
            description="Record received money"
            color={Colors.success}
            onPress={() => {
              router.back();
              router.push('/(app)/transactions/');
            }}
          />
          <ActionItem
            icon="swap-horizontal"
            label="Transfer"
            description="Move money between accounts"
            color={Colors.transfer}
            onPress={() => {
              router.back();
              router.push('/(app)/more/transfer');
            }}
          />
        </View>

        <View style={styles.group}>
          <ActionItem
            icon="chart-line"
            label="Investment"
            description="Add stock, mutual fund, etc."
            color={Colors.primary}
            onPress={() => {
              router.back();
              // router.push('/(app)/investments/add');
            }}
          />
        </View>

        <View style={styles.group}>
          <ActionItem
            icon="file-upload"
            label="Import Data"
            description="Upload CSV or connect bank"
            color={Colors.secondary}
            onPress={() => {
              router.back();
              router.push('/(app)/more/import');
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  title: {
    ...Typography.headlineMd,
    color: Colors.onSurface,
  },
  closeBtn: {
    position: 'absolute',
    right: Spacing.layoutMargin,
    padding: 4,
  },
  content: {
    padding: Spacing.layoutMargin,
    gap: Spacing.xl,
  },
  group: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  actionText: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    ...Typography.bodyLg,
    color: Colors.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  actionDesc: {
    ...Typography.bodySm,
    color: Colors.onSurfaceMuted,
  },
});
