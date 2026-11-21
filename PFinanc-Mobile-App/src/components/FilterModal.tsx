import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheetContainer}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerSubtitle}>REFINE LEDGER</Text>
              <Text style={styles.headerTitle}>Filter Transactions</Text>
            </View>
            <Pressable onPress={onClose}>
              <Text style={styles.resetText}>Reset All</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Date Range Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Date Range</Text>
              <View style={styles.grid3}>
                <Pressable style={[styles.filterBtn, styles.filterBtnActive]}>
                  <Text style={[styles.filterBtnText, styles.filterBtnTextActive]}>This Month</Text>
                </Pressable>
                <Pressable style={styles.filterBtn}>
                  <Text style={styles.filterBtnText}>Last 30 Days</Text>
                </Pressable>
                <Pressable style={styles.filterBtn}>
                  <Text style={styles.filterBtnText}>Custom</Text>
                </Pressable>
              </View>
            </View>

            {/* Accounts Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Accounts</Text>
              <View style={styles.flexWrap}>
                <Pressable style={[styles.chip, styles.chipActive]}>
                  <Text style={[styles.chipText, styles.chipTextActive]}>HDFC Personal</Text>
                  <MaterialIcons name="check" size={14} color={colors.onPrimaryFixed} />
                </Pressable>
                <Pressable style={[styles.chip, styles.chipActive]}>
                  <Text style={[styles.chipText, styles.chipTextActive]}>ICICI Family</Text>
                  <MaterialIcons name="check" size={14} color={colors.onPrimaryFixed} />
                </Pressable>
                <Pressable style={styles.chip}>
                  <Text style={styles.chipText}>SBI Savings</Text>
                </Pressable>
                <Pressable style={styles.chip}>
                  <Text style={styles.chipText}>Zerodha Demat</Text>
                </Pressable>
              </View>
            </View>

            {/* Categories Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category</Text>
              <View style={styles.flexWrap}>
                <Pressable style={styles.chip}>
                  <Text style={styles.chipText}>Food & Dining</Text>
                </Pressable>
                <Pressable style={styles.chip}>
                  <Text style={styles.chipText}>Bills & Utilities</Text>
                </Pressable>
                <Pressable style={styles.chip}>
                  <Text style={styles.chipText}>Investments</Text>
                </Pressable>
                <Pressable style={styles.chip}>
                  <Text style={styles.chipText}>Salary</Text>
                </Pressable>
                <Pressable style={styles.chip}>
                  <Text style={styles.chipText}>Family Transfers</Text>
                </Pressable>
              </View>
            </View>

            {/* Family Member Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Family Member</Text>
              <View style={styles.grid3}>
                <Pressable style={[styles.memberBtn, styles.memberBtnActive]}>
                  <View style={[styles.memberAvatar, { backgroundColor: colors.primaryContainer }]}>
                    <Text style={[styles.memberAvatarText, { color: colors.onPrimary }]}>M</Text>
                  </View>
                  <Text style={styles.memberText} numberOfLines={1}>Mitesh</Text>
                </Pressable>
                <Pressable style={styles.memberBtn}>
                  <View style={[styles.memberAvatar, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.memberAvatarText, { color: colors.onSecondary }]}>P</Text>
                  </View>
                  <Text style={styles.memberText} numberOfLines={1}>Pooja</Text>
                </Pressable>
                <Pressable style={styles.memberBtn}>
                  <View style={[styles.memberAvatar, { backgroundColor: colors.tertiaryContainer }]}>
                    <Text style={[styles.memberAvatarText, { color: colors.onTertiary }]}>V</Text>
                  </View>
                  <Text style={styles.memberText} numberOfLines={1}>Father</Text>
                </Pressable>
              </View>
            </View>

          </ScrollView>
          <View style={styles.footer}>
            <Pressable style={styles.applyButton} onPress={onClose}>
              <Text style={styles.applyButtonText}>Apply Filters (2 Active)</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'rgba(11, 17, 15, 0.4)',
  },
  sheetContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '85%',
    shadowColor: 'rgba(11, 17, 15, 0.12)',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerSubtitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: colors.primary,
  },
  resetText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
  scrollContent: {
    gap: 20,
    paddingBottom: 20,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  grid3: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: colors.primaryContainer,
  },
  filterBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  filterBtnTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.onPrimary,
  },
  flexWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipActive: {
    backgroundColor: colors.primaryFixed,
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  chipTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.onPrimaryFixed,
  },
  memberBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
  },
  memberBtnActive: {
    backgroundColor: 'rgba(192, 236, 214, 0.2)', // primary-fixed/20
    borderColor: colors.primaryContainer,
  },
  memberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
  },
  memberText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primary,
    flexShrink: 1,
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.2)',
  },
  applyButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  applyButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.onPrimary,
  },
});
