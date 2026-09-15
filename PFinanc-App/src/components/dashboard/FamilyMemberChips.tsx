import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { Colors, Spacing, Typography } from '../../theme';
import { formatINR } from '../../utils/currency';

interface Member {
  id: string;
  name: string;
  total_spent?: number;
}

interface FamilyMemberChipsProps {
  members: Member[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

export function FamilyMemberChips({ members, selectedId, onSelect }: FamilyMemberChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {/* All */}
      <TouchableOpacity
        style={[styles.chip, !selectedId && styles.chipActive]}
        onPress={() => onSelect?.(null)}
        activeOpacity={0.7}
      >
        <Text style={[styles.chipLabel, !selectedId && styles.chipLabelActive]}>All</Text>
      </TouchableOpacity>

      {members.map((member) => (
        <TouchableOpacity
          key={member.id}
          style={[styles.chip, selectedId === member.id && styles.chipActive]}
          onPress={() => onSelect?.(member.id)}
          activeOpacity={0.7}
        >
          <Avatar name={member.name} size={20} />
          <Text style={[styles.chipLabel, selectedId === member.id && styles.chipLabelActive]}>
            {member.name.split(' ')[0]}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.layoutMargin,
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Spacing.pillRadius,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 32,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipLabel: {
    ...Typography.labelMd,
    color: Colors.onSurfaceMuted,
  },
  chipLabelActive: {
    color: Colors.onPrimary,
  },
});
