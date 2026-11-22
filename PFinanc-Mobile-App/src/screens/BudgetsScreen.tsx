import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { comingSoon } from '../utils/notify';

export const BudgetsScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [rule1, setRule1] = useState(true);
  const [rule2, setRule2] = useState(true);
  const [rule3, setRule3] = useState(true);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Categories & Budgets</Text>
            <Text style={styles.headerSubtitle}>Monthly Envelopes • Spending Limits</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.newBtn} onPress={() => comingSoon('New')}>
            <MaterialIcons name="add" size={16} color={colors.onPrimary} />
            <Text style={styles.newBtnText}>New</Text>
          </Pressable>
          <Pressable style={styles.filterBtn} onPress={() => comingSoon('Tune')}>
            <MaterialIcons name="tune" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Monthly Budget Health Overview */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlow1} />
          <View style={styles.heroGlow2} />
          
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroLabel}>Active Fiscal Cycle • March</Text>
              <View style={styles.heroBalanceRow}>
                <Text style={styles.heroBalance}>₹1,45,000</Text>
                <Text style={styles.heroBalanceSub}>allocated</Text>
              </View>
            </View>
            <View style={styles.daysBadge}>
              <View style={styles.daysDot} />
              <Text style={styles.daysBadgeText}>9 Days Remaining</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressTextLeft}>Spent so far: <Text style={styles.progressTextBold}>₹98,420</Text> (68%)</Text>
              <Text style={styles.progressTextRight}>₹46,580 buffer</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: '68%' }]} />
            </View>
          </View>

          <View style={styles.heroFooter}>
            <View style={styles.heroFooterLeft}>
              <MaterialIcons name="arrow-back-ios" size={12} color={colors.primaryFixedDim} />
              <Text style={styles.heroFooterText}>On Track: ₹46,580 safe buffer</Text>
            </View>
            <Pressable style={styles.rolloverBtn} onPress={() => comingSoon('Rollover Surplus')}>
              <Text style={styles.rolloverBtnText}>Rollover Surplus</Text>
              <MaterialIcons name="arrow-forward" size={14} color={colors.onPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Group 1: Essential & Household */}
        <View style={styles.groupSection}>
          <View style={styles.groupHeader}>
            <View style={styles.groupHeaderLeft}>
              <View style={[styles.groupLine, { backgroundColor: colors.primary }]} />
              <Text style={styles.groupTitle}>Essential & Household</Text>
            </View>
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>Shared Pool</Text>
            </View>
          </View>

          {/* Groceries */}
          <View style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryHeaderLeft}>
                <View style={styles.categoryIconBox}>
                  <MaterialIcons name="shopping-cart" size={24} color={colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.categoryTitle}>Groceries & Gourmet</Text>
                  <View style={styles.categorySubBadge}>
                    <Text style={styles.categorySubBadgeText}>Shared Pool • Disha & You</Text>
                  </View>
                </View>
              </View>
              <Pressable style={styles.editBtn} onPress={() => comingSoon('Edit')}>
                <MaterialIcons name="edit" size={18} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>
            <View style={styles.categoryMetrics}>
              <View style={styles.categoryMetricsTextRow}>
                <Text style={styles.metricsLabel}>Spent: <Text style={styles.metricsValue}>₹19,850</Text></Text>
                <Text style={styles.metricsLabel}>Budget: ₹25,000</Text>
              </View>
              <View style={styles.metricsBarTrack}>
                <View style={[styles.metricsBarFill, { width: '79%', backgroundColor: colors.secondary }]} />
              </View>
              <View style={styles.metricsFooterRow}>
                <Text style={[styles.metricsFooterLeft, { color: colors.secondary }]}>79% spent</Text>
                <View style={styles.metricsFooterRight}>
                  <MaterialIcons name="notifications-active" size={14} color={colors.secondary} />
                  <Text style={styles.metricsFooterRightText}>Warn at 85% (₹21,250) • Push alert</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Rent */}
          <View style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryHeaderLeft}>
                <View style={styles.categoryIconBox}>
                  <MaterialIcons name="home" size={24} color={colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.categoryTitle}>Rent & Maintenance</Text>
                  <View style={[styles.categorySubBadge, { backgroundColor: 'rgba(192, 236, 214, 0.5)' }]}>
                    <Text style={[styles.categorySubBadgeText, { color: colors.onPrimaryFixedVariant }]}>Shared Fixed Mandate</Text>
                  </View>
                </View>
              </View>
              <MaterialIcons name="check-circle" size={20} color={colors.surfaceTint} />
            </View>
            <View style={styles.categoryMetrics}>
              <View style={styles.categoryMetricsTextRow}>
                <Text style={styles.metricsLabel}>Spent: <Text style={styles.metricsValue}>₹42,000</Text></Text>
                <Text style={styles.metricsLabel}>Budget: ₹42,000</Text>
              </View>
              <View style={styles.metricsBarTrack}>
                <View style={[styles.metricsBarFill, { width: '100%', backgroundColor: colors.surfaceTint }]} />
              </View>
              <View style={styles.metricsFooterRow}>
                <Text style={[styles.metricsFooterLeft, { color: colors.surfaceTint }]}>100% (Settled)</Text>
                <Text style={styles.metricsFooterRightText}>Auto-reconciled with HDFC Salary</Text>
              </View>
            </View>
          </View>
          
          {/* Utilities */}
          <View style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryHeaderLeft}>
                <View style={styles.categoryIconBox}>
                  <MaterialIcons name="bolt" size={24} color={colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.categoryTitle}>Utilities & Bills</Text>
                  <Text style={styles.categorySubtitle}>Electricity, WiFi, Gas Pipe</Text>
                </View>
              </View>
              <View style={styles.categorySubBadge}>
                <Text style={styles.categorySubBadgeText}>Threshold: 90%</Text>
              </View>
            </View>
            <View style={styles.categoryMetrics}>
              <View style={styles.categoryMetricsTextRow}>
                <Text style={styles.metricsLabel}>Spent: <Text style={styles.metricsValue}>₹5,450</Text></Text>
                <Text style={styles.metricsLabel}>Budget: ₹8,000</Text>
              </View>
              <View style={styles.metricsBarTrack}>
                <View style={[styles.metricsBarFill, { width: '68%', backgroundColor: colors.surfaceTint }]} />
              </View>
              <View style={styles.metricsFooterRow}>
                <Text style={[styles.metricsFooterLeft, { color: colors.surfaceTint }]}>68% used</Text>
                <Text style={styles.metricsFooterRightText}>₹2,550 safe headroom</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Group 2: Lifestyle */}
        <View style={styles.groupSection}>
          <View style={styles.groupHeader}>
            <View style={styles.groupHeaderLeft}>
              <View style={[styles.groupLine, { backgroundColor: colors.secondary }]} />
              <Text style={styles.groupTitle}>Lifestyle & Discretionary</Text>
            </View>
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>Personal & Flexible</Text>
            </View>
          </View>

          {/* Dining (Alert) */}
          <View style={[styles.categoryCard, styles.alertCard]}>
            <View style={styles.alertGlow} />
            <View style={styles.categoryHeader}>
              <View style={styles.categoryHeaderLeft}>
                <View style={[styles.categoryIconBox, { backgroundColor: 'rgba(255, 218, 214, 0.4)' }]}>
                  <MaterialIcons name="restaurant" size={24} color={colors.error} />
                </View>
                <View>
                  <Text style={styles.categoryTitle}>Dining Out & Cafes</Text>
                  <View style={styles.categorySubBadge}>
                    <Text style={styles.categorySubBadgeText}>Personal Discretionary</Text>
                  </View>
                </View>
              </View>
              <View style={styles.alertBadge}>
                <MaterialIcons name="warning" size={14} color={colors.error} />
                <Text style={styles.alertBadgeText}>93%</Text>
              </View>
            </View>
            <View style={styles.categoryMetrics}>
              <View style={styles.categoryMetricsTextRow}>
                <Text style={styles.metricsLabel}>Spent: <Text style={[styles.metricsValue, { color: colors.error }]}>₹11,200</Text></Text>
                <Text style={styles.metricsLabel}>Budget: ₹12,000</Text>
              </View>
              <View style={styles.metricsBarTrack}>
                <View style={[styles.metricsBarFill, { width: '93%', backgroundColor: colors.error }]} />
              </View>
              <View style={styles.metricsFooterRow}>
                <Text style={[styles.metricsFooterLeft, { color: colors.error }]}>₹800 remaining limit</Text>
                <Text style={styles.metricsFooterRightText}>Strict Soft-Cap Active</Text>
              </View>
            </View>
            <View style={styles.actionChipsRow}>
              <Pressable style={styles.actionChip} onPress={() => comingSoon('Adjust Cap')}>
                <Text style={styles.actionChipText}>Adjust Cap</Text>
              </Pressable>
              <Pressable style={styles.actionChip} onPress={() => comingSoon('Borrow from Entertainment')}>
                <Text style={styles.actionChipText}>Borrow from Entertainment</Text>
              </Pressable>
            </View>
          </View>

          {/* Travel */}
          <View style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryHeaderLeft}>
                <View style={styles.categoryIconBox}>
                  <MaterialIcons name="commute" size={24} color={colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.categoryTitle}>Travel & Commute</Text>
                  <Text style={styles.categorySubtitle}>Fuel • Metro Smartcard • Uber</Text>
                </View>
              </View>
              <View style={styles.categorySubBadge}>
                <Text style={styles.categorySubBadgeText}>Personal</Text>
              </View>
            </View>
            <View style={styles.categoryMetrics}>
              <View style={styles.categoryMetricsTextRow}>
                <Text style={styles.metricsLabel}>Spent: <Text style={styles.metricsValue}>₹4,120</Text></Text>
                <Text style={styles.metricsLabel}>Budget: ₹7,000</Text>
              </View>
              <View style={styles.metricsBarTrack}>
                <View style={[styles.metricsBarFill, { width: '59%', backgroundColor: colors.surfaceTint }]} />
              </View>
              <View style={styles.metricsFooterRow}>
                <Text style={[styles.metricsFooterLeft, { color: colors.surfaceTint }]}>59% used</Text>
                <Text style={styles.metricsFooterRightText}>₹2,880 remaining</Text>
              </View>
            </View>
          </View>
          
          {/* Shopping */}
          <View style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryHeaderLeft}>
                <View style={styles.categoryIconBox}>
                  <MaterialIcons name="shopping-bag" size={24} color={colors.primaryContainer} />
                </View>
                <View>
                  <Text style={styles.categoryTitle}>Shopping & Gadgets</Text>
                  <View style={[styles.categorySubBadge, { backgroundColor: 'rgba(192, 236, 214, 0.4)' }]}>
                    <Text style={[styles.categorySubBadgeText, { color: colors.onPrimaryFixedVariant }]}>Sovereign Vault</Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.metricsFooterLeft, { color: colors.surfaceTint }]}>57%</Text>
            </View>
            <View style={styles.categoryMetrics}>
              <View style={styles.categoryMetricsTextRow}>
                <Text style={styles.metricsLabel}>Spent: <Text style={styles.metricsValue}>₹8,600</Text></Text>
                <Text style={styles.metricsLabel}>Budget: ₹15,000</Text>
              </View>
              <View style={styles.metricsBarTrack}>
                <View style={[styles.metricsBarFill, { width: '57%', backgroundColor: colors.surfaceTint }]} />
              </View>
              <View style={styles.metricsFooterRow}>
                <Text style={[styles.metricsFooterLeft, { color: colors.surfaceTint }]}>₹6,400 unspent buffer</Text>
                <Text style={styles.metricsFooterRightText}>Soft limit at ₹14,000</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Group 3: Wealth */}
        <View style={styles.groupSection}>
          <View style={styles.groupHeader}>
            <View style={styles.groupHeaderLeft}>
              <View style={[styles.groupLine, { backgroundColor: colors.tertiaryContainer }]} />
              <Text style={styles.groupTitle}>Wealth Building & Goals</Text>
            </View>
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>Mandatory Sinking</Text>
            </View>
          </View>

          {/* Emergency */}
          <View style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryHeaderLeft}>
                <View style={[styles.categoryIconBox, { backgroundColor: 'rgba(200, 230, 255, 0.3)' }]}>
                  <MaterialIcons name="shield" size={24} color={colors.tertiary} />
                </View>
                <View>
                  <Text style={styles.categoryTitle}>Emergency Fund Allocation</Text>
                  <View style={styles.categorySubBadge}>
                    <Text style={styles.categorySubBadgeText}>Direct Auto-Sweep</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.categorySubBadge, { backgroundColor: 'rgba(192, 236, 214, 0.4)' }]}>
                <Text style={[styles.categorySubBadgeText, { color: colors.surfaceTint }]}>100% Target Met</Text>
              </View>
            </View>
            <View style={styles.categoryMetrics}>
              <View style={styles.categoryMetricsTextRow}>
                <Text style={styles.metricsLabel}>Allocated: <Text style={styles.metricsValue}>₹20,000</Text></Text>
                <Text style={styles.metricsLabel}>Target: ₹20,000 / mo</Text>
              </View>
              <View style={styles.metricsBarTrack}>
                <View style={[styles.metricsBarFill, { width: '100%', backgroundColor: colors.primaryContainer }]} />
              </View>
              <Text style={[styles.metricsFooterRightText, { marginTop: 4 }]}>Target safely transferred to Liquid Overnight Fund</Text>
            </View>
          </View>
        </View>

        {/* Rules Card */}
        <View style={styles.rulesCard}>
          <View style={styles.rulesHeader}>
            <View style={styles.rulesIconBox}>
              <MaterialIcons name="lock-clock" size={18} color={colors.onPrimary} />
            </View>
            <View>
              <Text style={styles.rulesTitle}>Smart Overspending Controls</Text>
              <Text style={styles.rulesSubtitle}>Autonomous household boundary policies</Text>
            </View>
          </View>

          <View style={styles.rulesList}>
            <View style={styles.ruleItem}>
              <View style={styles.ruleInfo}>
                <Text style={styles.ruleItemTitle}>Hard Warning on Discretionary Spends</Text>
                <Text style={styles.ruleItemDesc}>Instant push prompt when category exceeds 90% threshold</Text>
              </View>
              <Switch 
                value={rule1} 
                onValueChange={setRule1} 
                trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
                thumbColor={colors.onPrimary}
              />
            </View>
            <View style={styles.ruleItem}>
              <View style={styles.ruleInfo}>
                <Text style={styles.ruleItemTitle}>Envelope Rollover</Text>
                <Text style={styles.ruleItemDesc}>Roll unspent personal discretionary sums into next month's vault</Text>
              </View>
              <Switch 
                value={rule2} 
                onValueChange={setRule2} 
                trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
                thumbColor={colors.onPrimary}
              />
            </View>
            <View style={styles.ruleItem}>
              <View style={styles.ruleInfo}>
                <Text style={styles.ruleItemTitle}>Shared Household Breach Alert</Text>
                <Text style={styles.ruleItemDesc}>Notifies Disha via encrypted relay if joint groceries exceed ₹25k</Text>
              </View>
              <Switch 
                value={rule3} 
                onValueChange={setRule3} 
                trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
                thumbColor={colors.onPrimary}
              />
            </View>
          </View>
        </View>

        {/* Footer Actions */}
        <View style={styles.footerSection}>
          <Pressable style={styles.primaryActionBtn} onPress={() => comingSoon('Add Custom Category / Rule')}>
            <MaterialIcons name="add" size={22} color={colors.onPrimary} />
            <Text style={styles.primaryActionBtnText}>Add Custom Category / Rule</Text>
          </Pressable>
          <View style={styles.footerNoteRow}>
            <MaterialIcons name="verified-user" size={14} color={colors.surfaceTint} />
            <Text style={styles.footerNoteText}>Encrypted Rule Engine • Zero Cloud Sync Required • Real-Time Calculation</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.2)',
    backgroundColor: 'rgba(244, 251, 247, 0.95)',
    zIndex: 40,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: colors.primary,
    lineHeight: 22,
  },
  headerSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: colors.primaryContainer,
  },
  newBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onPrimary,
  },
  filterBtn: {
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
    gap: 24,
  },
  heroCard: {
    backgroundColor: colors.primaryContainer,
    borderRadius: 16,
    padding: 20,
    shadowColor: 'rgba(13, 56, 41, 0.25)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6,
    overflow: 'hidden',
  },
  heroGlow1: {
    position: 'absolute',
    right: -48,
    top: -48,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: 'rgba(164, 208, 187, 0.1)',
  },
  heroGlow2: {
    position: 'absolute',
    left: -40,
    bottom: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(200, 230, 255, 0.1)',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    zIndex: 10,
  },
  heroLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.onPrimaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroBalanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  heroBalance: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 28,
    color: colors.onPrimary,
    letterSpacing: -0.5,
  },
  heroBalanceSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onPrimaryContainer,
  },
  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  daysDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryFixed,
  },
  daysBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.primaryFixed,
  },
  progressSection: {
    gap: 6,
    zIndex: 10,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTextLeft: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onPrimaryContainer,
  },
  progressTextBold: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.onPrimary,
  },
  progressTextRight: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.primaryFixed,
  },
  progressBarTrack: {
    height: 10,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 5,
    padding: 1,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primaryFixed,
    borderRadius: 4,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 10,
  },
  heroFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroFooterText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.primaryFixedDim,
  },
  rolloverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rolloverBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onPrimary,
  },
  groupSection: {
    gap: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupLine: {
    width: 6,
    height: 16,
    borderRadius: 3,
  },
  groupTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: colors.primary,
  },
  groupBadge: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
  },
  groupBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  categoryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16, // body-lg
    color: colors.primary,
  },
  categorySubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  categorySubBadge: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  categorySubBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryMetrics: {
    gap: 6,
    zIndex: 10,
  },
  categoryMetricsTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  metricsLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  metricsValue: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.onSurface,
  },
  metricsBarTrack: {
    height: 8,
    width: '100%',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 4,
    overflow: 'hidden',
  },
  metricsBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricsFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  metricsFooterLeft: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  metricsFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricsFooterRightText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  alertCard: {
    borderColor: 'rgba(255, 218, 214, 0.8)', // error-container
    overflow: 'hidden',
  },
  alertGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 218, 214, 0.2)',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 218, 214, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  alertBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.error,
  },
  actionChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.2)',
    zIndex: 10,
  },
  actionChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
  },
  actionChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurface,
  },
  rulesCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 16,
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rulesIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rulesTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: colors.primary,
  },
  rulesSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  rulesList: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.2)',
  },
  ruleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.2)',
  },
  ruleInfo: {
    flex: 1,
    paddingRight: 16,
  },
  ruleItemTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.onSurface,
  },
  ruleItemDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  footerSection: {
    gap: 12,
    paddingTop: 8,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    backgroundColor: colors.primaryContainer,
    borderRadius: 12,
    shadowColor: 'rgba(13, 56, 41, 0.18)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryActionBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: colors.onPrimary,
  },
  footerNoteRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
  },
  footerNoteText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    flex: 1,
  },
});
