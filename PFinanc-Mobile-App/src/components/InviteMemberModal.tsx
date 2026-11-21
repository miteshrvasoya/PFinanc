import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface InviteMemberModalProps {
  visible: boolean;
  onClose: () => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ visible, onClose }) => {
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
            <Text style={styles.headerTitle}>Invite Family Member</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>
          
          <Text style={styles.desc}>
            Invitees get end-to-end encrypted ledger access with customizable transaction permissions.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PHONE NUMBER OR EMAIL</Text>
              <TextInput 
                style={styles.input}
                placeholder="+91 98765 43210 or email@domain.com"
                placeholderTextColor={colors.onSurfaceVariant}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>ASSIGNED HOUSEHOLD ROLE</Text>
              {/* Note: React Native doesn't have a native select, we'll use a Pressable simulating it for now */}
              <Pressable style={styles.selectBox}>
                <Text style={styles.selectText}>Member (Add & View Shared Transactions)</Text>
                <MaterialIcons name="arrow-drop-down" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.sendBtn} onPress={onClose}>
            <MaterialIcons name="send" size={18} color={colors.onPrimary} />
            <Text style={styles.sendBtnText}>Send Household Invitation</Text>
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
    gap: 16,
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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  form: {
    gap: 12,
    marginTop: 4,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurface,
  },
  selectBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurface,
  },
  sendBtn: {
    width: '100%',
    height: 52,
    backgroundColor: colors.primaryContainer,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  sendBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onPrimary,
  },
});
