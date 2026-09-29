/**
 * TopAppBar — Shared top bar used across main screens.
 * Matches Stitch: avatar + household name selector, notifications badge.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Spacing } from '../../theme';

interface TopAppBarProps {
  householdName?: string;
  greeting?: string;
  notificationCount?: number;
  onHouseholdPress?: () => void;
  onNotificationsPress?: () => void;
  /** Use compact mode (icon + name, no greeting) — used on Transactions/Investments/More */
  compact?: boolean;
  title?: string;
  subtitle?: string;
  onBackPress?: () => void;
  showBack?: boolean;
  right?: React.ReactNode;
}

export default function TopAppBar({
  householdName = 'Vasoya Family',
  greeting = 'Good morning 👋',
  notificationCount = 3,
  onHouseholdPress,
  onNotificationsPress,
  compact = false,
  title,
  subtitle,
  onBackPress,
  showBack = false,
  right,
}: TopAppBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leading}>
        {showBack ? (
          <Pressable onPress={onBackPress} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={Colors.secondary} />
          </Pressable>
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>MV</Text>
          </View>
        )}

        {compact ? (
          <View>
            <Text style={styles.compactSubtitle}>{subtitle ?? 'Encrypted Vault'}</Text>
            <Text style={styles.compactTitle}>{title ?? householdName}</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Pressable style={styles.householdBtn} onPress={onHouseholdPress}>
              <Text style={styles.householdName}>{householdName}</Text>
              <Ionicons name="chevron-down" size={16} color={Colors.secondary} />
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.trailing}>
        {right ?? (
          <Pressable style={styles.notifBtn} onPress={onNotificationsPress}>
            <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notificationCount}</Text>
              </View>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceCanvas,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    flexShrink: 0,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  greeting: {
    fontSize: 13,
    color: Colors.secondary,
    lineHeight: 18,
  },
  householdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  householdName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  compactSubtitle: {
    fontSize: 10,
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.08 * 10,
  },
  compactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.onSurface,
    letterSpacing: -0.3,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifBtn: {
    padding: 8,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.signalRed,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
});
