import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { getMaterialIcon } from '../utils/iconMapper';

type HomeProps = { onNavigate?: (screen: string, params?: { filter?: string }) => void };

const greetingForHour = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export const HomeScreen: React.FC<HomeProps> = ({ onNavigate }) => {
  const go = (screen: string, params?: { filter?: string }) => onNavigate && onNavigate(screen, params);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [isPrivacyMasked, setIsPrivacyMasked] = useState(false);
  const [scopeDropdownVisible, setScopeDropdownVisible] = useState(false);
  const [currentScope, setCurrentScope] = useState('Household');
  
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const view = currentScope === 'Personal' ? 'personal' : 'household';
        const res = await apiClient.get(`/api/dashboard?view=${view}`);
        if (res.success) {
          setDashboardData(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [currentScope]);

  const togglePrivacy = () => setIsPrivacyMasked(!isPrivacyMasked);

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  const getBalance = (key: string, fallback: string = '₹0') => {
    if (isPrivacyMasked) return "₹••••••";
    if (!dashboardData) return fallback;
    
    switch(key) {
      case 'netWorth': return formatCurrency(dashboardData.netWorth?.netWorth || 0);
      case 'assets': return formatCurrency(dashboardData.netWorth?.totalAssets || 0);
      case 'liabilities': return formatCurrency(dashboardData.netWorth?.totalLiabilities || 0);
      case 'cashIn': return formatCurrency(dashboardData.thisMonth?.income || 0);
      case 'cashOut': return formatCurrency(dashboardData.thisMonth?.expenses || 0);
      case 'cashSaved': return formatCurrency(dashboardData.thisMonth?.netCashFlow || 0);
      case 'investVal': return formatCurrency(dashboardData.portfolio?.totalCurrentValue || 0);
      case 'investCost': return formatCurrency(dashboardData.portfolio?.totalInvested || 0);
      default: return fallback;
    }
  };

  const income = dashboardData?.thisMonth?.income || 0;
  const expenses = dashboardData?.thisMonth?.expenses || 0;
  const spentPct = income > 0 ? Math.min(100, (expenses / income) * 100) : 0;
  const savedPct = income > 0 ? Math.max(0, 100 - spentPct) : 0;
  const netCash = dashboardData?.thisMonth?.netCashFlow || 0;
  const invGain = (dashboardData?.portfolio?.totalCurrentValue || 0) - (dashboardData?.portfolio?.totalInvested || 0);
  const invInvested = dashboardData?.portfolio?.totalInvested || 0;
  const invGainPct = invInvested > 0 ? (invGain / invInvested) * 100 : 0;

  const getTxnAmount = (val: number) => {
    if (isPrivacyMasked) return "••••";
    return formatCurrency(val);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Navigation Anchor */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBFxYYVilNLwGOTXhsDqxUmFXXfd8STzChPE9caQM_7ueraY338an6OLeXSonfSe1V6OLvVq42wmoO7JqxGoVsekGv8PoYXx2ZtHdQkCnoDZl1NoVdhvHIZlvyvpnjBgt0WzGxQH3RJUdVQhnVjH2pfINHcX0rHqUJQbfRKgExO3WNamig8kA7rT2hxw4wuBymAfbGcqI-qb1cbVPzdiz3V-a8VxDlzDswN-rh473xGjQn4nEmRH288GA' }}
              style={styles.avatar}
            />
            <View style={styles.statusDot} />
          </View>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.greeting}>{greetingForHour()}, {(user?.name || 'there').split(' ')[0]}</Text>
            <Pressable 
              style={styles.scopeButton} 
              onPress={() => setScopeDropdownVisible(!scopeDropdownVisible)}
            >
              <Text style={styles.scopeText}>{currentScope}</Text>
              <MaterialIcons name="arrow-drop-down" size={16} color={colors.onSurfaceVariant} />
            </Pressable>
            {scopeDropdownVisible && (
              <View style={styles.scopeMenu}>
                {['Household', 'Personal'].map(scope => (
                  <Pressable
                    key={scope}
                    style={styles.scopeMenuItem}
                    onPress={() => { setCurrentScope(scope); setScopeDropdownVisible(false); }}
                  >
                    <Text style={[styles.scopeMenuText, currentScope === scope && { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{scope}</Text>
                    {currentScope === scope && <MaterialIcons name="check" size={14} color={colors.primary} />}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton} onPress={togglePrivacy}>
            <MaterialIcons 
              name={isPrivacyMasked ? "visibility-off" : "visibility"} 
              size={22} 
              color={colors.primary} 
            />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => go('notifications')}>
            <MaterialIcons name="notifications" size={22} color={colors.primary} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>2</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Net Worth Hero Card */}
        <Pressable onPress={() => go('insights')}>
        <LinearGradient 
          colors={[colors.primaryContainer, '#07241a', '#04150f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroGlow} />
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroSubtitle}>NET WORTH</Text>
              <Text style={styles.heroTitle}>{getBalance('netWorth')}</Text>
            </View>
            <View style={styles.heroBadge}>
              <MaterialIcons name="trending-up" size={14} color={colors.primaryFixed} />
              <Text style={styles.heroBadgeText}>{isPrivacyMasked ? '••••' : `${netCash >= 0 ? '+' : '-'}${formatCurrency(Math.abs(netCash))}`}</Text>
            </View>
          </View>
          <Text style={styles.heroNote}>This month across {dashboardData?.cashPosition?.accounts?.length ?? 0} unified accounts</Text>
          <View style={styles.heroDivider} />
          <View style={styles.heroSplit}>
            <View style={styles.heroSplitItem}>
              <Text style={styles.heroSplitLabel}>Total Assets</Text>
              <Text style={styles.heroSplitValue}>{getBalance('assets')}</Text>
            </View>
            <View style={[styles.heroSplitItem, styles.heroSplitBorder]}>
              <Text style={styles.heroSplitLabel}>Total Liabilities</Text>
              <Text style={styles.heroSplitValueSecondary}>{getBalance('liabilities')}</Text>
            </View>
          </View>
          <View style={styles.heroAction}>
            <Text style={styles.heroActionText}>View Net Worth Insights</Text>
            <MaterialIcons name="arrow-forward" size={16} color={colors.primaryFixed} />
          </View>
        </LinearGradient>
        </Pressable>

        {/* 2. Needs Attention Alert Box */}
        <View style={styles.alertCard}>
          <View style={styles.alertLeft}>
            <View style={styles.alertIcon}>
              <MaterialIcons name="assignment-late" size={20} color={colors.onSecondaryContainer} />
            </View>
            <View>
              <Text style={styles.alertTitle}>Transactions need review</Text>
              <Text style={styles.alertSubtitle}>Review auto-detected & imported items</Text>
            </View>
          </View>
          <Pressable style={styles.alertButton} onPress={() => go('history', { filter: 'Needs Review' })}>
            <Text style={styles.alertButtonText}>Review</Text>
            <MaterialIcons name="arrow-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>

        {/* 3. Cash Flow Summary Widget */}
        <View style={styles.widgetCard}>
          <View style={styles.widgetHeader}>
            <View style={styles.widgetHeaderLeft}>
              <Text style={styles.widgetTitle}>Cash Flow</Text>
              <View style={styles.pillBadge}>
                <Text style={styles.pillBadgeText}>{savedPct.toFixed(1)}% Saved</Text>
              </View>
            </View>
            <Pressable style={styles.widgetHeaderRight} onPress={() => go('insights')} hitSlop={8}>
              <Text style={styles.widgetLink}>Details</Text>
              <MaterialIcons name="chevron-right" size={14} color={colors.primary} />
            </Pressable>
          </View>
          <View style={styles.cashFlowGrid}>
            <Pressable style={styles.cashFlowBox} onPress={() => go('history', { filter: 'Income' })}>
              <Text style={styles.cashFlowLabel}>Received</Text>
              <Text style={[styles.cashFlowValue, { color: colors.primary }]}>{getBalance('cashIn')}</Text>
            </Pressable>
            <Pressable style={styles.cashFlowBox} onPress={() => go('history', { filter: 'Expenses' })}>
              <Text style={styles.cashFlowLabel}>Spent</Text>
              <Text style={[styles.cashFlowValue, { color: colors.error }]}>{getBalance('cashOut')}</Text>
            </Pressable>
            <Pressable style={styles.cashFlowBox} onPress={() => go('history', { filter: 'All' })}>
              <Text style={styles.cashFlowLabel}>Saved</Text>
              <Text style={[styles.cashFlowValue, { color: colors.primaryContainer }]}>{getBalance('cashSaved')}</Text>
            </Pressable>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Spent: {spentPct.toFixed(1)}%</Text>
              <Text style={styles.progressLabel}>Tap Spent / Received to drill in</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${spentPct}%`, backgroundColor: 'rgba(186, 26, 26, 0.8)' }]} />
              <View style={[styles.progressBarFill, { width: `${savedPct}%`, backgroundColor: colors.primaryContainer }]} />
            </View>
          </View>
        </View>

        {/* 4. Compact Accounts Carousel */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Accounts & Wallets</Text>
            <Pressable onPress={() => go('accounts')} hitSlop={8}>
              <Text style={styles.sectionLink}>View all{dashboardData?.cashPosition?.accounts?.length ? ` (${dashboardData.cashPosition.accounts.length})` : ''} →</Text>
            </Pressable>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountsScrollContent}
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : dashboardData?.cashPosition?.accounts?.length > 0 ? (
              dashboardData.cashPosition.accounts.map((acc: any) => (
                <Pressable key={acc.id} style={styles.accountCard} onPress={() => go('accounts')}>
                  <View style={styles.accountHeader}>
                    <View style={[styles.tag, { backgroundColor: 'rgba(192, 236, 214, 0.5)' }]}>
                      <Text style={[styles.tagText, { color: colors.onPrimaryFixed }]}>{acc.account_type}</Text>
                    </View>
                    <MaterialIcons name="account-balance" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.accountBody}>
                    <Text style={styles.accountName}>{acc.name}</Text>
                    <Text style={styles.accountDesc}>{acc.institution_name || 'N/A'}</Text>
                    <Text style={styles.accountAmount}>{isPrivacyMasked ? '₹••••••' : formatCurrency(acc.current_balance)}</Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <Pressable onPress={() => go('accounts')}>
                <Text style={{color: colors.primary, fontFamily: 'Inter_600SemiBold'}}>No accounts yet — tap to add one</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>

        {/* 5. Contextual AI Advisor Card */}
        <LinearGradient 
          colors={[colors.tertiaryContainer, colors.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.aiCard}
        >
          <View style={styles.aiIconContainer}>
            <MaterialIcons name="psychology" size={22} color={colors.tertiaryFixed} />
          </View>
          <View style={styles.aiContent}>
            <View style={styles.aiHeader}>
              <Text style={styles.aiTitle}>PFINANC INTELLIGENCE</Text>
              <MaterialIcons name="auto-awesome" size={16} color="rgba(200, 230, 255, 0.7)" />
            </View>
            <Text style={styles.aiText}>
              “Your dining spending is 18% lower this week compared to last month.”
            </Text>
            <View style={styles.aiActionRow}>
              <Pressable style={styles.aiButton} onPress={() => go('advisor')}>
                <Text style={styles.aiButtonText}>Ask AI</Text>
                <MaterialIcons name="chat" size={14} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        {/* 6. Compact Investments Snapshot */}
        <Pressable style={styles.widgetCard} onPress={() => go('portfolio')}>
          <View style={styles.investHeader}>
            <View style={styles.investHeaderLeft}>
              <MaterialIcons name="trending-up" size={20} color={colors.primary} />
              <Text style={styles.widgetTitle}>Investments</Text>
            </View>
            <View style={styles.pillBadge}>
              <Text style={[styles.pillBadgeText, { color: invGain >= 0 ? colors.primaryContainer : colors.error }]}>{isPrivacyMasked ? '••••' : `${invGain >= 0 ? '+' : '-'}${formatCurrency(Math.abs(invGain))} (${invGainPct.toFixed(1)}%)`}</Text>
            </View>
          </View>
          <View style={styles.investGrid}>
            <View style={styles.investCol}>
              <Text style={styles.investLabel}>Portfolio Value</Text>
              <Text style={styles.investValue}>{getBalance('investVal')}</Text>
            </View>
            <View style={styles.investCol}>
              <Text style={styles.investLabel}>Total Invested</Text>
              <Text style={styles.investValueSecondary}>{getBalance('investCost')}</Text>
            </View>
          </View>
          <View style={styles.investLinkRow}>
            <Text style={styles.widgetLink}>View portfolio</Text>
            <MaterialIcons name="chevron-right" size={14} color={colors.primary} />
          </View>
        </Pressable>

        {/* 7. Recent Transactions */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable onPress={() => go('history')} hitSlop={8}>
              <Text style={styles.sectionLink}>View all →</Text>
            </Pressable>
          </View>
          <View style={styles.txnList}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : dashboardData?.recentTransactions?.length > 0 ? (
              dashboardData.recentTransactions.slice(0, 3).map((txn: any, index: number) => (
                <React.Fragment key={txn.id}>
                  <Pressable style={styles.txnItem} onPress={() => go('history')}>
                    <View style={styles.txnItemLeft}>
                      <View style={[styles.txnIcon, { backgroundColor: txn.category_color || colors.surfaceContainer }]}>
                        <MaterialIcons name={getMaterialIcon(txn.category_icon)} size={20} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={styles.txnName}>{txn.merchant_name || txn.description}</Text>
                        <Text style={styles.txnDesc}>{txn.category_name || 'Uncategorized'} • {txn.account_name}</Text>
                      </View>
                    </View>
                    <View style={styles.txnItemRight}>
                      <Text style={txn.transaction_type === 'EXPENSE' ? styles.txnAmountNeg : styles.txnAmountPos}>
                        {txn.transaction_type === 'EXPENSE' ? '-' : '+'}{getTxnAmount(txn.amount)}
                      </Text>
                      <Text style={styles.txnDate}>{new Date(txn.transaction_date).toLocaleDateString()}</Text>
                    </View>
                  </Pressable>
                  {index < dashboardData.recentTransactions.slice(0, 3).length - 1 && <View style={styles.txnDivider} />}
                </React.Fragment>
              ))
            ) : (
              <Text style={{color: colors.onSurfaceVariant}}>No recent activity.</Text>
            )}
          </View>
        </View>

        {/* Bottom padding to account for BottomNav */}
        <View style={{ height: 100 }} />
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
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.2)', // outline-variant/20
    backgroundColor: 'rgba(244, 251, 247, 0.9)', // surface/90
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(0, 33, 22, 0.2)', // primary/20
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    backgroundColor: colors.primaryFixedDim,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  headerTitleContainer: {
    justifyContent: 'center',
  },
  greeting: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18, // headline-sm
    color: colors.primary,
  },
  scopeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  scopeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12, // label-md
    color: colors.onSurfaceVariant,
  },
  scopeMenu: {
    position: 'absolute',
    top: 38,
    left: 0,
    minWidth: 140,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.5)',
    paddingVertical: 4,
    zIndex: 50,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  scopeMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  scopeMenuText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurface,
  },
  investLinkRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
    borderRadius: 20,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    backgroundColor: colors.error,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.onError,
    fontFamily: 'Inter_500Medium',
    fontSize: 10, // caption
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 16,
  },
  heroCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 33, 22, 0.4)', // primary/40
    overflow: 'hidden',
    shadowColor: 'rgba(13, 56, 41, 0.28)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 8,
  },
  heroGlow: {
    position: 'absolute',
    right: -48,
    top: -48,
    width: 192,
    height: 192,
    backgroundColor: 'rgba(192, 236, 214, 0.1)', // primary-fixed/10
    borderRadius: 96,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    zIndex: 10,
  },
  heroSubtitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11, // label-sm
    color: colors.onPrimaryContainer,
    letterSpacing: 0.04 * 11,
  },
  heroTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 28, // currency-hero-mobile
    letterSpacing: -0.025 * 28,
    color: colors.onPrimary,
    marginTop: 4,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 236, 214, 0.2)', // primary-fixed/20
    borderWidth: 1,
    borderColor: 'rgba(192, 236, 214, 0.3)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  heroBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primaryFixed,
  },
  heroNote: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onPrimaryContainer,
    marginBottom: 20,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(193, 200, 194, 0.15)', // outline-variant/15
    marginBottom: 12,
  },
  heroSplit: {
    flexDirection: 'row',
    zIndex: 10,
  },
  heroSplitItem: {
    flex: 1,
  },
  heroSplitBorder: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(193, 200, 194, 0.15)',
    paddingLeft: 12,
  },
  heroSplitLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onPrimaryContainer,
  },
  heroSplitValue: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: colors.onPrimary,
    marginTop: 2,
  },
  heroSplitValueSecondary: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: colors.secondaryFixed,
    marginTop: 2,
  },
  heroAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingTop: 10,
    gap: 4,
  },
  heroActionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.primaryFixed,
  },
  alertCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(117, 90, 36, 0.3)', // secondary/30
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.onSurface,
  },
  alertSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  alertButton: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  alertButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primary,
  },
  widgetCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)', // outline-variant/30
    shadowColor: 'rgba(13, 56, 41, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  widgetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  widgetTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.onSurface,
  },
  pillBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pillBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onPrimaryFixed,
  },
  widgetHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  widgetLink: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.primary,
  },
  cashFlowGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  cashFlowBox: {
    flex: 1,
    backgroundColor: 'rgba(238, 245, 242, 0.7)', // surface-container-low/70
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
  },
  cashFlowLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  cashFlowValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 14,
    paddingTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  progressBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  sectionContainer: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.onSurface,
  },
  sectionLink: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  accountsScrollContent: {
    gap: 12,
    paddingVertical: 2,
  },
  accountCard: {
    minWidth: 190,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tagText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  accountBody: {},
  accountName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurface,
  },
  accountDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  accountAmount: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 22,
    color: colors.primary,
    marginTop: 4,
  },
  aiCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(172, 202, 227, 0.2)', // tertiary-fixed-dim/20
    alignItems: 'flex-start',
    gap: 12,
  },
  aiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  aiContent: {
    flex: 1,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.tertiaryFixed,
    letterSpacing: 0.05 * 10,
  },
  aiText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(244, 251, 247, 0.95)', // surface-bright/95
    fontStyle: 'italic',
    marginTop: 4,
  },
  aiActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  aiButton: {
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  investHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  investHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  investGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.2)',
  },
  investCol: {
    flex: 1,
  },
  investLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  investValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.onSurface,
    marginTop: 2,
  },
  investValueSecondary: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  txnList: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    overflow: 'hidden',
  },
  txnItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  txnItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txnIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.onSurface,
  },
  txnDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  txnItemRight: {
    alignItems: 'flex-end',
  },
  txnAmountNeg: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.onSurface,
  },
  txnAmountPos: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.primaryContainer,
  },
  txnDate: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  txnDivider: {
    height: 1,
    backgroundColor: 'rgba(193, 200, 194, 0.2)',
  },
});
