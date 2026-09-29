import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getBiometricCapability,
  getBiometricLabel,
  authenticateWithBiometrics,
  requestSMSPermissions,
  checkSMSPermissions,
} from '../../services/permissions';
import { 
  Bell, 
  ShieldCheck, 
  Users, 
  Landmark, 
  PieChart, 
  PiggyBank, 
  MessageSquare, 
  FileUp, 
  BarChart3, 
  Fingerprint, 
  Lock, 
  EyeOff, 
  Settings, 
  ChevronRight,
  ArrowRight
} from 'lucide-react-native';
import { theme } from '../../theme';

const SettingRow = ({ icon: Icon, title, subtitle, rightElement, showArrow = true, onPress }: any) => (
  <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
    <View style={styles.rowLeft}>
      <View style={styles.iconContainer}>
        <Icon size={22} color={theme.colors.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
    </View>
    <View style={styles.rowRight}>
      {rightElement}
      {showArrow && <ChevronRight size={20} color={theme.colors.secondary} />}
    </View>
  </Pressable>
);

export default function MoreScreen({ navigation }: any) {
  const [hideBalances, setHideBalances]       = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLabel, setBiometricLabel]   = useState('Biometrics');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [smsEnabled, setSmsEnabled]           = useState(false);

  useEffect(() => {
    // Check biometric capability
    getBiometricCapability().then(cap => {
      setBiometricAvailable(cap.isAvailable);
      setBiometricLabel(getBiometricLabel(cap.supportedTypes));
    });
    // Check SMS permission
    checkSMSPermissions().then(status => setSmsEnabled(status === 'granted'));
  }, []);

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const success = await authenticateWithBiometrics(`Confirm ${biometricLabel} to enable app lock`);
      if (success) setBiometricEnabled(true);
    } else {
      setBiometricEnabled(false);
    }
  };

  const handleSMSToggle = async (value: boolean) => {
    if (value) {
      if (Platform.OS === 'ios') {
        Alert.alert('Not Available', 'SMS reading is not supported on iOS.');
        return;
      }
      const status = await requestSMSPermissions();
      if (status === 'granted') {
        setSmsEnabled(true);
      } else {
        Alert.alert(
          'Permission Required',
          'SMS access was denied. Open Settings to grant it manually.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } else {
      // Can only revoke from system settings
      Alert.alert(
        'Disable SMS Access',
        'To revoke SMS access, open your device Settings → Apps → PFinanc → Permissions.',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.workspaceAvatar}>
            <Text style={styles.workspaceAvatarText}>MV</Text>
          </View>
          <View>
            <Text style={styles.workspaceLabel}>WORKSPACE</Text>
            <Text style={styles.workspaceName}>Vasoya Family</Text>
          </View>
        </View>
        <Pressable style={styles.headerIcon}>
          <Bell size={24} color={theme.colors.secondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* User Hero Card */}
        <View style={styles.card}>
          <View style={styles.heroTop}>
            <View style={styles.heroProfileInfo}>
              <View style={styles.heroAvatarContainer}>
                <View style={styles.heroAvatarImage}>
                  <Text style={styles.heroAvatarText}>MV</Text>
                </View>
                <View style={styles.shieldBadge}>
                  <ShieldCheck size={12} color={theme.colors.onPrimary} />
                </View>
              </View>
              <View>
                <View style={styles.heroNameRow}>
                  <Text style={styles.heroName}>Mitesh Vasoya</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>Primary Admin</Text>
                  </View>
                </View>
                <View style={styles.familyContextRow}>
                  <Users size={14} color={theme.colors.primaryContainer} />
                  <Text style={styles.familyContextText}>Vasoya Family (4 Members)</Text>
                </View>
              </View>
            </View>
          </View>
          
          <View style={styles.heroBottom}>
            <View style={styles.memberAvatars}>
              <View style={[styles.memberAvatar, { backgroundColor: theme.colors.primaryContainer, zIndex: 4 }]}>
                <Text style={styles.memberInitials}>MV</Text>
              </View>
              <View style={[styles.memberAvatar, { backgroundColor: theme.colors.tertiaryFixed, zIndex: 3 }]}>
                <Text style={[styles.memberInitials, { color: theme.colors.onTertiaryFixed }]}>DV</Text>
              </View>
              <View style={[styles.memberAvatar, { backgroundColor: theme.colors.surfaceContainerHigh, zIndex: 2 }]}>
                <Text style={[styles.memberInitials, { color: theme.colors.onSurface }]}>KV</Text>
              </View>
              <View style={[styles.memberAvatar, { backgroundColor: theme.colors.surfaceContainerHigh, zIndex: 1 }]}>
                <Text style={[styles.memberInitials, { color: theme.colors.onSurface }]}>BV</Text>
              </View>
            </View>
            <Pressable style={styles.manageFamilyBtn} onPress={() => navigation.navigate('FamilyMembers')}>
              <Text style={styles.manageFamilyText}>Manage Family</Text>
              <ArrowRight size={16} color={theme.colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Family & Accounts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>FAMILY & ACCOUNTS</Text>
            <Text style={styles.sectionSubtitle}>4 active tools</Text>
          </View>
          <View style={styles.cardList}>
            <SettingRow 
              icon={Users} 
              title="Family Members & Permissions" 
              subtitle="Mitesh, Disha, Parents"
              rightElement={
                <View style={styles.pillBadge}>
                  <Text style={styles.pillBadgeText}>4 Profiles</Text>
                </View>
              }
              onPress={() => navigation.navigate('FamilyMembers')}
            />
            <SettingRow 
              icon={Landmark} 
              title="All Accounts" 
              subtitle="Bank, Cash, Wallets"
              rightElement={<Text style={styles.metricText}>6 Linked</Text>}
              onPress={() => navigation.navigate('AllAccounts')}
            />
            <SettingRow 
              icon={PieChart} 
              title="Budgets" 
              subtitle="₹28,500 of ₹50,000 used"
              rightElement={
                <View style={styles.budgetProgressBar}>
                  <View style={[styles.budgetProgressFill, { width: '57%' }]} />
                </View>
              }
              onPress={() => navigation.navigate('Budgets')}
            />
            <SettingRow 
              icon={PiggyBank} 
              title="Savings Goals" 
              subtitle="Emergency Fund, Wedding"
              rightElement={<Text style={styles.metricLabelText}>2 Targets</Text>}
              onPress={() => navigation.navigate('SavingsGoals')}
            />
          </View>
        </View>

        {/* Automation & Data */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AUTOMATION & DATA</Text>
            <Text style={styles.sectionSubtitle}>Zero-cloud sync</Text>
          </View>
          <View style={styles.cardList}>
            <SettingRow 
              icon={MessageSquare} 
              title="SMS & Automatic Detection" 
              subtitle={smsEnabled ? 'Enabled — detecting bank SMS' : 'Allow SMS for auto-transaction detection'}
              showArrow={false}
              rightElement={
                <Switch 
                  value={smsEnabled}
                  onValueChange={handleSMSToggle}
                  trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primaryContainer }}
                  thumbColor="#ffffff"
                />
              }
            />
            <SettingRow 
              icon={FileUp} 
              title="Statement & CSV Import" 
              subtitle="Import bank statements"
              rightElement={<Text style={styles.metricLabelText}>PDF, CSV, OFX</Text>}
              onPress={() => navigation.navigate('StatementImport')}
            />
            <SettingRow 
              icon={BarChart3} 
              title="Analytics & Reports" 
              subtitle="Cash flow & Net Worth trends"
              onPress={() => navigation.navigate('AnalyticsReports')}
            />
          </View>
        </View>

        {/* Preferences & Security */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PREFERENCES & SECURITY</Text>
            <View style={styles.encryptedBadge}>
              <ShieldCheck size={14} color={theme.colors.primaryContainer} />
              <Text style={styles.encryptedText}>Encrypted</Text>
            </View>
          </View>
          <View style={styles.cardList}>
            <SettingRow 
              icon={Fingerprint} 
              title={`App Lock & ${biometricLabel}`}
              subtitle={biometricAvailable ? (biometricEnabled ? 'Active — tap to disable' : 'Enable biometric unlock') : 'No biometric hardware found'}
              showArrow={false}
              rightElement={
                <Switch 
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  disabled={!biometricAvailable}
                  trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primaryContainer }}
                  thumbColor="#ffffff"
                />
              }
            />
            <SettingRow 
              icon={Lock} 
              title="Privacy & On-Device Storage" 
              subtitle="Privacy-first mode"
              rightElement={
                <View style={styles.monoBadge}>
                  <Text style={styles.monoBadgeText}>SQLite Local</Text>
                </View>
              }
              onPress={() => navigation.navigate('AllAccounts')}
            />
            <SettingRow 
              icon={EyeOff} 
              title="Hide Balances" 
              subtitle="Show ₹••••••"
              showArrow={false}
              rightElement={
                <Switch 
                  value={hideBalances} 
                  onValueChange={setHideBalances}
                  trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primaryContainer }}
                  thumbColor="#ffffff"
                />
              }
            />
            <SettingRow 
              icon={Settings} 
              title="Settings" 
              subtitle="Currency, language, notifications"
              onPress={() => navigation.navigate('AppSettings')}
            />
          </View>
        </View>

        {/* Footer Meta */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>PFinanc v1.0.0 • Zero trackers • Swiss Precision</Text>
          <Text style={styles.footerTextDim}>Encrypted database synced on local Wi-Fi only</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surfaceCanvas || '#F8FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.gutterMobile,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceCanvas,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workspaceAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workspaceAvatarText: {
    ...theme.typography.labelMd,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  workspaceLabel: {
    ...theme.typography.labelSm,
    color: theme.colors.secondary,
  },
  workspaceName: {
    ...theme.typography.headlineSm,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: theme.spacing.gutterMobile,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.subtle,
  },
  heroTop: {
    padding: theme.spacing.lg,
  },
  heroProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroAvatarContainer: {
    position: 'relative',
  },
  heroAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: theme.colors.primaryContainer,
    backgroundColor: theme.colors.primaryFixed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAvatarText: {
    ...theme.typography.headlineSm,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  shieldBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryContainer,
    borderWidth: 2,
    borderColor: theme.colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroName: {
    ...theme.typography.headlineSm,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  roleBadge: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    ...theme.typography.labelSm,
    color: theme.colors.secondary,
  },
  familyContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  familyContextText: {
    ...theme.typography.bodySm,
    color: theme.colors.secondary,
  },
  heroBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceSubtle,
  },
  memberAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surfaceCard,
    marginLeft: -8, // overlap
  },
  memberInitials: {
    ...theme.typography.labelSm,
    color: theme.colors.onPrimary,
    fontWeight: '600',
  },
  manageFamilyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  manageFamilyText: {
    ...theme.typography.labelLg,
    color: theme.colors.primary,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    ...theme.typography.labelMd,
    color: theme.colors.secondary,
  },
  sectionSubtitle: {
    ...theme.typography.labelSm,
    color: theme.colors.secondary,
  },
  encryptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  encryptedText: {
    ...theme.typography.labelSm,
    fontWeight: '600',
    color: theme.colors.tertiary,
  },
  cardList: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  rowTitle: {
    ...theme.typography.bodyMd,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  rowSubtitle: {
    ...theme.typography.bodySm,
    color: theme.colors.secondary,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillBadge: {
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillBadgeText: {
    ...theme.typography.labelSm,
    color: theme.colors.primary,
  },
  metricText: {
    ...theme.typography.financialMetricSm,
    color: theme.colors.onSurface,
  },
  budgetProgressBar: {
    width: 64,
    height: 6,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 3,
    overflow: 'hidden',
    display: 'flex',
  },
  budgetProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: 3,
  },
  metricLabelText: {
    ...theme.typography.labelSm,
    color: theme.colors.secondary,
  },
  activeBadge: {
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
  },
  activeBadgeText: {
    ...theme.typography.labelSm,
    fontWeight: '700',
    color: theme.colors.onPrimary,
  },
  activeText: {
    ...theme.typography.labelSm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  monoBadge: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  monoBadgeText: {
    ...theme.typography.labelSm,
    fontFamily: 'JetBrains Mono', // Force mono if configured
    color: theme.colors.onSurface,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    ...theme.typography.labelSm,
    color: theme.colors.secondary,
  },
  footerTextDim: {
    ...theme.typography.labelSm,
    color: theme.colors.outline,
  },
});
