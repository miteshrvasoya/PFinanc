import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { comingSoon } from '../utils/notify';

export const StatementImportScreen: React.FC<{ onBack?: () => void; onNavigate?: (screen: string, params?: { filter?: string }) => void }> = ({ onBack, onNavigate }) => {
  const go = (screen: string, params?: { filter?: string }) => onNavigate && onNavigate(screen, params);
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('All (48)');

  const filters = ['All (48)', 'Auto-Matched (42)', 'Duplicates (3)', 'Needs Review (3)'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable style={styles.iconBtn} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
          </Pressable>
          <View style={styles.securityBadge}>
            <MaterialIcons name="security" size={14} color={colors.primary} />
            <Text style={styles.securityBadgeText}>LOCAL-FIRST • ENCRYPTED</Text>
          </View>
          <Pressable style={styles.iconBtnAlt} onPress={() => comingSoon('Help outline')}>
            <MaterialIcons name="help-outline" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.title}>Statement Import</Text>
          <Text style={styles.subtitle}>Institutional Ledger Parser</Text>
        </View>

        <View style={styles.stepIndicatorSection}>
          <View style={styles.stepTextRow}>
            <Text style={styles.stepTitle}>Step 2 of 4: Parse & Match</Text>
            <Text style={styles.stepSubtitle}>Review Next</Text>
          </View>
          <View style={styles.stepTrackRow}>
            <View style={styles.stepTrackFill} />
            <View style={styles.stepTrackActive} />
            <View style={styles.stepTrackEmpty} />
            <View style={styles.stepTrackEmpty} />
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Destination Account */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <MaterialIcons name="account-balance" size={18} color={colors.primary} />
              <Text style={styles.cardHeaderTitle}>DESTINATION ACCOUNT</Text>
            </View>
            <View style={styles.autoDetectBadge}>
              <MaterialIcons name="verified" size={12} color={colors.primary} />
              <Text style={styles.autoDetectText}>Auto-Detected</Text>
            </View>
          </View>
          <View style={styles.accountRow}>
            <View style={styles.accountRowLeft}>
              <View style={styles.accountIconBox}>
                <Text style={styles.accountIconLetter}>H</Text>
              </View>
              <View>
                <Text style={styles.accountTitle}>HDFC Bank — Salary Account</Text>
                <Text style={styles.accountSubtitle}>•• 4821 • <Text style={styles.accountBalance}>₹82,450 balance</Text></Text>
              </View>
            </View>
            <Pressable style={styles.changeBtn} onPress={() => comingSoon('Unfold more')}>
              <MaterialIcons name="unfold-more" size={20} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>
        </View>

        {/* Uploaded File */}
        <View style={styles.card}>
          <View style={styles.fileRow}>
            <View style={styles.fileRowLeft}>
              <View style={styles.pdfIconBox}>
                <MaterialIcons name="picture-as-pdf" size={24} color={colors.error} />
              </View>
              <View>
                <Text style={styles.fileName}>HDFC_Statement_Oct2024.pdf</Text>
                <Text style={styles.fileMeta}>1.4 MB • Uploaded just now</Text>
              </View>
            </View>
            <View style={styles.decryptedBadge}>
              <Text style={styles.decryptedText}>Decrypted</Text>
            </View>
          </View>

          <View style={styles.engineBox}>
            <View style={styles.engineBoxLeft}>
              <MaterialIcons name="terminal" size={18} color={colors.surfaceTint} />
              <Text style={styles.engineName}>Institutional Regex & OCR</Text>
            </View>
            <Text style={styles.engineType}>Local Engine</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statsRowLeft}>
              <MaterialIcons name="insights" size={18} color={colors.primary} />
              <Text style={styles.statsCount}>48 total transactions detected</Text>
            </View>
            <View style={styles.statsBreakdown}>
              <Text style={styles.statsBreakdownText}>45 Matched / 3 Review</Text>
            </View>
          </View>
        </View>

        {/* Privacy Shield */}
        <View style={styles.privacyCard}>
          <View style={styles.privacyGlow} />
          <View style={styles.privacyRow}>
            <View style={styles.privacyIconBox}>
              <MaterialIcons name="lock-reset" size={18} color={colors.inversePrimary} />
            </View>
            <View style={styles.privacyContent}>
              <View style={styles.privacyTitleRow}>
                <Text style={styles.privacyTitle}>Statement Password Authenticated</Text>
                <MaterialIcons name="check-circle" size={14} color={colors.inversePrimary} />
              </View>
              <Text style={styles.privacyDesc}>
                Processed strictly in device volatile memory. Bank Customer ID and Aadhaar/PAN markers stripped before indexing.
              </Text>
            </View>
          </View>
          <View style={styles.privacyFooter}>
            <View style={styles.privacyFooterLeft}>
              <MaterialIcons name="shield" size={15} color={colors.inversePrimary} />
              <Text style={styles.privacyFooterLeftText}>PII Stripper Active</Text>
            </View>
            <Text style={styles.privacyFooterRightText}>Vault-Secured</Text>
          </View>
        </View>

        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <View style={styles.warningIconBox}>
            <MaterialIcons name="warning" size={18} color={colors.secondary} />
          </View>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>3 Potential Duplicates Flagged</Text>
            <Text style={styles.warningDesc}>
              PFinanc prevented automated balance distortion against existing manual and UPI entries.
            </Text>
          </View>
        </View>

        {/* Parsed Transactions */}
        <View style={styles.parsedSection}>
          <View style={styles.parsedHeader}>
            <View>
              <Text style={styles.parsedTitle}>Parsed Transactions</Text>
              <Text style={styles.parsedSubtitle}>48 ITEMS FOUND • ₹1,42,850 VOLUME</Text>
            </View>
            <Pressable style={styles.visibilityBtn} onPress={() => comingSoon('Visibility')}>
              <MaterialIcons name="visibility" size={18} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {filters.map((filter) => (
              <Pressable 
                key={filter} 
                style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}>
                  {filter}
                </Text>
                {filter.includes('Duplicates') && <View style={styles.filterDot} />}
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.txList}>
            {/* Entry 1 */}
            <View style={styles.txCard}>
              <View style={styles.txRow}>
                <View style={styles.txRowLeft}>
                  <View style={[styles.txIconBox, { backgroundColor: 'rgba(192, 236, 214, 0.4)' }]}>
                    <MaterialIcons name="domain" size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.txTitle}>TechCorp India Payroll</Text>
                    <Text style={styles.txSubtitle}>23 Oct 2024 • <Text style={styles.txSubtitleBold}>HDFC ••4821</Text></Text>
                  </View>
                </View>
                <View style={styles.txRowRight}>
                  <Text style={[styles.txAmount, { color: colors.primary }]}>+₹85,000</Text>
                  <View style={styles.txConfidence}>
                    <MaterialIcons name="check" size={13} color={colors.surfaceTint} />
                    <Text style={styles.txConfidenceText}>99% Confidence</Text>
                  </View>
                </View>
              </View>
              <View style={styles.txFooter}>
                <View style={styles.txCategory}>
                  <View style={[styles.txCategoryDot, { backgroundColor: colors.primaryContainer }]} />
                  <Text style={styles.txCategoryLabel}>Category: <Text style={styles.txCategoryValue}>Income : Salary</Text></Text>
                </View>
                <Text style={styles.txRouteLabel}>Direct Ledger Route</Text>
              </View>
            </View>

            {/* Entry 2 (Conflict) */}
            <View style={[styles.txCard, styles.txCardConflict]}>
              <View style={styles.conflictBadge}>
                <Text style={styles.conflictBadgeText}>CONFLICT IDENTIFIED</Text>
              </View>
              <View style={[styles.txRow, { paddingTop: 8 }]}>
                <View style={styles.txRowLeft}>
                  <View style={[styles.txIconBox, { backgroundColor: 'rgba(255, 222, 164, 0.5)' }]}>
                    <MaterialIcons name="restaurant" size={20} color={colors.secondary} />
                  </View>
                  <View>
                    <Text style={styles.txTitle}>Swiggy UPI / 429188</Text>
                    <Text style={styles.txSubtitle}>24 Oct 2024 • HDFC ••4821</Text>
                  </View>
                </View>
                <View style={styles.txRowRight}>
                  <Text style={styles.txAmount}>-₹850</Text>
                  <Text style={styles.txConflictText}>Match with #TX-902</Text>
                </View>
              </View>
              <View style={styles.resolutionStrip}>
                <View style={styles.resolutionLeft}>
                  <MaterialIcons name="copy-all" size={16} color={colors.secondary} />
                  <Text style={styles.resolutionText}>Matches Manual Entry</Text>
                </View>
                <View style={styles.resolutionBtns}>
                  <Pressable style={styles.resMergeBtn} onPress={() => comingSoon('Merge')}>
                    <Text style={styles.resMergeBtnText}>Merge</Text>
                  </Pressable>
                  <Pressable style={styles.resSkipBtn} onPress={() => comingSoon('Skip')}>
                    <Text style={styles.resSkipBtnText}>Skip</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Entry 3 */}
            <View style={styles.txCard}>
              <View style={styles.txRow}>
                <View style={styles.txRowLeft}>
                  <View style={styles.txIconBox}>
                    <MaterialIcons name="bolt" size={20} color={colors.onSurface} />
                  </View>
                  <View>
                    <Text style={styles.txTitle}>Adani Electricity Mumbai</Text>
                    <Text style={styles.txSubtitle}>22 Oct 2024 • Recurring Bill</Text>
                  </View>
                </View>
                <View style={styles.txRowRight}>
                  <Text style={styles.txAmount}>-₹2,450</Text>
                  <View style={styles.txConfidence}>
                    <MaterialIcons name="check" size={13} color={colors.surfaceTint} />
                    <Text style={styles.txConfidenceText}>96% Confidence</Text>
                  </View>
                </View>
              </View>
              <View style={styles.txFooter}>
                <View style={styles.txCategory}>
                  <View style={[styles.txCategoryDot, { backgroundColor: colors.surfaceTint }]} />
                  <Text style={styles.txCategoryLabel}>Auto-tagged: <Text style={styles.txCategoryValue}>Utility Bills</Text></Text>
                </View>
                <Text style={styles.txEditLabel}>Edit</Text>
              </View>
            </View>

            {/* Entry 4 */}
            <View style={styles.txCard}>
              <View style={styles.txRow}>
                <View style={styles.txRowLeft}>
                  <View style={[styles.txIconBox, { backgroundColor: 'rgba(200, 230, 255, 0.4)' }]}>
                    <MaterialIcons name="sync-alt" size={20} color={colors.tertiary} />
                  </View>
                  <View>
                    <Text style={styles.txTitle}>Transfer to Family Member</Text>
                    <Text style={styles.txSubtitle}>20 Oct 2024 • <Text style={styles.txSubtitleTertiary}>Joint Pool Vault</Text></Text>
                  </View>
                </View>
                <View style={styles.txRowRight}>
                  <Text style={styles.txAmount}>-₹15,000</Text>
                  <Text style={styles.txExcludedText}>Excluded Expense</Text>
                </View>
              </View>
              <View style={styles.txFooter}>
                <View style={styles.txStrictBadge}>
                  <MaterialIcons name="balance" size={13} color={colors.onSurfaceVariant} />
                  <Text style={styles.txStrictBadgeText}>Strict Fiscal Separation</Text>
                </View>
                <Text style={styles.txRouteLabel}>Household Neutral</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable style={styles.primaryActionBtn} onPress={() => go('history', { filter: 'Needs Review' })}>
          <Text style={styles.primaryActionBtnText}>Proceed to Review (3 items)</Text>
          <MaterialIcons name="arrow-forward" size={18} color={colors.onPrimary} />
        </Pressable>
        <Pressable style={styles.secondaryActionBtn} onPress={() => comingSoon('Re upload / Change Account')}>
          <Text style={styles.secondaryActionBtnText}>Re-upload / Change Account</Text>
        </Pressable>
        <Text style={styles.footerNoteText}>
          PFinanc Local-First Architecture: Statement data is processed purely on-device and never leaves your household vault.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: 'rgba(244, 251, 247, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.15)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    zIndex: 30,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnAlt: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(192, 236, 214, 0.5)', // primary-fixed/50
    borderWidth: 1,
    borderColor: 'rgba(13, 56, 41, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  securityBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  titleSection: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 24,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  stepIndicatorSection: {
    marginTop: 4,
  },
  stepTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primary,
  },
  stepSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  stepTrackRow: {
    flexDirection: 'row',
    gap: 6,
    height: 6,
  },
  stepTrackFill: {
    flex: 1,
    backgroundColor: colors.primaryContainer,
    borderRadius: 3,
  },
  stepTrackActive: {
    flex: 1,
    backgroundColor: 'rgba(192, 236, 214, 0.4)', // animate pulse conceptually
    borderRadius: 3,
  },
  stepTrackEmpty: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 3,
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
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    shadowColor: 'rgba(13, 56, 41, 0.04)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  autoDetectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(192, 236, 214, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  autoDetectText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.primary,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  accountRowLeft: {
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
  accountIconLetter: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.primary,
  },
  accountTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: colors.primary,
  },
  accountSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  accountBalance: {
    fontFamily: 'Inter_500Medium',
    color: colors.primary,
  },
  changeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  fileRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pdfIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 218, 214, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: colors.onSurface,
  },
  fileMeta: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  decryptedBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  decryptedText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.onPrimaryFixed,
  },
  engineBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    marginBottom: 12,
  },
  engineBoxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  engineName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurface,
  },
  engineType: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  statsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsCount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  statsBreakdown: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statsBreakdownText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  privacyCard: {
    backgroundColor: colors.primaryContainer,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  privacyGlow: {
    position: 'absolute',
    right: -16,
    bottom: -16,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  privacyIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyContent: {
    flex: 1,
    gap: 4,
  },
  privacyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  privacyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.inversePrimary,
  },
  privacyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  privacyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  privacyFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  privacyFooterLeftText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  privacyFooterRightText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.inversePrimary,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255, 222, 164, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(117, 90, 36, 0.2)',
    borderRadius: 16,
    padding: 14,
  },
  warningIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onSecondaryFixedVariant,
  },
  warningDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(91, 67, 14, 0.9)',
    marginTop: 2,
    lineHeight: 18,
  },
  parsedSection: {
    gap: 12,
    marginTop: 4,
  },
  parsedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  parsedTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.primary,
  },
  parsedSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  visibilityBtn: {
    padding: 4,
  },
  filterScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
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
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  filterChipTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.onPrimary,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  txList: {
    gap: 10,
  },
  txCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    shadowColor: 'rgba(13, 56, 41, 0.03)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
  },
  txCardConflict: {
    borderColor: 'rgba(117, 90, 36, 0.4)',
    borderWidth: 2,
  },
  conflictBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 14,
  },
  conflictBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: colors.onSecondaryFixed,
    letterSpacing: 0.5,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  txRowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  txTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: colors.onSurface,
  },
  txSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  txSubtitleBold: {
    fontFamily: 'Inter_500Medium',
    color: colors.primary,
  },
  txSubtitleTertiary: {
    fontFamily: 'Inter_500Medium',
    color: colors.onTertiaryFixedVariant,
  },
  txRowRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: colors.onSurface,
  },
  txConfidence: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  txConfidenceText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.surfaceTint,
  },
  txConflictText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.secondary,
    marginTop: 2,
  },
  txExcludedText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.tertiary,
    marginTop: 2,
  },
  txFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceContainer,
  },
  txCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  txCategoryLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  txCategoryValue: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.onSurface,
  },
  txRouteLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  txEditLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primary,
  },
  txStrictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  txStrictBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  resolutionStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(117, 90, 36, 0.2)',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  resolutionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resolutionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.onSecondaryFixedVariant,
  },
  resolutionBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  resMergeBtn: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resMergeBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurface,
  },
  resSkipBtn: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resSkipBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onPrimary,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(244, 251, 247, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.2)',
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 8,
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
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: colors.surfaceBright,
  },
  secondaryActionBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryActionBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  footerNoteText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: 'rgba(65, 72, 68, 0.8)',
    textAlign: 'center',
    marginTop: 2,
  },
});
