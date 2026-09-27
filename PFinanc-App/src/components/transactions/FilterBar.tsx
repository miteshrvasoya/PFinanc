import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../theme';

interface Filter {
  key: string;
  label: string;
  icon?: string;
  badge?: number;
}

interface FilterBarProps {
  filters: Filter[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

const TYPE_FILTERS: Filter[] = [
  { key: 'all', label: 'All' },
  { key: 'NEEDS_REVIEW', label: 'Needs Review' },
  { key: 'EXPENSE', label: 'Expenses' },
  { key: 'INCOME', label: 'Income' },
  { key: 'TRANSFER', label: 'Transfers' },
];

export { TYPE_FILTERS };

export function FilterBar({ filters, selectedKey, onSelect }: FilterBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {filters.map((f) => {
        const active = f.key === selectedKey;
        return (
          <TouchableOpacity
            key={f.key}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onSelect(f.key)}
            activeOpacity={0.7}
          >
            {f.icon && (
              <MaterialCommunityIcons
                name={f.icon as any}
                size={14}
                color={active ? Colors.onPrimary : Colors.onSurfaceMuted}
              />
            )}
            <Text style={[styles.label, active && styles.labelActive]}>{f.label}</Text>
            {f.badge !== undefined && f.badge > 0 && (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                  {f.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.layoutMargin,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Spacing.pillRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  label: {
    ...Typography.labelMd,
    color: Colors.onSurfaceMuted,
  },
  labelActive: { color: Colors.onPrimary },
  badge: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  badgeText: { ...Typography.labelSm, color: Colors.onSurface },
  badgeTextActive: { color: Colors.onPrimary },
});
