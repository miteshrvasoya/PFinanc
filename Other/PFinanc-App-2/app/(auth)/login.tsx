import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Button, Input } from '../../src/components/ui';
import { Colors, Spacing, Typography } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(app)');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message ?? 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo / Brand */}
        <View style={styles.brand}>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <Text style={styles.appName}>PFinanc</Text>
          <Text style={styles.appTagline}>Family Wealth OS</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSub}>Sign in to your household account</Text>

          <View style={styles.fields}>
            <Input
              label="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              placeholder="••••••••"
              rightElement={
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                  <Text style={styles.showHide}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              }
            />
          </View>

          <Button
            label="Sign In"
            fullWidth
            loading={loading}
            onPress={handleLogin}
            style={styles.signInBtn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}>Create one</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.layoutMargin,
    paddingTop: 80,
    paddingBottom: 40,
    gap: Spacing.xl,
  },
  brand: { alignItems: 'center', gap: Spacing.sm },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    color: Colors.onPrimary,
  },
  appName: {
    ...Typography.headlineLg,
    color: Colors.onSurface,
  },
  appTagline: {
    ...Typography.bodySm,
    color: Colors.onSurfaceMuted,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    gap: Spacing.base,
  },
  cardTitle: { ...Typography.headlineMd, color: Colors.onSurface },
  cardSub: { ...Typography.bodyMd, color: Colors.onSurfaceMuted, marginTop: -8 },
  fields: { gap: Spacing.md },
  showHide: { ...Typography.labelMd, color: Colors.secondary },
  signInBtn: { marginTop: Spacing.xs },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { ...Typography.bodyMd, color: Colors.onSurfaceMuted },
  footerLink: { ...Typography.bodyMd, color: Colors.secondary, fontFamily: 'Inter_600SemiBold' },
});
