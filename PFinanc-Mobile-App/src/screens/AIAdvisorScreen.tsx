import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { comingSoon } from '../utils/notify';

export const AIAdvisorScreen: React.FC<{ onBack?: () => void; onNavigate?: (screen: string, params?: { filter?: string }) => void }> = ({ onBack, onNavigate }) => {
  const go = (screen: string, params?: { filter?: string }) => onNavigate && onNavigate(screen, params);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Header */}
      <View style={styles.headerContainer}>
        <View style={styles.appBar}>
          <View style={styles.appBarLeft}>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCAvrlCIqHJ0HX682Qwp6C7IFUbPcF95wzYBfA_EqC3m3oNIfcN-zHIpV_MDTGg_ptB_pd1IfdmyemWJmNq9RcqKG8k3HMBi1rOgxfAP7X5KU8wDjSkS76nhvgHpKFNEG0X9G5rdQl3hZ_jq4NLpnmi0ISvxaaHvRFq7RgkjzHeg6VuvED7-LzagiAzckv4cxaLj0UIyjH_6MO__Isww41ary-2c7Dojotp4wcA2LJUdNsGO9o_oP8JRg' }}
                style={styles.avatar}
              />
            </View>
            <Text style={styles.appBarTitle}>PFinanc</Text>
          </View>
          <View style={styles.appBarRight}>
            <Pressable style={styles.iconBtn} onPress={() => comingSoon('Visibility')}>
              <MaterialIcons name="visibility" size={20} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.pageContext}>
          <View>
            <View style={styles.pageTitleRow}>
              <Text style={styles.pageTitle}>AI Advisor</Text>
              <View style={styles.intelligenceBadge}>
                <Text style={styles.intelligenceBadgeText}>Intelligence</Text>
              </View>
            </View>
            <Text style={styles.pageSubtitle}>Ask questions about your finances</Text>
          </View>
          <View style={styles.contextActions}>
            <Pressable style={styles.contextActionBtn} onPress={() => comingSoon('Add comment')}>
              <MaterialIcons name="add-comment" size={19} color={colors.onSurfaceVariant} />
            </Pressable>
            <Pressable style={styles.contextActionBtn} onPress={() => comingSoon('History')}>
              <MaterialIcons name="history" size={19} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>
        </View>

        <View style={styles.scopeContext}>
          <View style={styles.scopePill}>
            <View style={styles.scopeDot} />
            <Text style={styles.scopeText}>Analyzing Vasoya Family Finances</Text>
            <MaterialIcons name="expand-more" size={15} color={colors.onSurfaceVariant} />
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Suggestion Cards Carousel */}
        <View style={styles.suggestionsSection}>
          <View style={styles.suggestionsHeader}>
            <Text style={styles.suggestionsTitle}>SUGGESTED INQUIRIES</Text>
            <Text style={styles.suggestionsSubtitle}>Tailored to October</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselContainer}>
            <Pressable style={styles.suggestionCard} onPress={() => go('budgets')}>
              <View style={styles.suggestionCardTitleRow}>
                <MaterialIcons name="analytics" size={17} color={colors.surfaceTint} />
                <Text style={[styles.suggestionCardTitle, { color: colors.primary }]}>Monthly Drift</Text>
              </View>
              <Text style={styles.suggestionCardDesc} numberOfLines={2}>“Where did I spend the most this month?”</Text>
            </Pressable>
            <Pressable style={styles.suggestionCard} onPress={() => go('history', { filter: 'Expenses' })}>
              <View style={styles.suggestionCardTitleRow}>
                <MaterialIcons name="trending-up" size={17} color={colors.secondary} />
                <Text style={[styles.suggestionCardTitle, { color: colors.secondary }]}>Expense Surge</Text>
              </View>
              <Text style={styles.suggestionCardDesc} numberOfLines={2}>“Why did my expenses increase?”</Text>
            </Pressable>
            <Pressable style={styles.suggestionCard} onPress={() => go('portfolio')}>
              <View style={styles.suggestionCardTitleRow}>
                <MaterialIcons name="pie-chart" size={17} color={colors.tertiary} />
                <Text style={[styles.suggestionCardTitle, { color: colors.tertiary }]}>Portfolio</Text>
              </View>
              <Text style={styles.suggestionCardDesc} numberOfLines={2}>“Explain my investment allocation”</Text>
            </Pressable>
            <Pressable style={styles.suggestionCard} onPress={() => go('vaultIntro')}>
              <View style={styles.suggestionCardTitleRow}>
                <MaterialIcons name="family-restroom" size={17} color={colors.primary} />
                <Text style={[styles.suggestionCardTitle, { color: colors.primary }]}>Family Vault</Text>
              </View>
              <Text style={styles.suggestionCardDesc} numberOfLines={2}>“How much did we save as a family?”</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Chat Stream */}
        <View style={styles.chatSection}>
          <View style={styles.chatTimeSeparator}>
            <Text style={styles.chatTimeText}>Today • 10:42 AM</Text>
          </View>

          {/* User Bubble */}
          <View style={styles.userBubbleContainer}>
            <View style={styles.userBubble}>
              <Text style={styles.userBubbleText}>
                Why is my food spending higher this month compared to September?
              </Text>
              <View style={styles.userBubbleMeta}>
                <Text style={styles.userBubbleTime}>10:42 AM</Text>
                <MaterialIcons name="done-all" size={14} color={colors.onPrimaryContainer} />
              </View>
            </View>
          </View>

          {/* AI Response Bubble */}
          <View style={styles.aiBubbleContainer}>
            <View style={styles.aiAvatar}>
              <MaterialIcons name="auto-awesome" size={18} color={colors.primaryFixed} />
            </View>
            <View style={styles.aiBubble}>
              <View>
                <View style={styles.aiSummaryTitleRow}>
                  <View style={styles.aiSummaryDot} />
                  <Text style={styles.aiSummaryTitle}>Category Variance Analysis</Text>
                </View>
                <Text style={styles.aiSummaryText}>
                  Your food & dining expenses increased by <Text style={styles.errorBold}>₹4,850</Text> (<Text style={styles.errorBold}>+26%</Text>) in October across the Vasoya Family.
                </Text>
              </View>

              <View style={styles.breakdownWidget}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.breakdownHeaderCol}>SUB-CATEGORY</Text>
                  <Text style={styles.breakdownHeaderCol}>AMOUNT • VARIANCE</Text>
                </View>
                
                {/* Deliveries */}
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownItemHeader}>
                    <View style={styles.breakdownItemHeaderLeft}>
                      <MaterialIcons name="delivery-dining" size={16} color={colors.onSurfaceVariant} />
                      <Text style={styles.breakdownItemTitle}>Swiggy / Zomato deliveries</Text>
                    </View>
                    <Text style={styles.breakdownItemValue}>₹8,420 <Text style={styles.breakdownItemVarError}>(+34%)</Text></Text>
                  </View>
                  <View style={styles.breakdownBarTrack}>
                    <View style={[styles.breakdownBarFill, { width: '72%', backgroundColor: colors.primaryContainer }]} />
                  </View>
                </View>
                
                {/* Groceries */}
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownItemHeader}>
                    <View style={styles.breakdownItemHeaderLeft}>
                      <MaterialIcons name="shopping-basket" size={16} color={colors.onSurfaceVariant} />
                      <Text style={styles.breakdownItemTitle}>Supermarket (Nature's Basket)</Text>
                    </View>
                    <Text style={styles.breakdownItemValue}>₹12,100 <Text style={styles.breakdownItemVarNormal}>(+12%)</Text></Text>
                  </View>
                  <View style={styles.breakdownBarTrack}>
                    <View style={[styles.breakdownBarFill, { width: '55%', backgroundColor: colors.surfaceTint }]} />
                  </View>
                </View>
                
                {/* Cafes */}
                <View style={styles.breakdownItem}>
                  <View style={styles.breakdownItemHeader}>
                    <View style={styles.breakdownItemHeaderLeft}>
                      <MaterialIcons name="local-cafe" size={16} color={colors.onSurfaceVariant} />
                      <Text style={styles.breakdownItemTitle}>Cafes & Dining Out</Text>
                    </View>
                    <Text style={styles.breakdownItemValue}>₹3,150 <Text style={styles.breakdownItemVarError}>(+40%)</Text></Text>
                  </View>
                  <View style={styles.breakdownBarTrack}>
                    <View style={[styles.breakdownBarFill, { width: '40%', backgroundColor: colors.secondary }]} />
                  </View>
                </View>
              </View>

              <View style={styles.insightBox}>
                <MaterialIcons name="lightbulb" size={20} color={colors.secondary} style={{marginTop: 2}} />
                <Text style={styles.insightText}>
                  <Text style={styles.insightTextBold}>Weekend dining</Text> contributed 62% of this variance. 3 transactions from Oct 18 festival weekend were the primary driver.
                </Text>
              </View>

              <View style={styles.chatActionBtns}>
                <Pressable style={styles.chatPrimaryBtn} onPress={() => go('history', { filter: 'Expenses' })}>
                  <Text style={styles.chatPrimaryBtnText}>View Food Transactions (14)</Text>
                  <MaterialIcons name="arrow-forward" size={16} color={colors.onPrimary} />
                </Pressable>
                <Pressable style={styles.chatSecondaryBtn} onPress={() => go('budgets')}>
                  <MaterialIcons name="alarm" size={16} color={colors.surfaceTint} />
                  <Text style={styles.chatSecondaryBtnText}>Set Dining Budget Alert</Text>
                </Pressable>
              </View>

              <View style={styles.feedbackRow}>
                <Text style={styles.feedbackLabel}>Accurate for your family?</Text>
                <View style={styles.feedbackIcons}>
                  <Pressable style={styles.feedbackIconBtn}><MaterialIcons name="thumb-up" size={16} color={colors.outline} /></Pressable>
                  <Pressable style={styles.feedbackIconBtn}><MaterialIcons name="thumb-down" size={16} color={colors.outline} /></Pressable>
                  <Pressable style={styles.feedbackIconBtn}><MaterialIcons name="share" size={16} color={colors.outline} /></Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Proactive Discoveries */}
        <View style={styles.discoveriesSection}>
          <View style={styles.discoveriesHeader}>
            <View style={styles.discoveriesHeaderLeft}>
              <MaterialIcons name="tips-and-updates" size={18} color={colors.surfaceTint} />
              <Text style={styles.discoveriesTitle}>Proactive Discoveries</Text>
            </View>
            <Text style={styles.discoveriesCount}>2 action items</Text>
          </View>

          {/* Card 1 */}
          <View style={styles.discoveryCard}>
            <View style={styles.discoveryCardHeader}>
              <View style={styles.discoveryCardHeaderLeft}>
                <View style={styles.discoveryDot} />
                <Text style={styles.discoveryCardTitle}>Detected Recurring Subscriptions</Text>
              </View>
              <MaterialIcons name="autorenew" size={20} color={colors.outline} />
            </View>
            <Text style={styles.discoveryCardDesc}>Review active automated mandates detected from your HDFC & ICICI accounts.</Text>

            <View style={styles.discoveryChips}>
              <View style={styles.discoveryChip}>
                <View style={[styles.chipDot, { backgroundColor: colors.error }]} />
                <Text style={styles.chipName}>Netflix</Text>
                <Text style={styles.chipValue}>₹649/mo</Text>
              </View>
              <View style={styles.discoveryChip}>
                <View style={[styles.chipDot, { backgroundColor: colors.surfaceTint }]} />
                <Text style={styles.chipName}>Amazon Prime</Text>
                <Text style={styles.chipValue}>₹1,499/yr</Text>
              </View>
              <View style={styles.discoveryChip}>
                <View style={[styles.chipDot, { backgroundColor: colors.tertiary }]} />
                <Text style={styles.chipName}>Hotstar</Text>
                <Text style={styles.chipValue}>₹899/yr</Text>
              </View>
            </View>

            <View style={styles.discoveryFooter}>
              <Text style={styles.discoveryFooterMeta}>Annual Outflow: ₹10,186</Text>
              <Pressable style={styles.discoveryFooterBtn} onPress={() => go('portfolio')}>
                <Text style={styles.discoveryFooterBtnText}>Manage Mandates</Text>
                <MaterialIcons name="chevron-right" size={15} color={colors.primaryContainer} />
              </Pressable>
            </View>
          </View>

          {/* Card 2 */}
          <View style={styles.discoveryActionCard}>
            <View style={styles.discoveryActionLeft}>
              <View style={styles.discoveryActionIcon}>
                <MaterialIcons name="rule" size={22} color={colors.secondary} />
              </View>
              <View>
                <Text style={styles.discoveryActionTitle}>Review Uncategorized</Text>
                <Text style={styles.discoveryActionDesc}>3 transactions need family allocation</Text>
              </View>
            </View>
            <Pressable style={styles.discoveryActionBtn} onPress={() => go('imports')}>
              <Text style={styles.discoveryActionBtnText}>Review</Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom padding for Input and Nav */}
        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Sticky Bottom Chat Input Bar */}
      <View style={styles.inputContainer}>
        <View style={styles.inputBox}>
          <Pressable style={styles.inputIconBtn} onPress={() => comingSoon('Attach file')}>
            <MaterialIcons name="attach-file" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
          <TextInput 
            style={styles.textInput}
            placeholder="Ask anything about your money..."
            placeholderTextColor={colors.outline}
          />
          <Pressable style={styles.inputIconBtn} onPress={() => comingSoon('Mic')}>
            <MaterialIcons name="mic" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
          <Pressable style={styles.sendBtn} onPress={() => comingSoon('Arrow upward')}>
            <MaterialIcons name="arrow-upward" size={18} color={colors.onPrimary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: 'rgba(244, 251, 247, 0.95)',
    zIndex: 40,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.2)',
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.primaryFixed,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  appBarTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: colors.primary,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageContext: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 24,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  intelligenceBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  intelligenceBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onPrimaryFixed,
  },
  pageSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  contextActions: {
    flexDirection: 'row',
    gap: 6,
  },
  contextActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeContext: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  scopePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  scopeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceTint,
  },
  scopeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onSurface,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 20,
  },
  suggestionsSection: {
    gap: 8,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionsTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.outline,
    letterSpacing: 0.5,
  },
  suggestionsSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.surfaceTint,
  },
  carouselContainer: {
    gap: 10,
    paddingVertical: 4,
  },
  suggestionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    borderRadius: 12,
    padding: 12,
    width: 160,
    shadowColor: 'rgba(13, 56, 41, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
  },
  suggestionCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  suggestionCardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  suggestionCardDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  chatSection: {
    gap: 16,
  },
  chatTimeSeparator: {
    alignItems: 'center',
    marginVertical: 8,
  },
  chatTimeText: {
    backgroundColor: colors.surfaceContainerHigh,
    color: colors.onSurfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 12,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  userBubbleContainer: {
    alignItems: 'flex-end',
  },
  userBubble: {
    maxWidth: '85%',
    backgroundColor: colors.primaryContainer,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubbleText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.onPrimary,
    lineHeight: 20,
  },
  userBubbleMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  userBubbleTime: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onPrimaryContainer,
  },
  aiBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  aiBubble: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 16,
    shadowColor: 'rgba(11, 17, 15, 0.06)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
    gap: 14,
  },
  aiSummaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiSummaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceTint,
  },
  aiSummaryTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.surfaceTint,
  },
  aiSummaryText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurface,
    lineHeight: 20,
  },
  errorBold: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.error,
  },
  breakdownWidget: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    gap: 10,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownHeaderCol: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownItem: {
    gap: 4,
  },
  breakdownItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownItemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownItemTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurface,
  },
  breakdownItemValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.onSurface,
  },
  breakdownItemVarError: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.error,
  },
  breakdownItemVarNormal: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  breakdownBarTrack: {
    height: 6,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  insightBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255, 222, 164, 0.3)', // secondary-fixed/30
    borderWidth: 1,
    borderColor: 'rgba(229, 194, 129, 0.4)',
    borderRadius: 12,
    padding: 12,
  },
  insightText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 18,
    flex: 1,
  },
  insightTextBold: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.onSurface,
  },
  chatActionBtns: {
    gap: 8,
  },
  chatPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryContainer,
    borderRadius: 12,
    paddingVertical: 10,
  },
  chatPrimaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onPrimary,
  },
  chatSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    borderRadius: 12,
    paddingVertical: 10,
  },
  chatSecondaryBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.onSurface,
  },
  feedbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.1)',
  },
  feedbackLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.outline,
  },
  feedbackIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedbackIconBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoveriesSection: {
    gap: 12,
    paddingTop: 8,
  },
  discoveriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discoveriesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discoveriesTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: colors.primary,
  },
  discoveriesCount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.surfaceTint,
  },
  discoveryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 16,
    padding: 16,
    shadowColor: 'rgba(13, 56, 41, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
  },
  discoveryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  discoveryCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discoveryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  discoveryCardTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: colors.onSurface,
  },
  discoveryCardDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  discoveryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  discoveryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurface,
  },
  chipValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primary,
  },
  discoveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.2)',
  },
  discoveryFooterMeta: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  discoveryFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  discoveryFooterBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.primaryContainer,
  },
  discoveryActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 16,
    padding: 16,
    shadowColor: 'rgba(13, 56, 41, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 2,
  },
  discoveryActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  discoveryActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 222, 164, 0.5)', // secondary-fixed/50
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoveryActionTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: colors.onSurface,
  },
  discoveryActionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  discoveryActionBtn: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  discoveryActionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.onSurface,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 84, // above bottom nav
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
    // Add gradient conceptually using bg color
    backgroundColor: 'rgba(244, 251, 247, 0.95)',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.4)',
    borderRadius: 24,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurface,
    paddingHorizontal: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
