import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { onboardingApi, categoriesApi } from '../../src/api/misc';
import { accountsApi } from '../../src/api/accounts';
import { Button, Input } from '../../src/components/ui';
import { Colors, Spacing, Typography } from '../../src/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type OnboardStep = 0 | 1 | 2 | 3;

const STEPS = [
  { title: 'Welcome to PFinanc', icon: 'hand-wave', desc: "Your family's financial hub, set up in minutes." },
  { title: 'Name Your Household', icon: 'home-heart', desc: 'Give your household a name to get started.' },
  { title: 'Add Your First Account', icon: 'bank-plus', desc: "Add a bank account so we can track your finances." },
  { title: "You're all set!", icon: 'check-decagram', desc: 'Your household is ready. Start tracking your finances.' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardStep>(0);
  const [householdName, setHouseholdName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('SAVINGS');
  const [openingBalance, setOpeningBalance] = useState('');

  const skipMutation = useMutation({
    mutationFn: onboardingApi.skip,
    onSuccess: () => router.replace('/(app)'),
    onError: () => router.replace('/(app)'),
  });

  const completeMutation = useMutation({
    mutationFn: onboardingApi.complete,
    onSuccess: () => router.replace('/(app)'),
    onError: () => router.replace('/(app)'),
  });

  const createAccountMutation = useMutation({
    mutationFn: accountsApi.create,
  });

  const handleNext = async () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      if (!householdName.trim()) {
        Alert.alert('Required', 'Please enter a household name.');
        return;
      }
      await onboardingApi.updateStep('HOUSEHOLD_SETUP', 'household_named', { household_name: householdName });
      setStep(2);
    } else if (step === 2) {
      if (accountName.trim()) {
        try {
          await createAccountMutation.mutateAsync({
            name: accountName.trim(),
            account_type: accountType,
            opening_balance: parseFloat(openingBalance || '0'),
          });
        } catch {
          // non-fatal, continue anyway
        }
      }
      setStep(3);
    } else {
      completeMutation.mutate();
    }
  };

  const currentStep = STEPS[step];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Progress */}
      <View style={styles.progressBar}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Icon */}
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons
              name={currentStep.icon as any}
              size={64}
              color={step === 3 ? Colors.success : Colors.secondary}
            />
          </View>

          <Text style={styles.stepTitle}>{currentStep.title}</Text>
          <Text style={styles.stepDesc}>{currentStep.desc}</Text>

          {/* Step 1 — Household Name */}
          {step === 1 && (
            <Input
              label="Household Name"
              value={householdName}
              onChangeText={setHouseholdName}
              placeholder="e.g. Vasoya Family"
              autoCapitalize="words"
              containerStyle={styles.inputGroup}
            />
          )}

          {/* Step 2 — First Account */}
          {step === 2 && (
            <View style={styles.inputGroup}>
              <Input
                label="Account Name"
                value={accountName}
                onChangeText={setAccountName}
                placeholder="e.g. HDFC Savings"
              />
              <View style={styles.typeRow}>
                {['SAVINGS', 'CURRENT', 'CASH'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, accountType === t && styles.typeChipActive]}
                    onPress={() => setAccountType(t)}
                  >
                    <Text style={[styles.typeChipText, accountType === t && styles.typeChipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input
                label="Opening Balance (₹)"
                value={openingBalance}
                onChangeText={setOpeningBalance}
                keyboardType="decimal-pad"
                prefix="₹"
                placeholder="0.00"
              />
            </View>
          )}

          {/* Navigation */}
          <View style={styles.actions}>
            <Button
              label={step === 3 ? 'Go to Dashboard' : step === 2 ? (accountName ? 'Add Account & Continue →' : 'Skip for Now →') : 'Continue →'}
              fullWidth
              loading={completeMutation.isPending || createAccountMutation.isPending}
              onPress={handleNext}
            />
            {step === 0 && (
              <Button
                label="Skip Setup"
                variant="ghost"
                fullWidth
                onPress={() => skipMutation.mutate()}
                loading={skipMutation.isPending}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  progressBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.layoutMargin,
    justifyContent: 'center',
  },
  progressDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.surfaceVariant,
  },
  progressDotActive: { backgroundColor: Colors.secondary, width: 24 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: 40,
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  stepTitle: { ...Typography.headlineLg, color: Colors.onSurface, textAlign: 'center' },
  stepDesc: { ...Typography.bodyMd, color: Colors.onSurfaceMuted, textAlign: 'center', maxWidth: 280 },
  inputGroup: { width: '100%', gap: Spacing.md, marginTop: Spacing.base },
  typeRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Spacing.pillRadius, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText: { ...Typography.labelMd, color: Colors.onSurfaceMuted },
  typeChipTextActive: { color: Colors.onPrimary },
  actions: { width: '100%', gap: Spacing.sm, marginTop: Spacing.xl },
});
