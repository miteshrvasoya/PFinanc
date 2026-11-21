import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface FamilyScopeModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FamilyScopeModal: React.FC<FamilyScopeModalProps> = ({ visible, onClose }) => {
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
          <View style={styles.dragHandle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Household Scope</Text>
              <Text style={styles.headerDesc}>Select active context for budget and analysis</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <View style={styles.optionsContainer}>
            {/* Active Option */}
            <Pressable style={styles.optionActive}>
              <View style={styles.optionLeft}>
                <View style={styles.optionIconBox}>
                  <MaterialIcons name="groups" size={24} color={colors.onPrimary} />
                </View>
                <View>
                  <Text style={styles.optionTitle}>Vasoya Family (4 Members)</Text>
                  <Text style={styles.optionDesc}>Shared accounts, bills & emergency reserves</Text>
                </View>
              </View>
              <MaterialIcons name="check-circle" size={24} color={colors.primaryContainer} />
            </Pressable>

            {/* Inactive Option */}
            <Pressable style={styles.optionInactive}>
              <View style={styles.optionLeft}>
                <View style={styles.optionIconBoxInactive}>
                  <Text style={styles.avatarText}>MV</Text>
                </View>
                <View>
                  <Text style={styles.optionTitle}>Mitesh Vasoya (Personal Vault)</Text>
                  <Text style={styles.optionDesc}>Private accounts & individual investments</Text>
                </View>
              </View>
              <MaterialIcons name="radio-button-unchecked" size={20} color={colors.outline} />
            </Pressable>
          </View>

          <Pressable style={styles.applyBtn} onPress={onClose}>
            <Text style={styles.applyBtnText}>Apply Context</Text>
          </Pressable>
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
    backgroundColor: 'rgba(0, 33, 22, 0.4)', // primary/40
  },
  sheetContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: 'rgba(11, 17, 15, 0.12)',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 20,
    gap: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.outlineVariant,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: -8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: colors.primary,
  },
  headerDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsContainer: {
    gap: 8,
  },
  optionActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primaryContainer,
    backgroundColor: 'rgba(192, 236, 214, 0.2)', // primary-fixed/20
  },
  optionInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    backgroundColor: colors.surfaceContainerLowest,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconBoxInactive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    color: colors.primary,
  },
  optionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.primary,
  },
  optionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  applyBtn: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primaryContainer,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onPrimary,
  },
});
