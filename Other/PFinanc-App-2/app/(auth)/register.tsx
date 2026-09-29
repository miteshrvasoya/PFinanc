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

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, householdName.trim() || undefined);
      router.replace('/(app)');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message ?? 'Could not create account.');
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Set up your family's financial hub</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.fields}>
            <Input
              label="Your Name *"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder="Mitesh Vasoya"
            />
            <Input
              label="Email Address *"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="you@example.com"
            />
            <Input
              label="Password *"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Min. 8 characters"
            />
            <Input
              label="Household Name (optional)"
              value={householdName}
              onChangeText={setHouseholdName}
              autoCapitalize="words"
              placeholder="e.g. Vasoya Family"
              hint="You can set this up later"
            />
          </View>

          <Button
            label="Create Account"
            fullWidth
            loading={loading}
            onPress={handleRegister}
            style={styles.createBtn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign In</Text>
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
    paddingTop: 60,
    paddingBottom: 40,
    gap: Spacing.xl,
  },
  header: { gap: Spacing.xs },
  backBtn: { marginBottom: Spacing.sm },
  backText: { ...Typography.bodyMd, color: Colors.secondary },
  title: { ...Typography.headlineLg, color: Colors.onSurface },
  subtitle: { ...Typography.bodyMd, color: Colors.onSurfaceMuted },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    gap: Spacing.base,
  },
  fields: { gap: Spacing.md },
  createBtn: { marginTop: Spacing.xs },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { ...Typography.bodyMd, color: Colors.onSurfaceMuted },
  footerLink: { ...Typography.bodyMd, color: Colors.secondary, fontFamily: 'Inter_600SemiBold' },
});
