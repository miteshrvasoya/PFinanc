/**
 * MoreScreen — Matches Stitch "More Hub & Settings" design.
 *
 * Sections:
 * - TopAppBar compact
 * - User & Family Profile Hero Card (avatar, name, admin badge, family strip)
 * - Family & Accounts (4 items with chevrons)
 * - Automation & Data (3 items)
 * - Preferences & Security (4 items + toggle)
 * - Footer meta
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radii, Shadows } from '../../theme';
import TopAppBar from '../../components/navigation/TopAppBar';
import { USER_PROFILE } from '../../services/financialService';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeStyle?: 'primary' | 'default' | 'red';
  showProgress?: boolean;
  progressValue?: number;
  rightElement?: React.ReactNode;
  onPress?: () => void;
}

function MenuItem({ icon, title, subtitle, badge, badgeStyle = 'default', showProgress, progressValue, rightElement, onPress }: MenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: Colors.surfaceSubtle }]}
      onPress={onPress}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={22} color={Colors.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
      </View>
      <View style={styles.menuRight}>
        {badge && (
          <View style={[styles.menuBadge, badgeStyle === 'primary' && styles.menuBadgePrimary, badgeStyle === 'red' && styles.menuBadgeRed]}>
            <Text style={[styles.menuBadgeText, badgeStyle === 'primary' && styles.menuBadgeTextPrimary]}>{badge}</Text>
          </View>
        )}
        {showProgress && progressValue !== undefined && (
          <View style={styles.miniProgress}>
            <View style={[styles.miniProgressFill, { width: `${progressValue}%` as any }]} />
          </View>
        )}
        {rightElement ?? <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />}
      </View>
    </Pressable>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const [hideBalances, setHideBalances] = useState(false);
  const profile = USER_PROFILE;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <TopAppBar compact title="Vasoya Family" subtitle="Workspace" notificationCount={3} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Hero Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.profileAvatarWrap}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>MV</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={11} color="#ffffff" />
              </View>
            </View>
            <View>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>Primary Admin</Text>
                </View>
              </View>
              <View style={styles.familyRow}>
                <Ionicons name="people-outline" size={14} color={Colors.primaryContainer} />
                <Text style={styles.familyText}>{profile.householdName} ({profile.members.length} Members)</Text>
              </View>
            </View>
          </View>

          {/* Family member strip */}
          <View style={styles.memberStrip}>
            <View style={styles.memberAvatars}>
              {profile.members.map((m) => (
                <View key={m.id} style={[styles.memberAvatar, { backgroundColor: m.avatarColor }]}>
                  <Text style={[styles.memberAvatarText, { color: m.avatarTextColor }]}>{m.initials}</Text>
                </View>
              ))}
            </View>
            <Pressable style={styles.manageFamilyBtn}>
              <Text style={styles.manageFamilyText}>Manage Family</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* ── Family & Accounts ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>FAMILY & ACCOUNTS</Text>
            <Text style={styles.sectionSub}>4 active tools</Text>
          </View>
          <View style={styles.menuCard}>
            <MenuItem icon="person-circle-outline" title="Family Members & Permissions" subtitle="Mitesh, Disha, Parents" badge="4 Profiles" />
            <View style={styles.menuDivider} />
            <MenuItem icon="business-outline" title="All Accounts" subtitle="Bank, Cash, Wallets" badge="6 Linked" />
            <View style={styles.menuDivider} />
            <MenuItem icon="pie-chart-outline" title="Budgets" subtitle="₹28,500 of ₹50,000 used" badge="57% spent" showProgress progressValue={57} />
            <View style={styles.menuDivider} />
            <MenuItem icon="wallet-outline" title="Savings Goals" subtitle="Emergency Fund, Wedding" badge="2 Targets" />
          </View>
        </View>

        {/* ── Automation & Data ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AUTOMATION & DATA</Text>
            <Text style={styles.sectionSub}>Zero-cloud sync</Text>
          </View>
          <View style={styles.menuCard}>
            <MenuItem
              icon="chatbubble-outline"
              title="SMS & Automatic Detection"
              subtitle="Enabled • 3 pending review"
              badge="3 new"
              badgeStyle="primary"
              onPress={() => router.push('/sms-review')}
            />
            <View style={styles.menuDivider} />
            <MenuItem icon="cloud-upload-outline" title="Statement & CSV Import" subtitle="Import bank statements" badge="PDF, CSV, OFX" />
            <View style={styles.menuDivider} />
            <MenuItem icon="analytics-outline" title="Analytics & Reports" subtitle="Cash flow & Net Worth trends" />
          </View>
        </View>

        {/* ── Preferences & Security ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PREFERENCES & SECURITY</Text>
            <View style={styles.encryptedBadge}>
              <Ionicons name="shield-checkmark" size={12} color={Colors.primaryContainer} />
              <Text style={styles.encryptedText}>Encrypted</Text>
            </View>
          </View>
          <View style={styles.menuCard}>
            <MenuItem icon="finger-print-outline" title="App Lock & Biometrics" subtitle="Fingerprint / Face ID enabled" badge="Active" />
            <View style={styles.menuDivider} />
            <MenuItem icon="lock-closed-outline" title="Privacy & On-Device Storage" subtitle="Privacy-first mode" badge="SQLite Local" />
            <View style={styles.menuDivider} />
            {/* Toggle row */}
            <View style={styles.menuItem}>
              <View style={styles.menuIcon}>
                <Ionicons name="eye-off-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Hide Balances</Text>
                <Text style={styles.menuSub}>Show ₹••••••</Text>
              </View>
              <Switch
                value={hideBalances}
                onValueChange={setHideBalances}
                trackColor={{ false: Colors.borderStrong, true: Colors.primaryContainer }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={styles.menuDivider} />
            <MenuItem icon="settings-outline" title="Settings" subtitle="Currency, language, notifications" />
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerMeta}>PFinanc v2.4.0 • Zero trackers • Swiss Precision</Text>
          <Text style={styles.footerSub}>Encrypted database synced on local Wi-Fi only</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceCanvas },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.marginMobile, gap: Spacing.lg },

  // Profile Card
  profileCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileAvatarWrap: { position: 'relative' },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primaryContainer,
  },
  profileAvatarText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  verifiedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surfaceCard,
  },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileName: { fontSize: 20, fontWeight: '700', color: Colors.onSurface },
  adminBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surfaceSubtle,
  },
  adminBadgeText: { fontSize: 11, color: Colors.secondary },
  familyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  familyText: { fontSize: 13, color: Colors.secondary },
  memberStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceSubtle,
  },
  memberAvatars: { flexDirection: 'row' },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    borderWidth: 2,
    borderColor: Colors.surfaceCard,
  },
  memberAvatarText: { fontSize: 10, fontWeight: '600' },
  manageFamilyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  manageFamilyText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  // Sections
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  sectionTitle: { fontSize: 11, color: Colors.secondary, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionSub: { fontSize: 11, color: Colors.secondary },
  encryptedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  encryptedText: { fontSize: 11, color: Colors.tertiary, fontWeight: '600' },

  // Menu card
  menuCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: Colors.onSurface },
  menuSub: { fontSize: 13, color: Colors.secondary, marginTop: 2 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surfaceContainerLow,
  },
  menuBadgePrimary: { backgroundColor: Colors.primaryContainer, borderRadius: Radii.full },
  menuBadgeRed: { backgroundColor: Colors.signalRed, borderRadius: Radii.full },
  menuBadgeText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  menuBadgeTextPrimary: { color: '#ffffff', fontWeight: '700' },
  menuDivider: { height: 1, backgroundColor: Colors.borderSubtle, marginLeft: 16 },
  miniProgress: {
    width: 64,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceSubtle,
    overflow: 'hidden',
  },
  miniProgressFill: { height: '100%', backgroundColor: Colors.primaryContainer, borderRadius: 3 },

  // Footer
  footer: { alignItems: 'center', gap: 4, paddingVertical: Spacing.sm },
  footerMeta: { fontSize: 11, color: Colors.secondary },
  footerSub: { fontSize: 11, color: Colors.outline },
});
