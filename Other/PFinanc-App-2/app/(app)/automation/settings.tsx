import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SmsPermissionService } from '../../../src/modules/sms/SmsPermissionService';

export default function AutomationSettings() {
  const router = useRouter();
  const [hasSmsAccess, setHasSmsAccess] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const granted = await SmsPermissionService.hasSmsPermission();
    setHasSmsAccess(granted);
  };

  const handleToggleSms = async () => {
    if (!hasSmsAccess) {
      const granted = await SmsPermissionService.requestSmsPermission();
      setHasSmsAccess(granted);
      if (!granted) {
         Alert.alert('Permission Denied', 'Please enable SMS permissions in Android Settings.');
      }
    } else {
      Alert.alert('Info', 'To disable SMS detection, please remove the SMS permission from Android app settings.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#FFF" /></TouchableOpacity>
        <Text style={styles.title}>Automation Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Permissions</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>SMS Detection</Text>
            <Text style={styles.settingDesc}>
              {hasSmsAccess ? 'Actively monitoring financial messages.' : 'Disabled. Tap to enable.'}
            </Text>
          </View>
          <Switch 
            value={hasSmsAccess}
            onValueChange={handleToggleSms}
            trackColor={{ false: '#334155', true: '#3B82F6' }}
            thumbColor={hasSmsAccess ? '#FFFFFF' : '#94A3B8'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Behavior</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>Auto-add High Confidence</Text>
            <Text style={styles.settingDesc}>Automatically add transactions when we are 95%+ sure.</Text>
          </View>
          <Switch 
            value={autoApprove}
            onValueChange={setAutoApprove}
            trackColor={{ false: '#334155', true: '#3B82F6' }}
            thumbColor={autoApprove ? '#FFFFFF' : '#94A3B8'}
          />
        </View>
      </View>
      
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#94A3B8" />
        <Text style={styles.infoText}>
          PFinanc only analyzes messages from known banks and payment providers. Your personal texts are never sent to our servers.
        </Text>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 40, backgroundColor: '#1E293B' },
  title: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  section: { marginTop: 32 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 20, marginBottom: 12 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', padding: 20 },
  settingTextContainer: { flex: 1, paddingRight: 16 },
  settingLabel: { fontSize: 16, color: '#F8FAFC', fontWeight: '500', marginBottom: 4 },
  settingDesc: { fontSize: 14, color: '#94A3B8' },
  infoBox: { flexDirection: 'row', backgroundColor: '#1E293B', margin: 20, padding: 16, borderRadius: 12, marginTop: 40 },
  infoText: { flex: 1, fontSize: 14, color: '#94A3B8', marginLeft: 12, lineHeight: 20 }
});
