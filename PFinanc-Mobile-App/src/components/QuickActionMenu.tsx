import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { BlurView } from 'expo-blur';

export type QuickActionType = 'voice_ai' | 'expense' | 'income' | 'transfer' | 'scan';

interface QuickActionMenuProps {
  visible: boolean;
  onClose: () => void;
  onActionSelect: (action: QuickActionType) => void;
}

const { width } = Dimensions.get('window');

export const QuickActionMenu: React.FC<QuickActionMenuProps> = ({ visible, onClose, onActionSelect }) => {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <View style={styles.menuContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Quick Action</Text>
            <View style={styles.fastRecordBadge}>
              <MaterialIcons name="bolt" size={13} color={colors.primary} />
              <Text style={styles.fastRecordText}>Fast Record</Text>
            </View>
          </View>

          {/* AI Voice Action */}
          <Pressable 
            style={[styles.actionRow, styles.aiActionRow]} 
            onPress={() => { onClose(); onActionSelect('voice_ai'); }}
          >
            <View style={styles.aiIconWrapper}>
              <MaterialIcons name="mic" size={22} color={colors.primaryFixed} />
            </View>
            <View style={styles.actionBody}>
              <View style={styles.actionTitleRow}>
                <Text style={styles.aiActionTitle}>Speak or Type Naturally</Text>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>AI Powered</Text>
                </View>
              </View>
              <Text style={styles.aiActionSubtitle}>e.g. Paid 350 for coffee with UPI</Text>
            </View>
          </Pressable>

          {/* Add Expense */}
          <Pressable 
            style={styles.actionRow} 
            onPress={() => { onClose(); onActionSelect('expense'); }}
          >
            <View style={[styles.iconWrapper, { backgroundColor: colors.errorContainer }]}>
              <MaterialIcons name="arrow-upward" size={22} color={colors.error} />
            </View>
            <View style={styles.actionBody}>
              <View style={styles.actionTitleRow}>
                <Text style={styles.actionTitle}>Add Expense</Text>
                <MaterialIcons name="arrow-forward" size={16} color={colors.outline} style={styles.forwardIcon} />
              </View>
              <Text style={styles.actionSubtitle}>Log daily spend, bill, or UPI payment</Text>
            </View>
          </Pressable>

          {/* Add Income */}
          <Pressable 
            style={styles.actionRow} 
            onPress={() => { onClose(); onActionSelect('income'); }}
          >
            <View style={[styles.iconWrapper, { backgroundColor: colors.primaryFixed }]}>
              <MaterialIcons name="arrow-downward" size={22} color={colors.primary} />
            </View>
            <View style={styles.actionBody}>
              <View style={styles.actionTitleRow}>
                <Text style={styles.actionTitle}>Add Income</Text>
                <MaterialIcons name="arrow-forward" size={16} color={colors.outline} style={styles.forwardIcon} />
              </View>
              <Text style={styles.actionSubtitle}>Salary, dividend, or freelance inflow</Text>
            </View>
          </Pressable>

          {/* Transfer */}
          <Pressable 
            style={styles.actionRow} 
            onPress={() => { onClose(); onActionSelect('transfer'); }}
          >
            <View style={[styles.iconWrapper, { backgroundColor: colors.secondaryFixed }]}>
              <MaterialIcons name="swap-horiz" size={22} color={colors.onSecondaryFixed} />
            </View>
            <View style={styles.actionBody}>
              <View style={styles.actionTitleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.actionTitle}>Transfer</Text>
                  <View style={styles.frequentBadge}>
                    <Text style={styles.frequentBadgeText}>Frequent</Text>
                  </View>
                </View>
                <MaterialIcons name="arrow-forward" size={16} color={colors.outline} style={styles.forwardIcon} />
              </View>
              <Text style={styles.actionSubtitle}>Move funds between accounts & vaults</Text>
            </View>
          </Pressable>

          {/* Scan Receipt */}
          <View style={styles.scanContainer}>
            <Pressable 
              style={styles.scanActionRow} 
              onPress={() => { onClose(); onActionSelect('scan'); }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="photo-camera" size={18} color={colors.primary} />
                <Text style={styles.scanActionTitle}>Scan Receipt / Bill QR</Text>
              </View>
              <View style={styles.instantAIBadge}>
                <Text style={styles.instantAIBadgeText}>Instant AI</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* FAB Close Button */}
        <Pressable style={styles.closeFab} onPress={onClose}>
          <MaterialIcons name="add" size={26} color={colors.onPrimary} style={{ transform: [{ rotate: '45deg' }] }} />
        </Pressable>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 17, 15, 0.45)',
  },
  menuContainer: {
    width: width - 60,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 24,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    marginBottom: 88, // Space for the close FAB
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.15)',
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.onSurfaceVariant,
  },
  fastRecordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(192, 236, 214, 0.3)', // primary-fixed/30
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  fastRecordText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 16,
    marginBottom: 4,
  },
  aiActionRow: {
    backgroundColor: colors.primaryContainer,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(192, 236, 214, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(192, 236, 214, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBody: {
    flex: 1,
  },
  actionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.onSurface,
  },
  aiActionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.onPrimary,
  },
  actionSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  aiActionSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: 'rgba(164, 208, 187, 0.9)',
    marginTop: 2,
  },
  forwardIcon: {
    opacity: 0.5,
  },
  aiBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.onPrimaryFixed,
  },
  frequentBadge: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  frequentBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.onSecondaryContainer,
  },
  scanContainer: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.2)',
    marginTop: 4,
  },
  scanActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(238, 245, 242, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
  },
  scanActionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  instantAIBadge: {
    backgroundColor: 'rgba(192, 236, 214, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  instantAIBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.primaryContainer,
  },
  closeFab: {
    position: 'absolute',
    bottom: 24, // To position it over the bottom nav exactly where the add button is
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#002116',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 4,
    borderColor: 'rgba(192, 236, 214, 0.4)',
  }
});
