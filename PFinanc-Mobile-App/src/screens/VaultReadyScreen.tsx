import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
export const VaultReadyScreen: React.FC<{ onBack?: () => void; onNavigate?: (screen: string) => void }> = ({ onBack, onNavigate }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <View style={styles.contextPill}>
          <View style={styles.contextDot} />
          <Text style={styles.contextText}>My Family • Personal Vault Active</Text>
        </View>
        <View style={styles.shieldIcon}>
          <MaterialIcons name="security" size={18} color={colors.primaryContainer} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.centerSection}>
          <View style={styles.heroContainer}>
            <View style={styles.glowOuter} />
            <View style={styles.glowInner} />
            <View style={styles.coreVault}>
              <MaterialIcons name="lock" size={36} color={colors.surfaceContainerLowest} />
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="check-circle" size={18} color={colors.primaryContainer} />
              </View>
            </View>
          </View>
          
          <Text style={styles.title}>Your Vault is ready</Text>
          <Text style={styles.description}>
            Securely store important credentials and decide who can access them.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryHeaderText}>VAULT PROTECTION SUMMARY</Text>
            <View style={styles.milGradePill}>
              <Text style={styles.milGradeText}>MIL-GRADE ENCRYPTION</Text>
            </View>
          </View>

          <View style={styles.summaryList}>
            <SummaryItem 
              icon="pin" 
              title="PIN protected" 
              desc="6-digit hardware key" 
              trailingIcon="check" 
            />
            <View style={styles.divider} />
            <SummaryItem 
              icon="fingerprint" 
              title="Biometric unlock enabled" 
              desc="Face ID / Fingerprint ready" 
              trailingIcon="check" 
            />
            <View style={styles.divider} />
            <SummaryItem 
              icon="person-pin" 
              title="Owner-Centric Isolation" 
              desc="Every credential defaults to private and encrypted under your personal key." 
              badge="Active" 
            />
            <View style={styles.divider} />
            <SummaryItem 
              icon="verified-user" 
              title="Zero Cloud Knowledge" 
              desc="Plaintext never leaves your physical phone." 
            />
          </View>
        </View>

        <View style={styles.infoBanner}>
          <MaterialIcons name="info" size={20} color={colors.primaryContainer} />
          <Text style={styles.infoText}>
            You can link bank accounts, demat portals, insurance logins, and utility accounts with dedicated owners.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => onNavigate?.('vaultOverview')}>
          <MaterialIcons name="add" size={20} color={colors.onPrimary} />
          <Text style={styles.primaryButtonText}>Add your first password</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Go to PFinanc</Text>
        </TouchableOpacity>
        <Text style={styles.footnoteText}>
          You can access Vault anytime from More & Family Hub.
        </Text>
      </View>
    </View>
  );
};

const SummaryItem = ({ icon, title, desc, badge, trailingIcon }: any) => (
  <View style={styles.summaryItem}>
    <View style={styles.summaryIconBox}>
      <MaterialIcons name={icon} size={18} color={colors.primaryContainer} />
    </View>
    <View style={styles.summaryContent}>
      <View style={styles.summaryTitleRow}>
        <Text style={styles.summaryItemTitle}>{title}</Text>
        {badge && (
          <View style={styles.summaryItemBadge}>
            <Text style={styles.summaryItemBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.summaryItemDesc}>{desc}</Text>
    </View>
    {trailingIcon && (
      <View style={styles.trailingIconBox}>
        <MaterialIcons name={trailingIcon} size={16} color={colors.primaryContainer} />
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  contextDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryContainer,
    marginRight: 8,
  },
  contextText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  shieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 150,
  },
  centerSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  heroContainer: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  glowOuter: {
    position: 'absolute',
    top: -20, bottom: -20, left: -20, right: -20,
    backgroundColor: 'rgba(192, 236, 214, 0.6)',
    borderRadius: 80,
  },
  glowInner: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(164, 208, 187, 0.4)',
    borderRadius: 56,
  },
  coreVault: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4, right: -4,
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryContainer,
    marginTop: 8,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(13, 56, 41, 0.1)',
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
    marginBottom: 12,
  },
  summaryHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  milGradePill: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  milGradeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primaryContainer,
  },
  summaryList: {
    gap: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  summaryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  summaryItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  summaryItemBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  summaryItemBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.primaryContainer,
  },
  summaryItemDesc: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  trailingIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(232, 240, 236, 0.7)',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 240, 236, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginLeft: 12,
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingTop: 16,
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
    marginBottom: 10,
    elevation: 3,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  footnoteText: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
