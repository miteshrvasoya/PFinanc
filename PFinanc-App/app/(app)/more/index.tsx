import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/authStore';
import { Avatar } from '../../../src/components/ui';
import { Colors, Spacing, Typography } from '../../../src/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  value?: string;
  destructive?: boolean;
  badge?: string;
}

function MenuItem({ icon, label, onPress, value, destructive, badge }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, destructive && styles.menuIconDanger]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={destructive ? Colors.danger : Colors.onSurfaceMuted}
        />
      </View>
      <Text style={[styles.menuLabel, destructive && { color: Colors.danger }]}>{label}</Text>
      <View style={styles.menuRight}>
        {value ? <Text style={styles.menuValue}>{value}</Text> : null}
        {badge ? (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>{badge}</Text>
          </View>
        ) : null}
        {!destructive && (
          <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.onSurfaceSubtle} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function MoreScreen() {
  const router = useRouter();
  const { user, household, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Avatar name={user?.name ?? 'User'} size={56} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileHousehold}>
              <MaterialCommunityIcons name="home-city" size={12} color={Colors.onSurfaceMuted} />
              {' '}{household?.name ?? 'No household'}
            </Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user?.role ?? 'MEMBER'}</Text>
          </View>
        </View>

        {/* Finance */}
        <View style={styles.section}>
          <SectionHeader title="Finance" />
          <View style={styles.menuGroup}>
            <MenuItem
              icon="bank-transfer"
              label="Add Transfer"
              onPress={() => router.push('/(app)/more/transfer')}
            />
            <MenuItem
              icon="file-upload"
              label="Import Bank Statement"
              onPress={() => router.push('/(app)/more/import')}
              badge="CSV"
            />
            <MenuItem
              icon="account-group"
              label="Family Overview"
              onPress={() => router.push('/(app)/family/')}
            />
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <SectionHeader title="Account" />
          <View style={styles.menuGroup}>
            <MenuItem
              icon="account-edit"
              label="Profile Settings"
              onPress={() => Alert.alert('Coming Soon', 'Profile settings will be available in a future update.')}
            />
            <MenuItem
              icon="bell-outline"
              label="Notifications"
              onPress={() => Alert.alert('Coming Soon', 'Notification settings coming soon.')}
            />
          </View>
        </View>

        {/* App */}
        <View style={styles.section}>
          <SectionHeader title="App" />
          <View style={styles.menuGroup}>
            <MenuItem
              icon="information-outline"
              label="About PFinanc"
              onPress={() => Alert.alert('PFinanc', 'v1.0.0\n\nA powerful self-hosted personal and family finance manager.\n\nBuilt with ❤️ using React Native + Expo')}
            />
            <MenuItem
              icon="shield-check-outline"
              label="Privacy & Security"
              onPress={() => Alert.alert('Privacy', 'PFinanc is self-hosted. All your data stays on your server.')}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <View style={styles.menuGroup}>
            <MenuItem
              icon="logout"
              label="Sign Out"
              onPress={handleLogout}
              destructive
            />
          </View>
        </View>

        <Text style={styles.version}>PFinanc v1.0.0 · Self-Hosted Family Finance OS</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.layoutMargin, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface,
  },
  title: { ...Typography.headlineMd, color: Colors.onSurface },
  content: { padding: Spacing.layoutMargin, gap: Spacing.base, paddingBottom: 40 },

  // Profile
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.base,
  },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { ...Typography.bodyMd, fontFamily: 'Inter_700Bold', color: Colors.onSurface },
  profileEmail: { ...Typography.bodySm, color: Colors.onSurfaceMuted },
  profileHousehold: { ...Typography.labelSm, color: Colors.onSurfaceMuted, marginTop: 2 },
  roleBadge: {
    backgroundColor: Colors.primary, borderRadius: Spacing.pillRadius,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  roleBadgeText: { ...Typography.labelSm, color: Colors.onPrimary, fontFamily: 'Inter_600SemiBold' },

  // Sections
  section: { gap: Spacing.sm },
  sectionHeader: {
    ...Typography.labelMd, color: Colors.onSurfaceMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: Colors.surface, borderRadius: Spacing.cardRadius,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.base, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border, minHeight: 52,
  },
  menuIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.surfaceDim, alignItems: 'center', justifyContent: 'center',
  },
  menuIconDanger: { backgroundColor: Colors.dangerBg },
  menuLabel: { ...Typography.bodyMd, color: Colors.onSurface, flex: 1 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuValue: { ...Typography.labelMd, color: Colors.onSurfaceMuted },
  menuBadge: {
    backgroundColor: Colors.secondary, borderRadius: Spacing.pillRadius,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  menuBadgeText: { ...Typography.labelSm, color: Colors.onPrimary, fontFamily: 'Inter_700Bold' },
  version: { ...Typography.labelSm, color: Colors.onSurfaceSubtle, textAlign: 'center', marginTop: 8 },
});
