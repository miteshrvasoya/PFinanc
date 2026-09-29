/**
 * UnlockScreen — "App Unlock - OTP & Biometrics" Stitch screen.
 * Features:
 * - Fingerprint icon with pulsing ring
 * - "Verify & Unlock" headline
 * - Biometric tap card
 * - OR divider
 * - 6-digit OTP display (dot indicators + active cursor)
 * - Resend timer
 * - Full numeric keypad with fingerprint + backspace
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radii } from '../theme';

const KEYPAD_KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function UnlockScreen() {
  const router = useRouter();
  const [filledCount, setFilledCount] = useState(4); // demo: 4 filled
  const [resendSeconds, setResendSeconds] = useState(24);
  const [pulseAnim] = useState(() => new Animated.Value(0.95));
  const [cursorAnim] = useState(() => new Animated.Value(1));

  // Pulse animation for fingerprint ring
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.95, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  // Cursor blink
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, [cursorAnim]);

  // Resend countdown
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setInterval(() => setResendSeconds(s => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const handleKey = (key: string) => {
    if (key === '⌫') {
      setFilledCount(prev => Math.max(0, prev - 1));
    } else if (key === '') {
      // fingerprint key
      handleBiometric();
    } else if (filledCount < 6) {
      const next = filledCount + 1;
      setFilledCount(next);
      if (next === 6) {
        setTimeout(() => router.replace('/(tabs)/home'), 400);
      }
    }
  };

  const handleBiometric = () => {
    setTimeout(() => router.replace('/(tabs)/home'), 500);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.secondary} />
        </Pressable>
        <View style={styles.securityBadge}>
          <Ionicons name="lock-closed" size={14} color={Colors.primary} />
          <Text style={styles.securityText}>Local Vault Encrypted</Text>
        </View>
        <Pressable style={styles.helpBtn}>
          <Ionicons name="help-circle-outline" size={20} color={Colors.secondary} />
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Fingerprint icon with pulsing ring */}
        <View style={styles.iconSection}>
          <View style={styles.iconOuter}>
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
            <View style={styles.iconInner}>
              <Ionicons name="finger-print" size={32} color={Colors.primary} />
            </View>
          </View>
          <Text style={styles.verifyTitle}>Verify & Unlock</Text>
          <Text style={styles.verifySub}>
            Vasoya Family Vault •{' '}
            <Text style={{ color: Colors.onSurface, fontWeight: '600' }}>Mitesh Vasoya</Text>
          </Text>
        </View>

        {/* Biometric card */}
        <Pressable
          style={({ pressed }) => [styles.bioCard, pressed && { borderColor: Colors.primaryContainer }]}
          onPress={handleBiometric}
        >
          <View style={styles.bioIconWrap}>
            <Ionicons name="radio-outline" size={24} color={Colors.primary} />
          </View>
          <View style={styles.bioTextWrap}>
            <View style={styles.bioTitleRow}>
              <Text style={styles.bioTitle}>Tap to unlock with Biometrics</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.secondary} />
            </View>
            <Text style={styles.bioSub}>Touch sensor or glance at camera</Text>
          </View>
        </Pressable>

        {/* Divider */}
        <View style={styles.orDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.orText}>OR ENTER 6-DIGIT OTP</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* OTP Boxes */}
        <View style={styles.otpRow}>
          {[0,1,2,3,4,5].map((i) => {
            const isFilled = i < filledCount;
            const isActive = i === filledCount && filledCount < 6;
            return (
              <View key={i} style={[styles.otpBox, isActive && styles.otpBoxActive]}>
                {isFilled ? (
                  <View style={styles.otpDot} />
                ) : isActive ? (
                  <Animated.View style={[styles.cursor, { opacity: cursorAnim }]} />
                ) : (
                  <View style={styles.otpEmpty} />
                )}
              </View>
            );
          })}
        </View>

        {/* Resend row */}
        <View style={styles.resendRow}>
          <View style={styles.resendLeft}>
            <Ionicons name="chatbubble-outline" size={13} color={Colors.secondary} />
            <Text style={styles.resendLabel}>
              Code sent to{' '}
              <Text style={{ color: Colors.onSurface, fontWeight: '600' }}>+91 98765 •••10</Text>
            </Text>
          </View>
          <Pressable>
            <Text style={styles.resendBtn}>
              {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend'}
            </Text>
          </Pressable>
        </View>

        {/* Numeric Keypad */}
        <View style={styles.keypad}>
          {KEYPAD_KEYS.map((key, idx) => {
            const isBio = key === '';
            const isBack = key === '⌫';
            return (
              <Pressable
                key={idx}
                style={({ pressed }) => [
                  styles.key,
                  (isBio || isBack) && styles.keySecondary,
                  pressed && styles.keyPressed,
                ]}
                onPress={() => handleKey(key)}
              >
                {isBio ? (
                  <Ionicons name="finger-print" size={26} color={Colors.primary} />
                ) : isBack ? (
                  <Ionicons name="backspace-outline" size={22} color={Colors.secondary} />
                ) : (
                  <Text style={styles.keyText}>{key}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Ionicons name="shield-checkmark-outline" size={14} color={Colors.tertiaryContainer} />
        <Text style={styles.footerText}>
          Offline biometric verification enabled. PFinanc keeps your keys on your device.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceCanvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceCard,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.lg },
  helpBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.lg },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  securityText: { fontSize: 11, fontWeight: '600', color: Colors.onSurface, letterSpacing: 0.5 },

  content: { flex: 1, paddingHorizontal: Spacing.marginMobile, paddingTop: 20, gap: 20 },

  // Icon section
  iconSection: { alignItems: 'center', gap: 6, marginBottom: 4 },
  iconOuter: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  pulseRing: {
    position: 'absolute',
    inset: 0,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.primaryContainer,
    opacity: 0.25,
  },
  iconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyTitle: { fontSize: 28, fontWeight: '700', color: Colors.primary, letterSpacing: -0.4 },
  verifySub: { fontSize: 14, color: Colors.secondary },

  // Bio card
  bioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  bioIconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bioTextWrap: { flex: 1 },
  bioTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bioTitle: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
  bioSub: { fontSize: 13, color: Colors.secondary, marginTop: 2 },

  // OR divider
  orDivider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderSubtle },
  orText: { fontSize: 10, color: Colors.secondary, fontWeight: '600', letterSpacing: 1 },

  // OTP boxes
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  otpBoxActive: { borderWidth: 2, borderColor: Colors.primaryContainer },
  otpDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  otpEmpty: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.outlineVariant },
  cursor: { width: 2, height: 24, borderRadius: 1, backgroundColor: Colors.primaryContainer },

  // Resend
  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resendLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resendLabel: { fontSize: 13, color: Colors.secondary },
  resendBtn: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // Keypad
  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  key: {
    width: '30%',
    aspectRatio: 1.8,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  keySecondary: { backgroundColor: Colors.surfaceSubtle },
  keyPressed: { transform: [{ translateY: 1 }] },
  keyText: { fontSize: 24, fontWeight: '600', color: Colors.onSurface, letterSpacing: -0.3 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: Spacing.md,
  },
  footerText: { fontSize: 11, color: Colors.secondary, textAlign: 'center', flex: 1, lineHeight: 16 },
});
