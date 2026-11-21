import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface TransactionDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  data: any;
  onDelete?: (id: string) => void;
  onEdit?: (data: any) => void;
  onDuplicate?: (data: any) => void;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({ visible, onClose, data, onDelete, onEdit, onDuplicate }) => {
  if (!data) return null;

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
            <View style={styles.headerLeft}>
              <View style={styles.iconBox}>
                <MaterialIcons name={data.icon || "receipt-long"} size={26} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.headerSubtitle}>Transaction Record</Text>
                <Text style={styles.headerTitle}>{data.merchant}</Text>
              </View>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <MaterialIcons name="close" size={18} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Amount */}
            <View style={styles.amountBox}>
              <View>
                <Text style={styles.amountLabel}>Total Settled</Text>
                <Text style={styles.amountValue}>{data.amount}</Text>
              </View>
              <View style={styles.badge}>
                <MaterialIcons name="verified" size={14} color={colors.onPrimaryFixed} />
                <Text style={styles.badgeText}>Verified</Text>
              </View>
            </View>

            {/* Meta Grid */}
            <View style={styles.metaGrid}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Timestamp</Text>
                <Text style={styles.metaValue}>{data.date}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Category</Text>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{data.category}</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Settlement Account</Text>
                <Text style={styles.metaValue}>{data.account}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Audit Source</Text>
                <View style={styles.sourceBox}>
                  <View style={styles.sourceDot} />
                  <Text style={styles.sourceText}>{data.source || 'Manual Entry'}</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Family Owner</Text>
                <View style={styles.ownerBox}>
                  <View style={styles.ownerAvatar}>
                    <Text style={styles.ownerAvatarText}>{data.owner ? data.owner[0] : 'M'}</Text>
                  </View>
                  <Text style={styles.metaValue}>{data.owner}</Text>
                </View>
              </View>
            </View>

            {/* Action Row */}
            <View style={styles.actionRow}>
              <Pressable style={styles.actionBtn} onPress={() => onEdit ? onEdit(data) : Alert.alert('Coming Soon', 'Edit functionality is under development.')}>
                <MaterialIcons name="edit" size={17} color={colors.onSurface} />
                <Text style={styles.actionBtnText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => onDuplicate ? onDuplicate(data) : Alert.alert('Coming Soon', 'Duplicate functionality is under development.')}>
                <MaterialIcons name="content-copy" size={17} color={colors.onSurface} />
                <Text style={styles.actionBtnText}>Duplicate</Text>
              </Pressable>
              <Pressable style={styles.actionBtnError} onPress={() => onDelete ? onDelete(data.id) : Alert.alert('Delete', 'Delete action not implemented here.')}>
                <MaterialIcons name="delete" size={17} color={colors.error} />
                <Text style={styles.actionBtnTextError}>Delete</Text>
              </Pressable>
            </View>
          </ScrollView>
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
    backgroundColor: 'rgba(43, 50, 48, 0.4)', // inverse-surface/40
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
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
  },
  headerSubtitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 24, // headline-lg-mobile
    color: colors.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  amountBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  amountValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 28, // currency-hero-mobile
    color: colors.primary,
    letterSpacing: -0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onPrimaryFixed,
  },
  metaGrid: {
    marginTop: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.15)',
  },
  metaLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13, // body-sm
    color: colors.onSurfaceVariant,
  },
  metaValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  categoryPill: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  categoryPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10, // caption
    color: colors.primary,
  },
  sourceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryContainer,
  },
  sourceText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.primary,
  },
  ownerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.5)',
  },
  actionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onSurface,
  },
  actionBtnError: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.2)', // error/20
    backgroundColor: 'rgba(255, 218, 214, 0.4)', // error-container/40
  },
  actionBtnTextError: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.error,
  },
});
