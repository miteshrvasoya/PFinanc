import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../theme';

interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function FilterBottomSheet({ visible, onClose }: FilterBottomSheetProps) {
  // Static mock for the UI design to match the user's wireframe requirement.
  const filterGroups = [
    {
      title: 'Date',
      options: ['Today', 'This week', 'This month', 'Custom'],
      selected: 'This month'
    },
    {
      title: 'Account',
      options: ['All accounts', 'HDFC Bank', 'ICICI Bank', 'SBI'],
      selected: 'All accounts'
    },
    {
      title: 'Category',
      options: ['All categories', 'Food', 'Travel', 'Shopping', 'Bills'],
      selected: 'All categories'
    },
    {
      title: 'Transaction Type',
      options: ['Expense', 'Income', 'Transfer', 'Investment'],
      selected: 'Expense'
    },
    {
      title: 'Source',
      options: ['Manual', 'CSV', 'SMS', 'Email', 'API'],
      selected: 'SMS'
    },
    {
      title: 'Status',
      options: ['Completed', 'Needs Review'],
      selected: 'Completed'
    }
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        
        <View style={styles.sheet}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.onSurfaceMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {filterGroups.map((group) => (
              <View key={group.title} style={styles.group}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                <View style={styles.optionsWrap}>
                  {group.options.map((opt) => {
                    const isSelected = opt === group.selected;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.btnSecondary} activeOpacity={0.7} onPress={onClose}>
              <Text style={styles.btnSecondaryText}>Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} activeOpacity={0.7} onPress={onClose}>
              <Text style={styles.btnPrimaryText}>Apply filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.scrim,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.layoutMargin,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    ...Typography.headlineSm,
    fontFamily: 'Inter_700Bold',
    color: Colors.onSurface,
  },
  scrollArea: {
    paddingHorizontal: Spacing.layoutMargin,
  },
  group: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceVariant,
  },
  groupTitle: {
    ...Typography.labelMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurfaceMuted,
    marginBottom: Spacing.sm,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Spacing.pillRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    ...Typography.bodyMd,
    color: Colors.onSurface,
  },
  chipTextSelected: {
    color: Colors.onPrimary,
    fontFamily: 'Inter_600SemiBold',
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.layoutMargin,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingBottom: 40, // Safe area for iOS
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Spacing.buttonRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onSurface,
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Spacing.buttonRadius,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    ...Typography.bodyMd,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.onPrimary,
  },
});
