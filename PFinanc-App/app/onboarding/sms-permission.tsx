import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SmsPermissionService } from '../../src/modules/sms/SmsPermissionService';

export default function SmsPermissionScreen() {
  const router = useRouter();

  const handleContinue = async () => {
    await SmsPermissionService.markEducationScreenShown();
    const granted = await SmsPermissionService.requestSmsPermission();
    if (granted) {
      router.replace('/(app)/automation/settings');
    } else {
      router.back();
    }
  };

  const handleNotNow = async () => {
    await SmsPermissionService.markEducationScreenShown();
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#3B82F6" />
        </View>

        <Text style={styles.title}>Automatically track your transactions</Text>
        
        <Text style={styles.description}>
          PFinanc can detect financial SMS messages and turn them into transaction drafts, so you don't have to enter every payment manually.
        </Text>

        <View style={styles.featuresList}>
          <FeatureItem icon="shield-checkmark-outline" text="Only relevant financial messages are processed" />
          <FeatureItem icon="eye-outline" text="Transactions are validated and require your approval by default" />
          <FeatureItem icon="options-outline" text="You control automatic approval rules" />
          <FeatureItem icon="lock-closed-outline" text="Your personal SMS data is not used for advertising" />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
            <Text style={styles.primaryButtonText}>Enable SMS Detection</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={handleNotNow}>
            <Text style={styles.secondaryButtonText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: any, text: string }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={24} color="#10B981" style={styles.featureIcon} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featuresList: {
    marginBottom: 48,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
  },
  featureIcon: {
    marginRight: 16,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: '#F8FAFC',
    lineHeight: 22,
  },
  buttonContainer: {
    marginTop: 'auto',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
});
