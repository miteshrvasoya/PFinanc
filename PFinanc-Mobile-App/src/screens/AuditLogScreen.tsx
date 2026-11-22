import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { comingSoon } from '../utils/notify';

export const AuditLogScreen: React.FC<{ onBack?: () => void; onNavigate?: (screen: string, params?: { filter?: string }) => void }> = ({ onBack, onNavigate }) => {
  const go = (screen: string, params?: { filter?: string }) => onNavigate && onNavigate(screen, params);
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('All Imports (12)');

  const filters = [
    'All Imports (12)',
    'Bank Accounts (7)',
    'Investments / CAMS (3)',
    'Flagged / Resolved (2)'
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.iconBtn} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Import History & Audit</Text>
            <View style={styles.headerSubtitleRow}>
              <Text style={styles.headerSubtitle}>Institutional Ledger Trail</Text>
              <View style={styles.headerDot} />
              <Text style={styles.headerSubtitlePrimary}>Local Vault</Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.iconBtn} onPress={() => comingSoon('Download')}>
            <MaterialIcons name="download" size={20} color={colors.onSurface} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => comingSoon('Tune')}>
            <MaterialIcons name="tune" size={20} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Security Banner */}
        <View style={styles.securityBanner}>
          <View style={styles.securityLeft}>
            <View style={styles.securityIconBox}>
              <MaterialIcons name="verified-user" size={15} color={colors.onPrimaryFixed} />
            </View>
            <View>
              <Text style={styles.securityTitle}>Cryptographically Signed Ingestion</Text>
              <Text style={styles.securityDesc}>SHA-256 batch seals • Zero cloud telemetry</Text>
            </View>
          </View>
          <View style={styles.securityActiveBadge}>
            <Text style={styles.securityActiveText}>Active</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <View style={styles.filtersHeader}>
            <Text style={styles.filtersLabel}>VERIFICATION SCOPE</Text>
            <Pressable style={styles.fySelector} onPress={() => comingSoon('FY 2024–25')}>
              <Text style={styles.fySelectorText}>FY 2024–25</Text>
              <MaterialIcons name="expand-more" size={16} color={colors.primary} />
            </Pressable>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {filters.map(f => (
              <Pressable 
                key={f}
                style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
                  {f}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Ingested Volume</Text>
              <MaterialIcons name="account-balance-wallet" size={14} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.kpiValueMain}>₹14,28,450</Text>
              <Text style={styles.kpiSubValue}>342 txn entries</Text>
            </View>
          </View>
          
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>OCR Accuracy</Text>
              <MaterialIcons name="task-alt" size={14} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.kpiValue}>99.4%</Text>
              <Text style={styles.kpiSubValuePrimary}>Regex Engine</Text>
            </View>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>Protected</Text>
              <MaterialIcons name="security" size={14} color={colors.secondary} />
            </View>
            <View>
              <Text style={styles.kpiValue}>14 Dupes</Text>
              <Text style={styles.kpiSubValueSecondary}>₹42.3k saved</Text>
            </View>
          </View>
        </View>

        {/* Audit Timeline */}
        <View style={styles.timelineSection}>
          {/* October */}
          <View style={styles.timelineGroup}>
            <View style={styles.timelineHeader}>
              <View style={styles.timelineMonthRow}>
                <Text style={styles.timelineMonth}>OCTOBER 2024</Text>
                <View style={styles.timelineLine} />
              </View>
              <Text style={styles.timelineCount}>2 Batches Verified</Text>
            </View>

            {/* Audit Card 1 */}
            <View style={styles.auditCard}>
              <View style={styles.auditCardHeaderRow}>
                <View style={styles.auditCardLeft}>
                  <View style={styles.auditIconBox}>
                    <MaterialIcons name="picture-as-pdf" size={22} color={colors.primaryContainer} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.auditCardTitle}>HDFC_Statement_Oct2024.pdf</Text>
                    <Text style={styles.auditCardDesc}>HDFC Bank — Salary Account (•• 4821)</Text>
                  </View>
                </View>
                <View style={styles.statusBadgeVerified}>
                  <MaterialIcons name="check-circle" size={13} color={colors.onPrimaryFixed} />
                  <Text style={styles.statusBadgeVerifiedText}>Verified</Text>
                </View>
              </View>

              <View style={styles.statsStrip}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Processed Stamp</Text>
                  <Text style={styles.statValue}>Today, 10:38 AM</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Reconciliation Rate</Text>
                  <Text style={styles.statValuePrimary}>48 Txns (45 match, 3 merge)</Text>
                </View>
              </View>

              <View style={styles.auditFooter}>
                <View style={styles.hashRow}>
                  <MaterialIcons name="fingerprint" size={14} color={colors.primary} />
                  <Text style={styles.hashText}>sha256: 4f8a•••9c2e</Text>
                </View>
                <View style={styles.auditFooterActions}>
                  <Pressable onPress={() => comingSoon('Rollback')}>
                    <Text style={styles.rollbackText}>Rollback</Text>
                  </Pressable>
                  <Pressable style={styles.viewBatchBtn} onPress={() => go('imports')}>
                    <Text style={styles.viewBatchText}>View Batch</Text>
                    <MaterialIcons name="chevron-right" size={14} color={colors.primaryContainer} />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Audit Card 2 */}
            <View style={styles.auditCard}>
              <View style={styles.auditCardHeaderRow}>
                <View style={styles.auditCardLeft}>
                  <View style={styles.auditIconBoxSecondary}>
                    <MaterialIcons name="table-chart" size={22} color={colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.auditCardTitle}>ICICI_CreditCard_Sep2024.csv</Text>
                    <Text style={styles.auditCardDesc}>ICICI Coral Credit Card (•• 9012)</Text>
                  </View>
                </View>
                <View style={styles.statusBadgeCommitted}>
                  <MaterialIcons name="done" size={13} color={colors.primary} />
                  <Text style={styles.statusBadgeCommittedText}>Committed</Text>
                </View>
              </View>

              <View style={styles.statsStrip}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Processed Stamp</Text>
                  <Text style={styles.statValue}>18 Oct 2024</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Parsing Efficacy</Text>
                  <Text style={styles.statValuePrimary}>32 Txns (100% matched)</Text>
                </View>
              </View>

              <View style={styles.auditFooter}>
                <View style={styles.hashRow}>
                  <MaterialIcons name="enhanced-encryption" size={13} color={colors.primary} />
                  <Text style={[styles.hashText, { color: colors.primary }]}>PII Redacted: Card # & address stripped</Text>
                </View>
                <Pressable style={styles.viewBatchBtn} onPress={() => go('imports')}>
                  <Text style={styles.viewBatchText}>View Batch</Text>
                  <MaterialIcons name="chevron-right" size={14} color={colors.primaryContainer} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* September */}
          <View style={[styles.timelineGroup, { marginTop: 12 }]}>
            <View style={styles.timelineHeader}>
              <View style={styles.timelineMonthRow}>
                <Text style={styles.timelineMonth}>SEPTEMBER 2024</Text>
                <View style={styles.timelineLine} />
              </View>
              <Text style={styles.timelineCount}>2 Batches Synced</Text>
            </View>

            {/* Audit Card 3 */}
            <View style={styles.auditCard}>
              <View style={styles.auditCardHeaderRow}>
                <View style={styles.auditCardLeft}>
                  <View style={styles.auditIconBox}>
                    <MaterialIcons name="account-tree" size={22} color={colors.primaryContainer} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.auditCardTitle}>CAMS_CAS_Consolidated_Sep2024.pdf</Text>
                    <Text style={styles.auditCardDesc}>Vasoya Family Portfolio (Mutual Funds)</Text>
                  </View>
                </View>
                <View style={styles.statusBadgeSynced}>
                  <MaterialIcons name="sync" size={13} color={colors.onPrimaryFixed} />
                  <Text style={styles.statusBadgeSyncedText}>Synced</Text>
                </View>
              </View>

              <View style={styles.statsStrip}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Processed Stamp</Text>
                  <Text style={styles.statValue}>30 Sep 2024</Text>
                </View>
                <View style={[styles.statCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.statLabel}>NAV Rebalance</Text>
                  <Text style={styles.statValuePrimaryBold}>₹9,20,000 (8 Folios)</Text>
                </View>
              </View>

              <View style={styles.auditFooter}>
                <View style={styles.hashRow}>
                  <MaterialIcons name="commit" size={14} color={colors.primary} />
                  <Text style={styles.hashText}>COMMIT #IMP-8821</Text>
                </View>
                <Pressable style={styles.viewBatchBtn} onPress={() => go('portfolio')}>
                  <Text style={styles.viewBatchText}>Folio Detail</Text>
                  <MaterialIcons name="chevron-right" size={14} color={colors.primaryContainer} />
                </Pressable>
              </View>
            </View>

            {/* Audit Card 4 */}
            <View style={styles.auditCard}>
              <View style={styles.auditCardHeaderRow}>
                <View style={styles.auditCardLeft}>
                  <View style={styles.auditIconBox}>
                    <MaterialIcons name="savings" size={22} color={colors.primaryContainer} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.auditCardTitle}>SBI_Savings_Father_Aug2024.pdf</Text>
                    <Text style={styles.auditCardDesc}>Father — SBI Savings (•• 1104) [Pool]</Text>
                  </View>
                </View>
                <View style={styles.statusBadgeReconciled}>
                  <MaterialIcons name="rule" size={13} color={colors.primary} />
                  <Text style={styles.statusBadgeReconciledText}>Reconciled</Text>
                </View>
              </View>

              <View style={styles.statsStrip}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>Processed Stamp</Text>
                  <Text style={styles.statValue}>28 Sep 2024</Text>
                </View>
                <View style={[styles.statCol, { alignItems: 'flex-end' }]}>
                  <Text style={styles.statLabel}>Collision Guard</Text>
                  <Text style={[styles.statValuePrimaryBold, { color: colors.secondary }]}>1 duplicate skipped</Text>
                </View>
              </View>

              <View style={styles.auditFooter}>
                <View style={styles.hashRow}>
                  <MaterialIcons name="fingerprint" size={14} color={colors.primary} />
                  <Text style={styles.hashText}>sha256: 7b1c•••881a</Text>
                </View>
                <Pressable style={styles.viewBatchBtn} onPress={() => go('imports')}>
                  <Text style={styles.viewBatchText}>View Batch</Text>
                  <MaterialIcons name="chevron-right" size={14} color={colors.primaryContainer} />
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Guarantee Box */}
        <View style={styles.guaranteeBox}>
          <View style={styles.guaranteeHeaderRow}>
            <MaterialIcons name="policy" size={20} color={colors.primaryFixed} />
            <Text style={styles.guaranteeTitle}>Zero-Cloud Ledger Guarantee</Text>
          </View>
          <Text style={styles.guaranteeDesc}>
            Bank & CAS statements are decrypted solely in local volatile memory. Reversible commit hashes allow clean rolling back of any imported period without corrupting past balance sheets.
          </Text>
          <Pressable style={styles.downloadBtn} onPress={() => comingSoon('Download Full Reconciliation Audit (.PDF)')}>
            <MaterialIcons name="summarize" size={18} color={colors.onPrimaryFixed} />
            <Text style={styles.downloadBtnText}>Download Full Reconciliation Audit (.PDF)</Text>
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
    paddingVertical: 12,
    backgroundColor: 'rgba(244, 251, 247, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.1)',
    zIndex: 40,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  headerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
  },
  headerSubtitlePrimary: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.primaryContainer,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 16,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: 'rgba(13, 56, 41, 0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 1,
  },
  securityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  securityIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  securityDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  securityActiveBadge: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  securityActiveText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primary,
  },
  filtersSection: {
    gap: 8,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filtersLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  fySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fySelectorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.primary,
  },
  filterScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  filterChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurface,
  },
  filterChipTextActive: {
    fontFamily: 'Inter_500Medium',
    color: colors.onPrimary,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    shadowColor: 'rgba(13, 56, 41, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 1,
    justifyContent: 'space-between',
    height: 84,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  kpiValueMain: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  kpiValue: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: colors.primary,
  },
  kpiSubValue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  kpiSubValuePrimary: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.primaryContainer,
    marginTop: 2,
  },
  kpiSubValueSecondary: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.secondary,
    marginTop: 2,
  },
  timelineSection: {
    gap: 16,
    marginTop: 4,
  },
  timelineGroup: {
    gap: 10,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineMonth: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  timelineLine: {
    width: 48,
    height: 1,
    backgroundColor: 'rgba(193, 200, 194, 0.4)',
  },
  timelineCount: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  auditCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.35)',
    shadowColor: 'rgba(13, 56, 41, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
    gap: 12,
  },
  auditCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  auditCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  auditIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  auditIconBoxSecondary: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  auditCardTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: colors.primary,
  },
  auditCardDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusBadgeVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeVerifiedText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onPrimaryFixed,
  },
  statusBadgeCommitted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeCommittedText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primary,
  },
  statusBadgeSynced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeSyncedText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onPrimaryFixed,
  },
  statusBadgeReconciled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeReconciledText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primary,
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(238, 245, 242, 0.7)', // surface-container-low/70
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.outline,
  },
  statValue: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurface,
  },
  statValuePrimary: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.primary,
  },
  statValuePrimaryBold: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  auditFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.2)',
  },
  hashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hashText: {
    fontFamily: 'Inter_400Regular', // monospace fallback approximation if monospace not loaded
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  auditFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rollbackText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.error,
  },
  viewBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewBatchText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primaryContainer,
  },
  guaranteeBox: {
    backgroundColor: colors.primaryContainer,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    gap: 12,
  },
  guaranteeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guaranteeTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.surfaceContainerLowest,
  },
  guaranteeDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(221, 228, 225, 0.9)', // surface-variant/90
    lineHeight: 18,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryFixed,
    height: 44,
    borderRadius: 12,
  },
  downloadBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.onPrimaryFixed,
  },
});
