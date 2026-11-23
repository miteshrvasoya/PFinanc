import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import * as LocalAuthentication from 'expo-local-authentication';

export const PasswordDetailsScreen: React.FC<{ onBack?: () => void; onNavigate?: (screen: string) => void }> = ({ onBack, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [isPasswordRevealed, setIsPasswordRevealed] = useState(false);

  const togglePassword = async () => {
    if (!isPasswordRevealed) {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasHardware && isEnrolled) {
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate to reveal password',
            fallbackLabel: 'Use Passcode',
          });

          if (result.success) {
            setIsPasswordRevealed(true);
          } else {
            Alert.alert('Authentication Failed', 'Unable to verify identity.');
          }
        } else {
          // Fallback if no biometrics setup
          Alert.alert('Security Notice', 'No biometric or device lock found. Please set one up in device settings.', [
            { text: 'Reveal Anyway', onPress: () => setIsPasswordRevealed(true) },
            { text: 'Cancel', style: 'cancel' }
          ]);
        }
      } catch (error) {
        Alert.alert('Error', 'Authentication error occurred.');
      }
    } else {
      setIsPasswordRevealed(false);
    }
  };

  const handleDelete = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to delete credential',
          fallbackLabel: 'Use Passcode',
        });

        if (result.success) {
          Alert.alert('Deleted', 'Credential has been securely wiped from your Vault.', [
            { text: 'OK', onPress: () => { if (onBack) onBack(); } }
          ]);
        }
      } else {
        Alert.alert('Confirm Delete', 'Are you sure you want to delete this credential?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => { if (onBack) onBack(); } }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during authentication.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.iconButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Credential Details</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="more-vert" size={24} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Service Hero */}
        <View style={styles.heroSection}>
          <View style={styles.heroGlow} />
          <View style={styles.logoCard}>
            <View style={styles.logoInner}>
              <Text style={styles.logoText}>HDFC</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="verified" size={11} color={colors.primaryFixed} />
            </View>
          </View>
          <Text style={styles.heroTitle}>HDFC NetBanking</Text>
          <TouchableOpacity style={styles.linkRow}>
            <Text style={styles.linkText}>netbanking.hdfcbank.com</Text>
            <MaterialIcons name="open-in-new" size={15} color={colors.primaryContainer} />
          </TouchableOpacity>
          <View style={styles.timestampPill}>
            <MaterialIcons name="schedule" size={13} color={colors.primary} />
            <Text style={styles.timestampText}>Updated yesterday at 4:15 PM • Created by You</Text>
          </View>
        </View>

        {/* Sovereignty Model */}
        <View style={styles.card}>
          <View style={styles.cardHeaderBordered}>
            <View style={styles.cardHeaderLeft}>
              <MaterialIcons name="shield" size={17} color={colors.primary} />
              <Text style={styles.cardTitle}>Vault Sovereignty & Access</Text>
            </View>
            <View style={styles.tierPill}>
              <Text style={styles.tierPillText}>Tier 1 Secure</Text>
            </View>
          </View>
          
          <View style={styles.ownerRow}>
            <View style={styles.ownerInfoLeft}>
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerAvatarText}>MP</Text>
              </View>
              <View>
                <Text style={styles.ownerLabelText}>Owner</Text>
                <Text style={styles.ownerNameText}>You</Text>
              </View>
            </View>
            <View style={styles.primaryOwnerPill}>
              <Text style={styles.primaryOwnerText}>Primary Owner</Text>
            </View>
          </View>

          <View style={styles.policyRow}>
            <View style={styles.policyIconBox}>
              <MaterialIcons name="lock" size={18} color={colors.primaryContainer} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.policyTitleRow}>
                <Text style={styles.policyTitle}>Private / Owner-Only</Text>
                <View style={styles.dot} />
                <Text style={styles.policySub}>Encrypted (AES-256)</Text>
              </View>
              <Text style={styles.policyDesc}>
                Only you can view or edit this credential. Prepared for future emergency or household delegation.
              </Text>
            </View>
          </View>
        </View>

        {/* Encrypted Vault Payload */}
        <View style={styles.payloadSection}>
          <View style={styles.payloadHeader}>
            <MaterialIcons name="vpn-key" size={16} color={colors.primary} />
            <Text style={styles.payloadHeaderText}>ENCRYPTED VAULT PAYLOAD</Text>
          </View>

          {/* Username */}
          <View style={styles.fieldCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Username / Customer ID</Text>
              <Text style={styles.fieldValue}>you@example.com</Text>
            </View>
            <TouchableOpacity style={styles.copyBtn}>
              <MaterialIcons name="content-copy" size={19} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Password */}
          <View style={styles.passwordCard}>
            <View style={styles.pwHeader}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.bioBadge}>
                <MaterialIcons name="fingerprint" size={12} color={colors.primary} />
                <Text style={styles.bioBadgeText}>Biometric Secured</Text>
              </View>
            </View>
            <View style={styles.pwDisplayRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pwText, !isPasswordRevealed && styles.pwHidden]}>
                  {isPasswordRevealed ? 'Hdfc#SuperSecure2025!' : '••••••••••••••••'}
                </Text>
              </View>
              <View style={styles.pwActions}>
                <TouchableOpacity style={styles.pwActionBtn} onPress={togglePassword}>
                  <MaterialIcons name={isPasswordRevealed ? "visibility-off" : "visibility"} size={19} color={colors.primaryContainer} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.pwCopyBtn}>
                  <MaterialIcons name="lock-open" size={18} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.pwHelperRow}>
              <MaterialIcons name="info" size={14} color={colors.primary} />
              <Text style={styles.pwHelperText}>Tap eye to reveal (Requires Biometric/PIN authentication)</Text>
            </View>
            
            <View style={styles.pwStrengthSection}>
              <View style={styles.pwStrengthHeader}>
                <Text style={styles.pwStrengthLabel}>Strength Assessment</Text>
                <View style={styles.pwStrengthScoreRow}>
                  <MaterialIcons name="check-circle" size={13} color={colors.primary} />
                  <Text style={styles.pwStrengthScoreText}>Strong • 94/100</Text>
                </View>
              </View>
              <View style={styles.pwStrengthBarBg}>
                <View style={[styles.pwStrengthBarFill, { width: '94%' }]} />
              </View>
            </View>
          </View>

          {/* Category */}
          <View style={styles.fieldCard}>
            <View>
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categoryPill}>
                <MaterialIcons name="account-balance" size={18} color={colors.primary} />
                <Text style={styles.categoryPillText}>Banking & Financial Services</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Text style={styles.changeText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="notes" size={14} color={colors.primary} />
                <Text style={styles.fieldLabel}>Notes / Clues (Encrypted)</Text>
              </View>
              <MaterialIcons name="enhanced-encryption" size={15} color={colors.outline} />
            </View>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>
                Customer ID: <Text style={{ fontWeight: '600', color: colors.primary }}>8940211</Text> • Linked to HDFC Salary Account • Security question answer set to Pune.
              </Text>
            </View>
          </View>
        </View>

        {/* Security Notice Banner */}
        <View style={styles.noticeBanner}>
          <View style={styles.noticeIconBox}>
            <MaterialIcons name="security" size={18} color={colors.primary} />
          </View>
          <Text style={styles.noticeText}>
            Sensitive actions require Vault PIN / Face ID confirmation before modification or clipboard transfer.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <View style={styles.shareTile}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MaterialIcons name="group-add" size={20} color={colors.outline} />
              <Text style={styles.shareText}>Share with Household</Text>
            </View>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <MaterialIcons name="delete" size={20} color="#ba1a1a" />
            <Text style={styles.deleteBtnText}>Delete Credential</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  iconButton: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroSection: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -40, right: -40,
    width: 112, height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(192, 236, 214, 0.4)',
  },
  logoCard: {
    width: 64, height: 64,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    padding: 8,
    marginBottom: 12,
    position: 'relative',
  },
  logoInner: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#004C8F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4, right: -4,
    width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryContainer,
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryContainer,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(13, 56, 41, 0.8)',
    textDecorationLine: 'underline',
  },
  timestampPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.1)',
    marginTop: 12,
  },
  timestampText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderBordered: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.15)',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryContainer,
  },
  tierPill: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10,
  },
  tierPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  ownerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ownerInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ownerAvatar: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryFixed,
  },
  ownerAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.surfaceBright,
  },
  ownerLabelText: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  ownerNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
  primaryOwnerPill: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  primaryOwnerText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.primary,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.1)',
  },
  policyIconBox: {
    width: 32, height: 32,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  policyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  dot: {
    width: 4, height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  policySub: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  policyDesc: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 2,
  },
  payloadSection: {
    marginBottom: 14,
  },
  payloadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  payloadHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    padding: 16,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
  copyBtn: {
    width: 40, height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    padding: 16,
    marginBottom: 14,
  },
  pwHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(192, 236, 214, 0.6)',
    borderWidth: 1,
    borderColor: colors.primaryFixed,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10,
  },
  bioBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  pwDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(238, 245, 242, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    padding: 12,
    marginBottom: 12,
  },
  pwText: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: 2,
  },
  pwHidden: {
    letterSpacing: 4,
  },
  pwActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pwActionBtn: {
    width: 36, height: 36,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pwCopyBtn: {
    width: 36, height: 36,
    borderRadius: 8,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pwHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  pwHelperText: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  pwStrengthSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.1)',
  },
  pwStrengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pwStrengthLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  pwStrengthScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pwStrengthScoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  pwStrengthBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 3,
    overflow: 'hidden',
  },
  pwStrengthBarFill: {
    height: '100%',
    backgroundColor: colors.primaryContainer,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.25)',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  changeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  notesCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    padding: 16,
    marginBottom: 14,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notesBox: {
    backgroundColor: 'rgba(238, 245, 242, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    padding: 12,
  },
  notesText: {
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 20,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  noticeIconBox: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: {
    flex: 1,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    lineHeight: 14,
  },
  actionsSection: {
    gap: 12,
  },
  shareTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.5)',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 14,
    opacity: 0.8,
  },
  shareText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.outline,
  },
  comingSoonBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FDF2F2',
    borderWidth: 1,
    borderColor: '#F8D7D7',
    borderRadius: 16,
    height: 52,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9A3232',
  },
});
