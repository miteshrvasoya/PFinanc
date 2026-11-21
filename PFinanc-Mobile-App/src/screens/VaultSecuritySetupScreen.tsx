import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
export const VaultSecuritySetupScreen: React.FC<{ onBack?: () => void; onNavigate?: (screen: string) => void }> = ({ onBack, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [autoLock, setAutoLock] = useState('1m');

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.stepPill}>
          <View style={styles.stepDot} />
          <Text style={styles.stepText}>Step 1 of 2: Security Setup</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header & Architecture Card */}
        <View style={styles.section}>
          <View style={styles.securityBadge}>
            <MaterialIcons name="verified-user" size={13} color={colors.primary} />
            <Text style={styles.securityBadgeText}>LOCAL HARDWARE ENCLAVE • INDEPENDENT TIMEOUT</Text>
          </View>
          <Text style={styles.title}>Set up Vault Security</Text>
          <Text style={styles.description}>
            Your Vault has an additional layer of protection for sensitive credentials. Configure your master PIN and biometrics.
          </Text>

          {/* Flow Banner */}
          <View style={styles.flowBanner}>
            <View style={styles.flowItem}>
              <MaterialIcons name="lock" size={18} color={colors.outline} />
              <Text style={styles.flowText}>PFinanc App Auth</Text>
            </View>
            <MaterialIcons name="add" size={14} color={colors.outlineVariant} />
            <View style={styles.flowItem}>
              <MaterialIcons name="shield" size={18} color={colors.primaryContainer} />
              <Text style={[styles.flowText, { color: colors.primary }]}>Vault Master</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={14} color={colors.outlineVariant} />
            <View style={styles.flowItem}>
              <MaterialIcons name="vpn-key" size={18} color={colors.primaryContainer} />
              <Text style={[styles.flowText, { color: colors.primary, fontWeight: '600' }]}>Vault Access</Text>
            </View>
          </View>
        </View>

        {/* PIN Setup Card */}
        <View style={styles.card}>
          <View style={styles.pinHeader}>
            <View style={styles.pinLabelRow}>
              <MaterialIcons name="pin" size={18} color={colors.primaryContainer} />
              <Text style={styles.pinLabel}>Enter 6-digit Vault PIN</Text>
            </View>
            <View style={styles.pinProgressBadge}>
              <Text style={styles.pinProgressText}>4 / 6 entered</Text>
            </View>
          </View>

          {/* Mock PIN Dots */}
          <View style={styles.pinDotsContainer}>
            <View style={styles.pinDotFilled} />
            <View style={styles.pinDotFilled} />
            <View style={styles.pinDotFilled} />
            <View style={styles.pinDotActiveContainer}>
              <View style={styles.pinDotFilled} />
              {/* Ring simulation */}
              <View style={styles.pinDotRing} />
            </View>
            <View style={styles.pinDotHollow} />
            <View style={styles.pinDotHollow} />
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="info" size={16} color={colors.secondary} />
            <Text style={styles.infoText}>Must be distinct from your device lock screen PIN for sovereign protection.</Text>
          </View>

          <View style={styles.divider} />

          {/* Confirm PIN Block */}
          <View style={styles.pinHeader}>
            <View style={styles.pinLabelRow}>
              <MaterialIcons name="check-circle-outline" size={18} color={colors.outline} />
              <Text style={[styles.pinLabel, { color: colors.onSurface }]}>Confirm Vault PIN</Text>
            </View>
            <Text style={styles.pinStatusAwaiting}>Awaiting PIN</Text>
          </View>
          <View style={[styles.pinDotsContainer, { backgroundColor: 'rgba(238, 245, 242, 0.4)', borderColor: 'rgba(193, 200, 194, 0.35)', borderStyle: 'dashed' }]}>
            {[1, 2, 3, 4, 5, 6].map(i => <View key={i} style={styles.pinDotHollowConfirm} />)}
          </View>
        </View>

        {/* Biometric Toggle Card */}
        <View style={styles.bioCard}>
          <View style={styles.bioLeft}>
            <View style={styles.bioIconBox}>
              <MaterialIcons name="fingerprint" size={24} color={colors.primaryContainer} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bioTitle}>Biometric Quick Unlock</Text>
              <Text style={styles.bioDesc}>Unlock Vault using Face ID or Touch ID after PIN authorization.</Text>
            </View>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={setBiometricEnabled}
            trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
            thumbColor={colors.surfaceContainerLowest}
          />
        </View>

        {/* Auto Lock Selection */}
        <View style={styles.autoLockSection}>
          <View style={styles.autoLockHeader}>
            <View style={styles.pinLabelRow}>
              <MaterialIcons name="timer" size={18} color={colors.outline} />
              <Text style={styles.pinLabel}>Vault Auto-Lock</Text>
            </View>
            <Text style={styles.pinStatusAwaiting}>Isolation control</Text>
          </View>

          <View style={styles.chipRow}>
            <TouchableOpacity style={autoLock === '0' ? styles.chipActive : styles.chipInactive} onPress={() => setAutoLock('0')}>
              <Text style={autoLock === '0' ? styles.chipActiveText : styles.chipInactiveText}>Immediately</Text>
            </TouchableOpacity>

            <TouchableOpacity style={autoLock === '1m' ? styles.chipActive : styles.chipInactive} onPress={() => setAutoLock('1m')}>
              <Text style={autoLock === '1m' ? styles.chipActiveText : styles.chipInactiveText}>1 min</Text>
              {autoLock === '1m' && <Text style={styles.chipRecText}>Recommended</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={autoLock === '5m' ? styles.chipActive : styles.chipInactive} onPress={() => setAutoLock('5m')}>
              <Text style={autoLock === '5m' ? styles.chipActiveText : styles.chipInactiveText}>5 min</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Guarantee Micro Card */}
        <View style={styles.microCard}>
          <View style={styles.microIconBox}>
            <MaterialIcons name="lock-reset" size={18} color={colors.primaryContainer} />
          </View>
          <Text style={styles.microText}>
            Forgotten Master PIN requires 48-hour hardware reset delay to prevent unauthorized breach attempts.
          </Text>
        </View>

      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => onNavigate?.('vaultReady')}>
          <Text style={styles.primaryButtonText}>Continue</Text>
          <MaterialIcons name="arrow-forward" size={20} color={colors.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.footnoteText}>
          Your PIN encrypts credentials locally. PFinanc never sends PIN or recovery keys to any cloud servers.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryContainer,
    marginRight: 6,
  },
  stepText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 150,
  },
  section: {
    marginBottom: 24,
  },
  securityBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 236, 214, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(164, 208, 187, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  securityBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  flowBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  flowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flowText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.25)',
    padding: 20,
    marginBottom: 24,
  },
  pinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pinLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  pinProgressBadge: {
    backgroundColor: 'rgba(192, 236, 214, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pinProgressText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryContainer,
  },
  pinStatusAwaiting: {
    fontSize: 11,
    color: colors.outline,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(238, 245, 242, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
  },
  pinDotFilled: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primaryContainer,
  },
  pinDotHollow: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  pinDotHollowConfirm: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  pinDotActiveContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pinDotRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(13, 56, 41, 0.3)',
    opacity: 0.6,
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginLeft: 6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHigh,
    marginVertical: 24,
  },
  bioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  bioLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 12,
  },
  bioIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(192, 236, 214, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  bioDesc: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  autoLockSection: {
    marginBottom: 24,
  },
  autoLockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    padding: 4,
    gap: 8,
  },
  chipInactive: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  chipInactiveText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  chipActive: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.primaryContainer,
  },
  chipActiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  chipRecText: {
    fontSize: 10,
    color: colors.primaryFixedDim,
    marginTop: -2,
  },
  microCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(238, 245, 242, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    padding: 14,
  },
  microIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  microText: {
    flex: 1,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.2)',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  footnoteText: {
    fontSize: 10,
    color: colors.outline,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
