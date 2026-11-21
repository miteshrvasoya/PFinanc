import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FamilyScopeModal } from '../components/FamilyScopeModal';
import { InviteMemberModal } from '../components/InviteMemberModal';
import { apiClient } from '../api/client';


export const MoreScreen: React.FC<{ onNavigate?: (screen: string) => void }> = ({ onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [isPrivacyMasked, setIsPrivacyMasked] = useState(false);
  const [activeTab, setActiveTab] = useState<'personal' | 'family'>('family');
  const [isScopeModalVisible, setIsScopeModalVisible] = useState(false);
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);

  const [netWorthPersonal, setNetWorthPersonal] = useState(0);
  const [netWorthFamily, setNetWorthFamily] = useState(0);

  useEffect(() => {
    const fetchNetWorth = async () => {
      try {
        const [resFam, resPers] = await Promise.all([
          apiClient.get('/api/dashboard?view=household'),
          apiClient.get('/api/dashboard?view=personal')
        ]);
        if (resFam.success) {
          setNetWorthFamily(resFam.data.netWorth?.netWorth || 0);
        }
        if (resPers.success) {
          setNetWorthPersonal(resPers.data.netWorth?.netWorth || 0);
        }
      } catch (err) {
        console.error('Failed to fetch net worth', err);
      }
    };
    fetchNetWorth();
  }, []);

  const togglePrivacy = () => setIsPrivacyMasked(!isPrivacyMasked);

  const formatCurrency = (val: number) => `₹${Math.abs(val || 0).toLocaleString('en-IN')}`;

  // Computed display value
  const wealthFigure = isPrivacyMasked
    ? '••••••••'
    : activeTab === 'personal'
    ? formatCurrency(netWorthPersonal)
    : formatCurrency(netWorthFamily);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJ1_vKqcEx3MKozjmMDSydeIofcGQOBZy_P3LF8gilwTXRgUp7BVO_AssnX2AZMbDcukgYlkbcWy1LtL8ZpoCABD8m6damHq3XnfA9RGJOKwf2yPMO6PHgP32JqyMD9qXAaohBPBDnJobwOKvTENzQvWCmRD2qKC5pwBowOIS2AaccOwHnMAAe-mteRVG6ElzHu_3UB9XbSTnVbX5zm5tmHywJtigqosmMN4D4oQWnda2PwS7iHtOLdw' }}
              style={styles.avatar}
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>PFinanc</Text>
            <View style={styles.headerSubtitleRow}>
              <View style={styles.headerDot} />
              <Text style={styles.headerSubtitle}>Private Sovereign Vault</Text>
            </View>
          </View>
        </View>
        <Pressable style={styles.iconButton} onPress={togglePrivacy}>
          <MaterialIcons 
            name={isPrivacyMasked ? "visibility-off" : "visibility"} 
            size={20} 
            color={colors.primary} 
          />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* User & Household Header Card */}
        <View style={styles.card}>
          <View style={styles.userRow}>
            <View style={styles.userInfo}>
              <View style={styles.userInitials}>
                <Text style={styles.userInitialsText}>MV</Text>
              </View>
              <View>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>Mitesh Vasoya</Text>
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>Admin</Text>
                  </View>
                </View>
                <Text style={styles.userEmail}>mitesh@vasoya.family</Text>
              </View>
            </View>
            <Pressable style={styles.scopeSelector} onPress={() => setIsScopeModalVisible(true)}>
              <MaterialIcons name="groups" size={16} color={colors.primary} />
              <Text style={styles.scopeSelectorText}>Vasoya Family (4)</Text>
              <MaterialIcons name="expand-more" size={16} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={18} color={colors.onSurfaceVariant} style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search accounts, insights, settings..."
              placeholderTextColor="rgba(65, 72, 68, 0.7)"
            />
            <View style={styles.searchShortcut}>
              <Text style={styles.searchShortcutText}>⌘K</Text>
            </View>
          </View>
        </View>

        {/* Personal vs Family Finances Switcher Tile */}
        <View style={styles.card}>
          <View style={styles.switcher}>
            <Pressable 
              style={[styles.switchBtn, activeTab === 'personal' && styles.switchBtnActive]}
              onPress={() => setActiveTab('personal')}
            >
              <Text style={[styles.switchBtnText, activeTab === 'personal' && styles.switchBtnTextActive]}>
                My Finances
              </Text>
            </Pressable>
            <Pressable 
              style={[styles.switchBtn, activeTab === 'family' && styles.switchBtnActive]}
              onPress={() => setActiveTab('family')}
            >
              <Text style={[styles.switchBtnText, activeTab === 'family' && styles.switchBtnTextActive]}>
                Family Finances
              </Text>
            </Pressable>
          </View>

          <View style={styles.summaryBanner}>
            <View>
              <Text style={styles.bannerLabel}>COMBINED NET WORTH</Text>
              <View style={styles.bannerAmountRow}>
                <Text style={[
                  styles.bannerAmount,
                  isPrivacyMasked && { letterSpacing: 4, opacity: 0.6 }
                ]}>
                  {wealthFigure}
                </Text>
                <View style={styles.bannerGrowth}>
                  <MaterialIcons name="north-east" size={12} color={colors.primaryContainer} />
                  <Text style={styles.bannerGrowthText}>+4.2%</Text>
                </View>
              </View>
            </View>
            <View style={styles.bannerRight}>
              <Text style={styles.bannerLabel}>Sync Status</Text>
              <View style={styles.syncRow}>
                <View style={styles.syncDot} />
                <Text style={styles.syncText}>4 Active Members</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Module 1: Financial Management */}
        <View style={styles.moduleSection}>
          <View style={styles.moduleHeader}>
            <Text style={styles.moduleTitle}>FINANCIAL MANAGEMENT</Text>
            <Text style={styles.moduleSubtitle}>Core Ledger</Text>
          </View>
          <View style={styles.moduleCard}>
            <Pressable style={styles.moduleItem} onPress={() => onNavigate && onNavigate('accounts')}>
              <View style={styles.moduleItemLeft}>
                <View style={styles.moduleIconBox}>
                  <MaterialIcons name="account-balance" size={22} color={colors.primaryContainer} />
                </View>
                <View>
                  <View style={styles.moduleItemTitleRow}>
                    <Text style={styles.moduleItemTitle}>Accounts</Text>
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>5 Active</Text>
                    </View>
                  </View>
                  <Text style={styles.moduleItemDesc}>Manage 5 bank accounts, cards & cash</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.moduleItem} onPress={() => onNavigate && onNavigate('insights')}>
              <View style={styles.moduleItemLeft}>
                <View style={styles.moduleIconBox}>
                  <MaterialIcons name="analytics" size={22} color={colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.moduleItemTitle}>Insights & Cash Flow</Text>
                  <Text style={styles.moduleItemDesc}>Cash flow, category trends & net worth analytics</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.moduleItem} onPress={() => onNavigate && onNavigate('imports')}>
              <View style={styles.moduleItemLeft}>
                <View style={styles.moduleIconBox}>
                  <MaterialIcons name="description" size={22} color={colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.moduleItemTitle}>Imports & Statements</Text>
                  <Text style={styles.moduleItemDesc}>Bank CSV, PDF statement parser & reconciliation</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
            </Pressable>
          </View>
        </View>

        {/* Module 2: Family & Household */}
        <View style={styles.moduleSection}>
          <View style={styles.moduleHeader}>
            <Text style={styles.moduleTitle}>FAMILY & HOUSEHOLD</Text>
            <Text style={styles.moduleSubtitle}>Multi-Member Vault</Text>
          </View>
          <View style={styles.moduleCard}>
            <Pressable style={styles.moduleItem} onPress={() => onNavigate && onNavigate('familyMember')}>
              <View style={styles.moduleItemLeft}>
                <View style={styles.moduleIconBox}>
                  <MaterialIcons name="diversity-3" size={22} color={colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.moduleItemTitle}>Family Overview</Text>
                  <Text style={styles.moduleItemDesc}>Manage Disha, Father, Mother & shared budgets</Text>
                </View>
              </View>
              <View style={styles.moduleItemRightIcons}>
                <View style={styles.avatarGroup}>
                  <View style={[styles.avatarMini, { backgroundColor: colors.primaryFixed, zIndex: 3 }]}><Text style={[styles.avatarMiniText, { color: colors.onPrimaryFixed }]}>D</Text></View>
                  <View style={[styles.avatarMini, { backgroundColor: colors.secondaryFixed, zIndex: 2 }]}><Text style={[styles.avatarMiniText, { color: colors.onSecondaryFixed }]}>F</Text></View>
                  <View style={[styles.avatarMini, { backgroundColor: 'rgba(200, 230, 255, 1)', zIndex: 1 }]}><Text style={[styles.avatarMiniText, { color: '#001e2e' }]}>M</Text></View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
              </View>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.moduleItem}>
              <View style={styles.moduleItemLeft}>
                <View style={styles.moduleIconBox}>
                  <MaterialIcons name="admin-panel-settings" size={22} color={colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.moduleItemTitle}>Permissions & Roles</Text>
                  <Text style={styles.moduleItemDesc}>Control access: View-only, Transactions, Full access</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.moduleItem} onPress={() => setIsInviteModalVisible(true)}>
              <View style={styles.moduleItemLeft}>
                <View style={[styles.moduleIconBox, { backgroundColor: 'rgba(192, 236, 214, 0.4)' }]}>
                  <MaterialIcons name="person-add" size={22} color={colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.moduleItemTitle}>Invite Family Member</Text>
                  <Text style={styles.moduleItemDesc}>Send invitation via Phone/Email</Text>
                </View>
              </View>
              <MaterialIcons name="arrow-forward" size={20} color={colors.primaryContainer} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.moduleItem} onPress={() => onNavigate && onNavigate('vaultIntro')}>
              <View style={styles.moduleItemLeft}>
                <View style={styles.moduleIconBox}>
                  <MaterialIcons name="security" size={22} color={colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.moduleItemTitle}>Vault Security</Text>
                  <Text style={styles.moduleItemDesc}>Manage your household's secure vault</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
            </Pressable>
          </View>
        </View>

        {/* Module 3: Intelligence & Automation */}
        <View style={styles.moduleSection}>
          <View style={styles.moduleHeader}>
            <Text style={styles.moduleTitle}>INTELLIGENCE & AUTOMATION</Text>
            <Text style={styles.moduleSubtitle}>Local Inference</Text>
          </View>
          <View style={styles.moduleCard}>
            <Pressable style={styles.moduleItem} onPress={() => onNavigate && onNavigate('advisor')}>
              <View style={styles.moduleItemLeft}>
                <View style={styles.moduleIconBox}>
                  <MaterialIcons name="psychology" size={22} color={colors.primaryContainer} />
                </View>
                <View>
                  <View style={styles.moduleItemTitleRow}>
                    <Text style={styles.moduleItemTitle}>AI Advisor</Text>
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>Private LLM</Text>
                    </View>
                  </View>
                  <Text style={styles.moduleItemDesc}>Contextual insights and natural language queries</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.moduleItem} onPress={() => onNavigate && onNavigate('smsReview')}>
              <View style={styles.moduleItemLeft}>
                <View style={styles.moduleIconBox}>
                  <MaterialIcons name="sms" size={22} color={colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.moduleItemTitle}>Automation & SMS</Text>
                  <Text style={styles.moduleItemDesc}>SMS transaction parsing, auto-categorization rules</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
            </Pressable>
          </View>
        </View>

        {/* Module 4: Preferences & System */}
        <View style={styles.moduleSection}>
          <View style={styles.moduleHeader}>
            <Text style={styles.moduleTitle}>PREFERENCES & SYSTEM</Text>
            <Text style={styles.moduleSubtitle}>Configuration</Text>
          </View>
          <View style={styles.moduleCard}>
            <Pressable style={styles.moduleItem} onPress={() => onNavigate && onNavigate('notifications')}>
              <View style={styles.moduleItemLeft}>
                <View style={styles.moduleIconBox}>
                  <MaterialIcons name="notifications" size={22} color={colors.primaryContainer} />
                </View>
                <View>
                  <View style={styles.moduleItemTitleRow}>
                    <Text style={styles.moduleItemTitle}>Notifications</Text>
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>2</Text>
                    </View>
                  </View>
                  <Text style={styles.moduleItemDesc}>Alerts for review, bill reminders, family updates</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.moduleItem} onPress={() => onNavigate && onNavigate('security')}>
              <View style={styles.moduleItemLeft}>
                <View style={styles.moduleIconBox}>
                  <MaterialIcons name="fingerprint" size={22} color={colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.moduleItemTitle}>Security & Biometrics</Text>
                  <Text style={styles.moduleItemDesc}>App lock, FaceID/Fingerprint, PIN, active sessions</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.moduleItem}>
              <View style={styles.moduleItemLeft}>
                <View style={styles.moduleIconBox}>
                  <MaterialIcons name="shield" size={22} color={colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.moduleItemTitle}>Privacy & Data</Text>
                  <Text style={styles.moduleItemDesc}>Balance hiding, local-first storage, export/backup</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.moduleItem}>
              <View style={styles.moduleItemLeft}>
                <View style={styles.moduleIconBox}>
                  <MaterialIcons name="palette" size={22} color={colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.moduleItemTitle}>Appearance</Text>
                  <Text style={styles.moduleItemDesc}>System, Light, Dark mode, reduced motion</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.moduleItem}>
              <View style={styles.moduleItemLeft}>
                <View style={styles.moduleIconBox}>
                  <MaterialIcons name="code" size={22} color={colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.moduleItemTitle}>Help & Open Source</Text>
                  <Text style={styles.moduleItemDesc}>Documentation, FAQ, GitHub repo, privacy policy</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
            </Pressable>
          </View>
        </View>

        {/* Footer Signature */}
        <View style={styles.footerSignature}>
          <Text style={styles.footerLine1}>PFINANC V2.4.0 (BUILD 2024)</Text>
          <Text style={styles.footerLine2}>Encrypted & Sovereign • Hosted on Private Household Mesh</Text>
        </View>

        {/* Bottom padding for Nav */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modals */}
      <FamilyScopeModal visible={isScopeModalVisible} onClose={() => setIsScopeModalVisible(false)} />
      <InviteMemberModal visible={isInviteModalVisible} onClose={() => setIsInviteModalVisible(false)} />
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.2)',
    backgroundColor: colors.surface,
    zIndex: 40,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerHigh,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20, // headline-md
    color: colors.primary,
    lineHeight: 24,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryContainer,
  },
  headerSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 20,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    shadowColor: 'rgba(13, 56, 41, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
    gap: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userInitials: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitialsText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 20,
    color: colors.onPrimary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: colors.primary,
  },
  adminBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  adminBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onPrimaryFixed,
  },
  userEmail: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  scopeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  scopeSelectorText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurface,
  },
  searchShortcut: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  searchShortcutText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.outline,
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    padding: 4,
    borderRadius: 12,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  switchBtnActive: {
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  switchBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  switchBtnTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(238, 245, 242, 0.7)', // surface-container-low/70
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
  },
  bannerLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 2,
  },
  bannerAmount: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: colors.primary,
  },
  bannerGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 236, 214, 0.6)', // primary-fixed/60
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  bannerGrowthText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.primaryContainer,
  },
  bannerRight: {
    alignItems: 'flex-end',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669', // emerald-600
  },
  syncText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.primary,
  },
  moduleSection: {
    gap: 8,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  moduleTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moduleSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.outline,
  },
  moduleCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    shadowColor: 'rgba(13, 56, 41, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
    overflow: 'hidden',
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  moduleItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    paddingRight: 16,
  },
  moduleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moduleItemTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.primary,
  },
  activeBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onPrimaryFixed,
  },
  aiBadge: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  aiBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.onSecondaryContainer,
  },
  notifBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: colors.onError,
  },
  moduleItemDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(193, 200, 194, 0.2)', // outline-variant/20
  },
  moduleItemRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMini: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8, // overlap
  },
  avatarMiniText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
  },
  footerSignature: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  footerLine1: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  footerLine2: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.outline,
  },
});
