/**
 * LoginScreen — Matches Stitch "Login to PFinanc" design.
 *
 * Features:
 * - Shield+₹ brand logo
 * - "Zero-Knowledge Vault" badge
 * - Mobile/Email segmented tab
 * - Phone number input with +91 prefix
 * - Send OTP primary button
 * - Biometric quick unlock option
 * - Footer privacy badge + legal microcopy
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radii } from '../theme';

type AuthTab = 'mobile' | 'email';

export default function LoginScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AuthTab>('mobile');
  const [phoneNumber, setPhoneNumber] = useState('98765 43210');
  const [email, setEmail] = useState('mitesh.vasoya@family.in');

  const handleSendOTP = () => {
    router.push('/unlock');
  };

  const handleBiometric = () => {
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand Header ── */}
          <View style={styles.brandSection}>
            {/* Shield + ₹ Logo */}
            <View style={styles.logoOuter}>
              <View style={styles.logoInner}>
                <Ionicons name="shield-checkmark" size={32} color={Colors.primaryContainer} />
                <View style={styles.rupeeOverlay}>
                  <Text style={styles.rupeeSymbol}>₹</Text>
                </View>
              </View>
            </View>

            {/* Zero-Knowledge badge */}
            <View style={styles.trustBadge}>
              <View style={styles.trustDot} />
              <Text style={styles.trustText}>ZERO-KNOWLEDGE VAULT</Text>
            </View>

            <Text style={styles.headline}>Welcome to PFinanc</Text>
            <Text style={styles.subheadline}>
              Your family&apos;s finances, private and secure on your device
            </Text>
          </View>

          {/* ── Auth Card ── */}
          <View style={styles.card}>
            {/* Segmented Tab Switcher */}
            <View style={styles.tabSwitcher}>
              <Pressable
                style={[styles.tabOption, activeTab === 'mobile' && styles.tabOptionActive]}
                onPress={() => setActiveTab('mobile')}
              >
                <Text style={[styles.tabOptionText, activeTab === 'mobile' && styles.tabOptionTextActive]}>
                  Mobile Number
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tabOption, activeTab === 'email' && styles.tabOptionActive]}
                onPress={() => setActiveTab('email')}
              >
                <Text style={[styles.tabOptionText, activeTab === 'email' && styles.tabOptionTextActive]}>
                  Email
                </Text>
              </Pressable>
            </View>

            {/* Input Field */}
            {activeTab === 'mobile' ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Mobile Number</Text>
                <View style={styles.phoneInput}>
                  {/* Country Selector */}
                  <View style={styles.countrySelector}>
                    <Text style={styles.flagEmoji}>🇮🇳</Text>
                    <Text style={styles.countryCode}>+91</Text>
                    <Ionicons name="chevron-down" size={16} color={Colors.secondary} />
                  </View>
                  <TextInput
                    style={styles.phoneTextInput}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    placeholder="Enter mobile number"
                    placeholderTextColor={Colors.outlineVariant}
                  />
                </View>
                {/* Microcopy */}
                <View style={styles.infoRow}>
                  <Ionicons name="information-circle-outline" size={14} color={Colors.secondary} />
                  <Text style={styles.infoText}>
                    We will send a 6-digit verification code (OTP) via SMS to verify your account.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={styles.emailInput}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="Enter your family email"
                  placeholderTextColor={Colors.outlineVariant}
                />
              </View>
            )}

            {/* Send OTP Button */}
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.88 }]}
              onPress={handleSendOTP}
            >
              <Text style={styles.primaryBtnText}>Send OTP</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </Pressable>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign in with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Biometric Option */}
            <Pressable
              style={({ pressed }) => [styles.biometricBtn, pressed && { backgroundColor: Colors.surfaceSubtle }]}
              onPress={handleBiometric}
            >
              <View style={styles.biometricIconWrap}>
                <Ionicons name="finger-print" size={24} color={Colors.primaryContainer} />
              </View>
              <View style={styles.biometricText}>
                <Text style={styles.biometricTitle}>Unlock with Face ID / Fingerprint</Text>
                <Text style={styles.biometricSub}>For registered device Mitesh Vasoya</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.secondary} />
            </Pressable>
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            {/* Privacy Badge */}
            <View style={styles.privacyBadge}>
              <Ionicons name="lock-closed" size={16} color={Colors.incomeGreen} />
              <Text style={styles.privacyText}>
                100% on-device encryption. No cloud tracking or financial data sharing.
              </Text>
            </View>

            <Pressable>
              <Text style={styles.supportLink}>Need help signing in? Contact support</Text>
            </Pressable>

            <Text style={styles.signupRow}>
              New to PFinanc?{' '}
              <Text style={styles.signupLink} onPress={() => router.push('/unlock')}>
                Create an account
              </Text>
            </Text>

            <Text style={styles.legal}>
              Institutional Swiss-grade privacy standard • Version 2.4.0
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceCanvas },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.marginMobile,
    paddingVertical: Spacing.lg,
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },

  // Brand
  brandSection: { alignItems: 'center', gap: 8, marginTop: Spacing.sm },
  logoOuter: {
    width: 64,
    height: 64,
    borderRadius: Radii.xl,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 4,
  },
  logoInner: {
    width: 48,
    height: 48,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  rupeeOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  rupeeSymbol: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryContainer,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  trustDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.incomeGreen },
  trustText: { fontSize: 10, color: Colors.secondary, fontWeight: '500', letterSpacing: 0.8 },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.onSurface,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subheadline: { fontSize: 14, color: Colors.secondary, textAlign: 'center', lineHeight: 21 },

  // Card
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.lg,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },

  // Tab
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radii.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  tabOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radii.lg - 2,
  },
  tabOptionActive: {
    backgroundColor: Colors.surfaceCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  tabOptionText: { fontSize: 14, fontWeight: '500', color: Colors.secondary },
  tabOptionTextActive: { color: Colors.onSurface, fontWeight: '600' },

  // Fields
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surfaceCard,
    overflow: 'hidden',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: Colors.borderSubtle,
    backgroundColor: 'rgba(242,244,245,0.5)',
  },
  flagEmoji: { fontSize: 16 },
  countryCode: { fontSize: 13, fontWeight: '600', color: Colors.onSurface },
  phoneTextInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.onSurface,
    letterSpacing: 0.5,
  },
  emailInput: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceCard,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingTop: 4 },
  infoText: { flex: 1, fontSize: 11, color: Colors.secondary, lineHeight: 16 },

  // Primary Button
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radii.lg,
    paddingVertical: 14,
    shadowColor: Colors.primaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '600', color: '#ffffff', letterSpacing: 0.2 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderSubtle },
  dividerText: { fontSize: 11, color: Colors.secondary },

  // Biometric
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: 'rgba(242,244,245,0.5)',
  },
  biometricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricText: { flex: 1 },
  biometricTitle: { fontSize: 14, fontWeight: '600', color: Colors.onSurface },
  biometricSub: { fontSize: 11, color: Colors.secondary, marginTop: 2 },

  // Footer
  footer: { alignItems: 'center', gap: 12, paddingBottom: Spacing.lg },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  privacyText: { flex: 1, fontSize: 11, color: Colors.onSurfaceVariant, lineHeight: 16 },
  supportLink: { fontSize: 14, color: Colors.secondary, textDecorationLine: 'underline' },
  signupRow: { fontSize: 14, color: Colors.secondary },
  signupLink: { color: Colors.primaryContainer, fontWeight: '600' },
  legal: { fontSize: 11, color: Colors.secondary, textAlign: 'center' },
});
