import React, { useRef, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { ServerSettingsModal } from '../components/ServerSettingsModal';

export const LoginScreen = () => {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const passwordRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverModal, setServerModal] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.post('/api/auth/login', { email: email.trim(), password });
      if (response.success && response.data) {
        const { token, user, households } = response.data;
        const defaultHousehold = households && households.length > 0 ? households[0].id : undefined;
        await login(token, user, defaultHousehold);
      }
    } catch (error: any) {
      const msg: string = error.message || 'Invalid credentials';
      if (/can't reach|took too long/i.test(msg)) {
        Alert.alert('Can\'t connect', msg, [
          { text: 'Server settings', onPress: () => setServerModal(true) },
          { text: 'OK', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Login failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const comingSoon = (title: string) =>
    Alert.alert(title, 'Please contact your household admin or visit the PFinanc web app to continue.');

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand header sits at the top so the form is within thumb reach */}
        <LinearGradient
          colors={[colors.primaryContainer, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 28 }]}
        >
          <View style={styles.orb} />
          <View style={styles.logo}>
            <Text style={styles.logoText}>P₹</Text>
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your family wealth dashboard</Text>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="mail-outline" size={20} color={colors.onSurfaceVariant} />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.outline}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          <View style={styles.labelRow}>
            <Text style={styles.label}>Password</Text>
            <Pressable onPress={() => comingSoon('Reset password')} hitSlop={8}>
              <Text style={styles.link}>Forgot?</Text>
            </Pressable>
          </View>
          <View style={styles.inputContainer}>
            <MaterialIcons name="lock-outline" size={20} color={colors.onSurfaceVariant} />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={colors.outline}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
            <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}>
              <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={20} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [styles.loginBtn, (loading || pressed) && styles.loginBtnDim]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <Text style={styles.loginBtnText}>Sign in</Text>
                <MaterialIcons name="arrow-forward" size={18} color={colors.onPrimary} />
              </>
            )}
          </Pressable>

          <View style={styles.trustRow}>
            <MaterialIcons name="lock" size={14} color={colors.outline} />
            <Text style={styles.trustText}>Bank-grade encryption • Your data stays private</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to PFinanc? </Text>
          <Pressable onPress={() => comingSoon('Create account')} hitSlop={8}>
            <Text style={styles.link}>Create an account</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => setServerModal(true)} style={styles.serverLink} hitSlop={8}>
          <MaterialIcons name="settings-ethernet" size={16} color={colors.outline} />
          <Text style={styles.serverLinkText}>Can't connect? Server settings</Text>
        </Pressable>
        <View style={{ height: insets.bottom + 16 }} />
        <ServerSettingsModal visible={serverModal} onClose={() => setServerModal(false)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1 },
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 64,
    alignItems: 'center',
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  orb: {
    position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(192, 236, 214, 0.1)',
  },
  logo: {
    width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 16,
  },
  logoText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26, color: colors.primaryFixed },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 26, color: colors.onPrimary },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: colors.onPrimaryContainer, marginTop: 6 },
  card: {
    marginHorizontal: 20, marginTop: -40, padding: 20, borderRadius: 24,
    backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: 'rgba(193,200,194,0.4)',
    shadowColor: '#0b1c15', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 12, height: 54, paddingHorizontal: 14, marginBottom: 16,
    borderRadius: 14, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant,
  },
  input: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.onSurface },
  link: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primaryContainer },
  loginBtn: {
    flexDirection: 'row', gap: 8, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primaryContainer, marginTop: 4,
  },
  loginBtnDim: { opacity: 0.8 },
  loginBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.onPrimary },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
  trustText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.outline },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  serverLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  serverLinkText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: colors.outline },
  footerText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant },
});
