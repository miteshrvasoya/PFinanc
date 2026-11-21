import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { comingSoon } from '../utils/notify';

export const FamilyMemberScreen: React.FC<{ onBack?: () => void; onNavigate?: (screen: string, params?: { filter?: string }) => void }> = ({ onBack, onNavigate }) => {
  const go = (screen: string, params?: { filter?: string }) => onNavigate && onNavigate(screen, params);
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState('Co-Manager');
  const [canViewNetWorth, setCanViewNetWorth] = useState(true);
  const [canManageTrans, setCanManageTrans] = useState(true);
  const [canViewInvest, setCanViewInvest] = useState(true);

  const roles = ['View-Only', 'Contributor', 'Co-Manager', 'Full Admin'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
          <View>
            <Text style={styles.headerSubtitle}>VASOYA FAMILY VAULT</Text>
            <Text style={styles.headerTitle}>Member Details & Access</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
          <Pressable style={styles.moreBtn} onPress={() => comingSoon('More vert')}>
            <MaterialIcons name="more-vert" size={24} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarBox}>
                <Image 
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC7253awpiQiC19OYPVFwDEctnr72GusqqIh5Y6W9k9MchTAkzc-df0k8-D6Vfv6QDm_kTAX5RDzXEAEZhqm9w_lq-KCYMglS5RlP8SlZ41lg_YB7YBDjCgGJSTqOS_rWT85IuZi1i4QPMBvkWQE4J3gM9jZzGUzvBtMs0aBxFJ5JBYfDN_SCHVCzrPGJTYhQPplXcrcme43JzUBQVUBE8UCpu8uIEgBQwgo7zwibghYhUE7CuRN8c-MA' }}
                  style={styles.avatarImage}
                />
              </View>
              <View style={styles.onlineDotBorder}>
                <View style={styles.onlineDot} />
              </View>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName} numberOfLines={1}>Disha Vasoya</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>Co-Manager</Text>
                </View>
              </View>
              <Text style={styles.profileContact}>disha@vasoya.family • +91 98201 •••••</Text>
              <View style={styles.syncRow}>
                <MaterialIcons name="sync" size={12} color={colors.outline} />
                <Text style={styles.syncText}>Active • Last synced 2 hours ago</Text>
              </View>
            </View>
          </View>

          <View style={styles.quickActions}>
            <Pressable style={styles.actionBtn} onPress={() => comingSoon('Send Ping')}>
              <MaterialIcons name="send" size={16} color={colors.primary} />
              <Text style={styles.actionBtnText}>Send Ping</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => go('audit')}>
              <MaterialIcons name="history" size={16} color={colors.primary} />
              <Text style={styles.actionBtnText}>Audit Log</Text>
            </Pressable>
          </View>
        </View>

        {/* Financial Boundary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Financial Boundary</Text>
            <Text style={styles.sectionSubtitle}>Vasoya Household Pool</Text>
          </View>
          
          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <View style={styles.gridItemHeader}>
                <Text style={styles.gridItemTitle}>Shared Pool Balance</Text>
                <View style={styles.gridItemIconPrimary}>
                  <MaterialIcons name="account-balance" size={18} color={colors.primary} />
                </View>
              </View>
              <View style={styles.gridItemContent}>
                <Text style={styles.gridItemValue}>₹4,85,000</Text>
                <Text style={styles.gridItemDesc}>Linked: ICICI Joint Savings + PPF</Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <View style={styles.gridItemHeader}>
                <Text style={styles.gridItemTitle}>Monthly Contribution</Text>
                <View style={styles.gridItemIconSecondary}>
                  <MaterialIcons name="event-repeat" size={18} color={colors.onSurfaceVariant} />
                </View>
              </View>
              <View style={styles.gridItemContent}>
                <Text style={styles.gridItemValue}>₹25,000 <Text style={styles.gridItemValueSmall}>/ mo</Text></Text>
                <Text style={styles.gridItemDescPrimary}>Auto-recorded rule active</Text>
              </View>
            </View>
          </View>

          <View style={styles.isolationBanner}>
            <View style={styles.isolationIconBox}>
              <MaterialIcons name="shield" size={18} color={colors.primary} />
            </View>
            <View style={styles.isolationContent}>
              <Text style={styles.isolationTitle}>2 private personal accounts masked</Text>
              <Text style={styles.isolationDesc}>Personal salary & individual holdings stay strictly sovereign and invisible to family members.</Text>
            </View>
            <MaterialIcons name="lock" size={20} color={colors.outline} />
          </View>
        </View>

        {/* Permissions & Authority */}
        <View style={styles.permissionsCard}>
          <Text style={styles.sectionTitle}>Permissions & Authority</Text>
          <Text style={styles.sectionDesc}>Control what Disha can view, approve, or edit in the household ledger.</Text>

          <View style={styles.roleSwitcherWrapper}>
            <Text style={styles.roleSwitcherLabel}>VAULT ROLE LEVEL</Text>
            <View style={styles.roleSwitcher}>
              {roles.map(r => (
                <Pressable 
                  key={r}
                  style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                    {r}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.permissionsList}>
            <View style={styles.permissionItem}>
              <View style={styles.permissionItemLeft}>
                <Text style={styles.permissionTitle}>View Household Net Worth & Insights</Text>
                <Text style={styles.permissionDesc}>Can view aggregated family totals without seeing individual personal account balances.</Text>
              </View>
              <Switch 
                value={canViewNetWorth} 
                onValueChange={setCanViewNetWorth}
                trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                thumbColor={colors.onPrimary}
              />
            </View>
            
            <View style={styles.permissionItem}>
              <View style={styles.permissionItemLeft}>
                <Text style={styles.permissionTitle}>Transactions & Tagging</Text>
                <Text style={styles.permissionDesc}>Can record shared household expenses and approve auto-detected bills and groceries.</Text>
              </View>
              <Switch 
                value={canManageTrans} 
                onValueChange={setCanManageTrans}
                trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                thumbColor={colors.onPrimary}
              />
            </View>

            <View style={styles.permissionItem}>
              <View style={styles.permissionItemLeft}>
                <Text style={styles.permissionTitle}>Investment & Portfolio Visibility</Text>
                <Text style={styles.permissionDesc}>Can view family mutual funds, sovereign gold bonds, and recurring deposits.</Text>
              </View>
              <Switch 
                value={canViewInvest} 
                onValueChange={setCanViewInvest}
                trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                thumbColor={colors.onPrimary}
              />
            </View>

            <View style={[styles.permissionItem, { opacity: 0.75 }]}>
              <View style={styles.permissionItemLeft}>
                <View style={styles.titleWithLock}>
                  <Text style={styles.permissionTitle}>Bank & Statement Imports</Text>
                  <MaterialIcons name="lock" size={14} color={colors.outline} />
                </View>
                <Text style={styles.permissionDesc}>Only Primary Admin (Mitesh Vasoya) can upload raw bank statements or OTP-bind feeds.</Text>
              </View>
              <Switch 
                value={false} 
                disabled
                trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                thumbColor={colors.onPrimary}
              />
            </View>

            <View style={[styles.permissionItem, { borderBottomWidth: 0, opacity: 0.75 }]}>
              <View style={styles.permissionItemLeft}>
                <View style={styles.titleWithLock}>
                  <Text style={styles.permissionTitle}>Manage Other Members & Roles</Text>
                  <MaterialIcons name="lock" size={14} color={colors.outline} />
                </View>
                <Text style={styles.permissionDesc}>Restricted strictly to Primary Household Admin to prevent role escalation.</Text>
              </View>
              <Switch 
                value={false} 
                disabled
                trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                thumbColor={colors.onPrimary}
              />
            </View>
          </View>
        </View>

        {/* Linked Accounts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shared Accounts in Vault</Text>
            <View style={styles.accountsBadge}>
              <Text style={styles.accountsBadgeText}>2 Active Assets</Text>
            </View>
          </View>
          
          <View style={styles.accountCard}>
            <View style={styles.accountLeft}>
              <View style={styles.accountIconBox}>
                <MaterialIcons name="account-balance" size={20} color={colors.primaryContainer} />
              </View>
              <View>
                <Text style={styles.accountTitle}>ICICI Joint Household</Text>
                <Text style={styles.accountSubtitle}>A/c •••• 4092 • Primary Shared</Text>
              </View>
            </View>
            <View style={styles.accountRight}>
              <Text style={styles.accountAmount}>₹1,85,000</Text>
              <View style={styles.syncStatus}>
                <View style={styles.syncStatusDot} />
                <Text style={styles.syncStatusText}>Active Sync</Text>
              </View>
            </View>
          </View>

          <View style={styles.accountCard}>
            <View style={styles.accountLeft}>
              <View style={styles.accountIconBox}>
                <MaterialIcons name="school" size={20} color={colors.primaryContainer} />
              </View>
              <View>
                <Text style={styles.accountTitle}>HDFC Children Education Fund</Text>
                <Text style={styles.accountSubtitle}>Portfolio ID •••• 8821 • Co-owned</Text>
              </View>
            </View>
            <View style={styles.accountRight}>
              <Text style={styles.accountAmount}>₹3,00,000</Text>
              <Text style={styles.accountSubtitleRight}>Verified Co-owner</Text>
            </View>
          </View>

          <Pressable style={styles.grantAccessBtn} onPress={() => comingSoon('Grant Access to Another Account')}>
            <MaterialIcons name="add" size={20} color={colors.primaryContainer} />
            <Text style={styles.grantAccessBtnText}>Grant Access to Another Account</Text>
          </Pressable>
        </View>

        {/* Footer Actions */}
        <View style={styles.footerActionsSection}>
          <View style={styles.privacyInfoBox}>
            <MaterialIcons name="verified-user" size={18} color={colors.primaryContainer} />
            <Text style={styles.privacyInfoText}>
              <Text style={styles.privacyInfoTextBold}>Privacy-First Architecture: </Text>
              Personal spending outside explicitly shared household categories remains strictly isolated and cannot be viewed by other family members.
            </Text>
          </View>

          <Pressable style={styles.primaryActionBtn} onPress={() => comingSoon('Save Permission Changes')}>
            <MaterialIcons name="check-circle" size={18} color={colors.onPrimary} />
            <Text style={styles.primaryActionBtnText}>Save Permission Changes</Text>
          </Pressable>

          <Pressable style={styles.secondaryActionBtn} onPress={() => comingSoon('Remove from Family Vault')}>
            <MaterialIcons name="person-remove" size={18} color={colors.error} />
            <Text style={styles.secondaryActionBtnText}>Remove from Family Vault</Text>
          </Pressable>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(244, 251, 247, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.2)',
    zIndex: 40,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.outline,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: colors.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.onPrimaryFixed,
  },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 16,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.25)',
    shadowColor: 'rgba(13, 56, 41, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: 'rgba(192, 236, 214, 0.4)',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  onlineDotBorder: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primaryContainer,
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryFixed,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 20,
    color: colors.primary,
  },
  roleBadge: {
    backgroundColor: 'rgba(192, 236, 214, 0.6)', // primary-fixed/60
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onPrimaryFixedVariant,
  },
  profileContact: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  syncText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.outline,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.15)',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    borderRadius: 12,
  },
  actionBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.primary,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: colors.primary,
  },
  sectionSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.outline,
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  gridItem: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    shadowColor: 'rgba(13, 56, 41, 0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 1,
    justifyContent: 'space-between',
  },
  gridItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gridItemTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    flex: 1,
    paddingRight: 8,
  },
  gridItemIconPrimary: {
    backgroundColor: 'rgba(192, 236, 214, 0.4)',
    padding: 4,
    borderRadius: 8,
  },
  gridItemIconSecondary: {
    backgroundColor: colors.surfaceContainer,
    padding: 4,
    borderRadius: 8,
  },
  gridItemContent: {
    marginTop: 12,
  },
  gridItemValue: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 22,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  gridItemValueSmall: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.outline,
    letterSpacing: 0,
  },
  gridItemDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.outline,
    marginTop: 4,
  },
  gridItemDescPrimary: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onPrimaryFixedVariant,
    marginTop: 4,
  },
  isolationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
  },
  isolationIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  isolationContent: {
    flex: 1,
  },
  isolationTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  isolationDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.outline,
    marginTop: 2,
  },
  permissionsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.25)',
    shadowColor: 'rgba(13, 56, 41, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
    gap: 16,
  },
  sectionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.outline,
    marginTop: 2,
  },
  roleSwitcherWrapper: {
    marginTop: 4,
  },
  roleSwitcherLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.outline,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  roleSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    padding: 4,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
  },
  roleBtnActive: {
    backgroundColor: colors.primaryContainer,
  },
  roleBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  roleBtnTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.onPrimary,
  },
  permissionsList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.15)',
    paddingTop: 8,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.15)',
  },
  permissionItemLeft: {
    flex: 1,
    paddingRight: 16,
  },
  titleWithLock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  permissionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.primary,
  },
  permissionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.outline,
    marginTop: 2,
  },
  accountsBadge: {
    backgroundColor: 'rgba(192, 236, 214, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  accountsBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onPrimaryFixedVariant,
  },
  accountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    shadowColor: 'rgba(13, 56, 41, 0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 1,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.primary,
  },
  accountSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.outline,
    marginTop: 2,
  },
  accountRight: {
    alignItems: 'flex-end',
  },
  accountAmount: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 22,
    color: colors.primary,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  syncStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryContainer,
  },
  syncStatusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.primaryContainer,
  },
  accountSubtitleRight: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.outline,
    marginTop: 2,
  },
  grantAccessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(13, 56, 41, 0.4)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(13, 56, 41, 0.05)',
  },
  grantAccessBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.primaryContainer,
  },
  footerActionsSection: {
    marginTop: 8,
    gap: 10,
  },
  privacyInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
  },
  privacyInfoText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  privacyInfoTextBold: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryContainer,
    height: 52,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryActionBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onPrimary,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    borderRadius: 12,
  },
  secondaryActionBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.error,
  },
});
