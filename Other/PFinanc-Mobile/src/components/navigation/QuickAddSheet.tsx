/**
 * QuickAddSheet — Bottom sheet that opens when the FAB is pressed.
 * Matches the Stitch "Quick Action" overlay with 5 actions in a grid.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Shadows } from '../../theme';



interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  route?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'expense',
    label: 'Expense',
    icon: 'trending-down',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    iconColor: Colors.signalRed,
    route: '/add-expense',
  },
  {
    id: 'income',
    label: 'Income',
    icon: 'trending-up',
    bgColor: Colors.incomeGreenBg,
    borderColor: '#A7F3D0',
    iconColor: Colors.incomeGreen,
    route: '/add-income',
  },
  {
    id: 'transfer',
    label: 'Transfer',
    icon: 'swap-horizontal',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    iconColor: Colors.primaryContainer,
    route: '/add-transfer',
  },
  {
    id: 'invest',
    label: 'Invest',
    icon: 'analytics',
    bgColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    iconColor: '#4338CA',
    route: '/add-investment',
  },
  {
    id: 'scan',
    label: 'Scan',
    icon: 'scan',
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    iconColor: '#6D28D9',
    route: '/scan',
  },
];

interface QuickAddSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function QuickAddSheet({ visible, onClose }: QuickAddSheetProps) {
  const router = useRouter();
  const [backdropAnim] = useState(() => new Animated.Value(0));
  const [sheetAnim] = useState(() => new Animated.Value(200));
  const [scaleAnim] = useState(() => new Animated.Value(0.95));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 180 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 180 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(sheetAnim, { toValue: 200, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, backdropAnim, sheetAnim, scaleAnim]);

  const handleAction = (action: QuickAction) => {
    onClose();
    if (action.route) {
      setTimeout(() => router.push(action.route as any), 200);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [
              { translateY: sheetAnim },
              { scale: scaleAnim },
            ],
            opacity: backdropAnim,
          },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        {/* Header */}
        <View style={styles.sheetHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.pulsingDot} />
            <Text style={styles.headerTitle}>Quick Action</Text>
          </View>
          <Text style={styles.headerSub}>Tap to record</Text>
        </View>

        {/* 5-Action Grid */}
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              style={({ pressed }) => [styles.actionBtn, pressed && { transform: [{ scale: 0.92 }] }]}
              onPress={() => handleAction(action)}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.bgColor, borderColor: action.borderColor }]}>
                <Ionicons name={action.icon} size={22} color={action.iconColor} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.40)',
  },
  sheet: {
    position: 'absolute',
    bottom: 96,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: Radii['3xl'],
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    ...Shadows.navBar,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceSubtle,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryContainer,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 11,
    color: Colors.secondary,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 16,
    flex: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSurface,
    letterSpacing: -0.2,
  },
});
