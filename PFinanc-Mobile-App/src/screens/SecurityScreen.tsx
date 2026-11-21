import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { comingSoon } from '../utils/notify';

export const SecurityScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [fallbackEnabled, setFallbackEnabled] = useState(true);
  const [autoLockDelay, setAutoLockDelay] = useState('0');
  const [lockOnSwitch, setLockOnSwitch] = useState(true);
  const [lockOnScreenOff, setLockOnScreenOff] = useState(true);
  const [hideInSwitcher, setHideInSwitcher] = useState(true);
  const [hideNotifications, setHideNotifications] = useState(true);
  const [selfDestruct, setSelfDestruct] = useState(false);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </Pressable>
          <View style={styles.enclaveBadge}>
            <MaterialIcons name="verified-user" size={14} color={colors.primaryFixed} />
            <Text style={styles.enclaveBadgeText}>Hardware Secure Enclave</Text>
          </View>
        </View>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Security & Biometrics</Text>
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitleText}>Local Vault Protection</Text>
            <View style={styles.subtitleDot} />
            <Text style={styles.subtitleText}>On-Device Biometry</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Biometrics Status Card */}
        <View style={styles.biometricCard}>
          <View style={styles.biometricGlow} />
          <View style={styles.biometricHeader}>
            <View style={styles.fingerprintBox}>
              <MaterialIcons name="fingerprint" size={28} color={colors.primaryFixed} />
            </View>
            <Switch 
              value={biometricEnabled} 
              onValueChange={setBiometricEnabled}
              trackColor={{ false: 'rgba(255, 255, 255, 0.3)', true: colors.primaryFixed }}
              thumbColor={colors.onPrimary}
            />
          </View>
          <View style={styles.biometricContent}>
            <Text style={styles.biometricTitle}>Biometric Authentication</Text>
            <Text style={styles.biometricDesc}>
              Unlock PFinanc instantly using your device's biometric sensor (Face ID / Fingerprint). Authentication keys are stored strictly in your hardware Secure Enclave and never leave your phone.
            </Text>
          </View>
          <View style={styles.biometricFooter}>
            <View style={styles.biometricFooterLeft}>
              <MaterialIcons name="schedule" size={16} color={colors.primaryFixed} />
              <Text style={styles.biometricFooterText}>Last verified via Face ID today at 10:30 AM</Text>
            </View>
            <Text style={styles.biometricActiveText}>Active</Text>
          </View>
        </View>

        {/* PIN & Fallback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PIN & Fallback Passcode</Text>
          <View style={styles.cardList}>
            {/* App Passcode */}
            <View style={styles.cardListItem}>
              <View style={styles.itemLeft}>
                <View style={styles.itemIconBox}>
                  <MaterialIcons name="pin" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.itemTitle}>App Passcode</Text>
                  <Text style={styles.itemDesc}>6-digit PIN configured</Text>
                </View>
              </View>
              <Pressable style={styles.changeBtn} onPress={() => comingSoon('Change PIN')}>
                <Text style={styles.changeBtnText}>Change PIN</Text>
                <MaterialIcons name="chevron-right" size={16} color={colors.primary} />
              </Pressable>
            </View>

            {/* Biometric Fallback */}
            <View style={styles.cardListItem}>
              <View style={styles.itemLeft}>
                <View style={styles.itemIconBox}>
                  <MaterialIcons name="lock-reset" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>Biometric Fallback</Text>
                  <Text style={styles.itemDesc}>Require PIN after 3 failed biometric attempts</Text>
                </View>
              </View>
              <Switch 
                value={fallbackEnabled} 
                onValueChange={setFallbackEnabled}
                trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                thumbColor={colors.onPrimary}
              />
            </View>

            {/* Duress PIN */}
            <View style={[styles.cardListItem, { borderBottomWidth: 0 }]}>
              <View style={styles.itemLeft}>
                <View style={styles.itemIconBox}>
                  <MaterialIcons name="shield" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={styles.titleWithBadge}>
                    <Text style={styles.itemTitle}>Duress PIN / Decoy Vault</Text>
                    <View style={styles.safetyBadge}>
                      <Text style={styles.safetyBadgeText}>Safety</Text>
                    </View>
                  </View>
                  <Text style={styles.itemDesc}>
                    Entering an alternate PIN opens a clean decoy ledger with no real family assets.
                  </Text>
                </View>
              </View>
              <Pressable style={styles.configureBtn} onPress={() => comingSoon('Configure')}>
                <Text style={styles.configureBtnText}>Configure</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Auto-Lock Rules */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Auto-Lock Rules</Text>
            <Text style={styles.sectionSubtitle}>Select how quickly PFinanc secures your vault when inactive.</Text>
          </View>
          <View style={styles.cardContainer}>
            <View style={styles.radioGrid}>
              {[
                { id: '0', label: 'Immediately' },
                { id: '30', label: 'After 30s' },
                { id: '60', label: 'After 1 minute' },
                { id: '300', label: 'After 5 minutes' },
              ].map((opt) => {
                const isActive = autoLockDelay === opt.id;
                return (
                  <Pressable 
                    key={opt.id} 
                    style={[styles.radioBtn, isActive && styles.radioBtnActive]}
                    onPress={() => setAutoLockDelay(opt.id)}
                  >
                    <View style={styles.radioInner}>
                      {isActive ? (
                        <MaterialIcons name="check-circle" size={18} color={colors.primary} />
                      ) : (
                        <View style={styles.radioCircle} />
                      )}
                      <Text style={[styles.radioText, isActive && styles.radioTextActive]}>{opt.label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.togglesList}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleRowLeft}>
                  <Text style={styles.itemTitle}>Lock immediately when switching apps</Text>
                  <Text style={styles.itemDesc}>Protects vault whenever leaving the active screen</Text>
                </View>
                <Switch 
                  value={lockOnSwitch} 
                  onValueChange={setLockOnSwitch}
                  trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                  thumbColor={colors.onPrimary}
                />
              </View>
              <View style={styles.toggleRow}>
                <View style={styles.toggleRowLeft}>
                  <Text style={styles.itemTitle}>Lock on screen turn-off</Text>
                  <Text style={styles.itemDesc}>Re-authenticates when the phone is woken</Text>
                </View>
                <Switch 
                  value={lockOnScreenOff} 
                  onValueChange={setLockOnScreenOff}
                  trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                  thumbColor={colors.onPrimary}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Switcher & Notification Privacy</Text>
          <View style={styles.cardList}>
            <View style={styles.cardListItem}>
              <View style={styles.itemLeft}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={styles.titleWithIcon}>
                    <MaterialIcons name="visibility-off" size={18} color={colors.primary} />
                    <Text style={styles.itemTitle}>Hide Screen in App Switcher</Text>
                  </View>
                  <Text style={styles.itemDesc}>Blurs app contents and hides net worth balances in recent apps view.</Text>
                </View>
              </View>
              <Switch 
                value={hideInSwitcher} 
                onValueChange={setHideInSwitcher}
                trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                thumbColor={colors.onPrimary}
              />
            </View>
            <View style={[styles.cardListItem, { borderBottomWidth: 0 }]}>
              <View style={styles.itemLeft}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={styles.titleWithIcon}>
                    <MaterialIcons name="notifications-paused" size={18} color={colors.primary} />
                    <Text style={styles.itemTitle}>Hide Notification Amounts</Text>
                  </View>
                  <Text style={styles.itemDesc}>Replaces transaction sums with "₹••••••" in lock screen notifications.</Text>
                </View>
              </View>
              <Switch 
                value={hideNotifications} 
                onValueChange={setHideNotifications}
                trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                thumbColor={colors.onPrimary}
              />
            </View>
          </View>
        </View>

        {/* Cryptographic */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cryptographic Protection</Text>
          <View style={styles.cardList}>
            <View style={styles.cardListItem}>
              <View style={styles.itemLeft}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.itemTitle}>Failed Attempts Lockout</Text>
                  <Text style={styles.itemDesc}>Lock application for 1 hour after consecutive failed passcode entries.</Text>
                </View>
              </View>
              <View style={styles.attemptsBadge}>
                <Text style={styles.attemptsBadgeText}>5 Attempts</Text>
              </View>
            </View>
            <View style={[styles.cardListItem, styles.dangerItem]}>
              <View style={styles.itemLeft}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={styles.titleWithIcon}>
                    <MaterialIcons name="warning" size={18} color={colors.error} />
                    <Text style={styles.dangerTitle}>Self-Destruct on Tamper / Wipe Vault</Text>
                  </View>
                  <Text style={styles.itemDesc}>
                    Permanently wipe local cryptographic keys after 10 failed passcode attempts. Requires manual seed backup restore.
                  </Text>
                </View>
              </View>
              <Switch 
                value={selfDestruct} 
                onValueChange={setSelfDestruct}
                trackColor={{ false: colors.surfaceContainerHighest, true: colors.error }}
                thumbColor={colors.onPrimary}
              />
            </View>
          </View>
        </View>

        {/* Footer info */}
        <View style={styles.footerInfo}>
          <View style={styles.footerInfoBox}>
            <MaterialIcons name="key" size={14} color={colors.primary} />
            <Text style={styles.footerInfoText}>
              Enclave: iOS Secure Enclave / BiometricPrompt • Key: Ed25519 Hardware-backed • Zero Cloud Biometrics
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: 'rgba(244, 251, 247, 0.95)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    zIndex: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    marginLeft: -8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enclaveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  enclaveBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onPrimary,
    letterSpacing: 0.5,
  },
  titleSection: {
    marginTop: 4,
  },
  title: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 24,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  subtitleText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  subtitleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 24,
  },
  biometricCard: {
    backgroundColor: colors.primaryContainer,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  biometricGlow: {
    position: 'absolute',
    right: -48,
    top: -48,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: 'rgba(164, 208, 187, 0.1)', // primary-fixed-dim/10
  },
  biometricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    zIndex: 10,
  },
  fingerprintBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 33, 22, 0.4)', // primary/40
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricContent: {
    zIndex: 10,
  },
  biometricTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: colors.surfaceContainerLowest,
  },
  biometricDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(164, 208, 187, 0.9)', // primary-fixed-dim/90
    lineHeight: 18,
    marginTop: 4,
  },
  biometricFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 10,
  },
  biometricFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  biometricFooterText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.primaryFixedDim,
  },
  biometricActiveText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primaryFixed,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    paddingHorizontal: 4,
  },
  sectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  cardList: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  cardListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  dangerItem: {
    backgroundColor: 'rgba(255, 218, 214, 0.2)', // error-container/20
    borderBottomWidth: 0,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  dangerTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.error,
  },
  itemDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 2,
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  changeBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  safetyBadge: {
    backgroundColor: colors.secondaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  safetyBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.onSecondaryFixed,
  },
  configureBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    backgroundColor: colors.surface,
  },
  configureBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onSurface,
  },
  cardContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  radioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioBtn: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    backgroundColor: colors.surfaceContainerLowest,
  },
  radioBtnActive: {
    borderColor: colors.primaryContainer,
    backgroundColor: 'rgba(192, 236, 214, 0.2)', // primary-fixed/20
  },
  radioInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  radioText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurface,
  },
  radioTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  togglesList: {
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainerHigh,
    paddingTop: 12,
    gap: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  toggleRowLeft: {
    flex: 1,
    paddingRight: 8,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  attemptsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
  },
  attemptsBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurface,
  },
  footerInfo: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 24,
  },
  footerInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '90%',
  },
  footerInfoText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    lineHeight: 14,
    flexShrink: 1,
  },
});
