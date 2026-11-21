import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);

  const authenticate = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        setError("Biometric hardware not found.");
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        setError("No biometrics enrolled on this device.");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock PFinanc',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        onUnlock();
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred during authentication.');
    }
  };

  useEffect(() => {
    authenticate();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <MaterialIcons name="lock-outline" size={64} color={colors.primary} />
        </View>
        <Text style={styles.title}>PFinanc Vault</Text>
        <Text style={styles.subtitle}>Unlock your secure financial data</Text>
        
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <Pressable style={styles.unlockBtn} onPress={authenticate}>
          <MaterialIcons name="fingerprint" size={24} color={colors.onPrimary} />
          <Text style={styles.unlockBtnText}>Unlock with Biometrics</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 28,
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: colors.onSurfaceVariant,
    marginBottom: 48,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: colors.error,
    marginBottom: 24,
    textAlign: 'center',
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    width: '100%',
  },
  unlockBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: colors.onPrimary,
  }
});
