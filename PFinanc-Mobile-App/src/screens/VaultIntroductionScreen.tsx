import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export const VaultIntroductionScreen: React.FC<{ onBack?: () => void; onNavigate?: (screen: string) => void }> = ({ onBack, onNavigate }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialIcons name="arrow-back-ios" size={20} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.contextPill}>
          <View style={styles.contextDot} />
          <Text style={styles.contextText}>Household • My Family</Text>
        </View>
        <View style={styles.headerSpacer}>
          <MaterialIcons name="security" size={20} color={colors.outlineVariant} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Graphic */}
        <View style={styles.heroContainer}>
          <View style={styles.glow} />
          <View style={styles.outerRing}>
            <View style={styles.innerRing}>
              <View style={styles.coreVault}>
                <MaterialIcons name="lock" size={32} color={colors.primaryFixed} />
              </View>
            </View>
          </View>
          <View style={[styles.orbitBadge, { top: 4, right: 8 }]}>
            <MaterialIcons name="vpn-key" size={15} color={colors.primaryContainer} />
          </View>
          <View style={[styles.orbitBadge, { bottom: 8, left: 8 }]}>
            <MaterialIcons name="verified-user" size={15} color={colors.primaryContainer} />
          </View>
        </View>

        <View style={styles.badgePill}>
          <MaterialIcons name="lock-clock" size={14} color={colors.primaryContainer} />
          <Text style={styles.badgeText}>NEW HOUSEHOLD MODULE • ENCRYPTED</Text>
        </View>

        <Text style={styles.title}>Your household's secure vault</Text>
        <Text style={styles.description}>
          Keep important account credentials securely organized, while staying in control of who can access them.
        </Text>

        {/* Pillars */}
        <View style={styles.pillarsContainer}>
          <Pillar 
            icon="admin-panel-settings" 
            title="Store important passwords securely" 
            desc="Zero-knowledge on-device encryption backed by hardware security." 
          />
          <Pillar 
            icon="enhanced-encryption" 
            title="Keep personal credentials private" 
            desc="Every credential has a dedicated owner. Defaults strictly to Owner-Only Private." 
          />
          <Pillar 
            icon="groups" 
            title="Organize household credentials" 
            desc="Manage family utilities, banking portals, and shared services without credential sprawl." 
          />
          <Pillar 
            icon="health-and-safety" 
            title="Prepare for trusted or emergency access" 
            desc="Future-proof foundation for emergency handover and trusted household delegates." 
          />
        </View>

        <View style={styles.assuranceNote}>
          <MaterialIcons name="fingerprint" size={16} color={colors.surfaceTint} />
          <Text style={styles.assuranceText}>Protected by device biometrics & AES-256 GCM</Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => onNavigate?.('vaultSecuritySetup')}>
          <MaterialIcons name="enhanced-encryption" size={20} color={colors.onPrimary} />
          <Text style={styles.primaryButtonText}>Set up Vault</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>Skip for now</Text>
        </TouchableOpacity>
        <Text style={styles.footnoteText}>
          You can configure or disable Vault anytime in Family Hub settings.
        </Text>
      </View>
    </View>
  );
};

const Pillar = ({ icon, title, desc }: { icon: any, title: string, desc: string }) => (
  <View style={styles.pillarCard}>
    <View style={styles.pillarIcon}>
      <MaterialIcons name={icon} size={20} color={colors.primaryContainer} />
    </View>
    <View style={styles.pillarText}>
      <Text style={styles.pillarTitle}>{title}</Text>
      <Text style={styles.pillarDesc}>{desc}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainer,
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
    marginRight: 6,
  },
  contextText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurface,
  },
  headerSpacer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 150,
    alignItems: 'center',
  },
  heroContainer: {
    width: 144,
    height: 144,
    marginVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(192, 236, 214, 0.4)',
    borderRadius: 72,
    transform: [{ scale: 1.1 }],
  },
  outerRing: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(192, 236, 214, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreVault: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  orbitBadge: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(192, 236, 214, 0.3)',
    borderColor: colors.primaryFixed,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primaryContainer,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primaryContainer,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  pillarsContainer: {
    width: '100%',
    gap: 12,
  },
  pillarCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.25)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
  },
  pillarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  pillarText: {
    flex: 1,
  },
  pillarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: 2,
  },
  pillarDesc: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  assuranceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  assuranceText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    marginLeft: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 200, 194, 0.2)',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
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
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  footnoteText: {
    fontSize: 10,
    color: colors.outline,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
