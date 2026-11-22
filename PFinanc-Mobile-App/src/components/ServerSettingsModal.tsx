import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getApiBaseUrl, setApiBaseUrlOverride, testServer } from '../api/client';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Lets the user point the app at their backend without rebuilding (useful when the PC's Wi-Fi IP changes). */
export const ServerSettingsModal: React.FC<Props> = ({ visible, onClose }) => {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (visible) {
      setResult(null);
      getApiBaseUrl().then(setUrl);
    }
  }, [visible]);

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    const err = await testServer(url);
    setResult(err ? { ok: false, text: err } : { ok: true, text: 'Connected! The server is reachable.' });
    setTesting(false);
  };

  const save = async () => {
    await setApiBaseUrlOverride(url);
    onClose();
  };

  const reset = async () => {
    await setApiBaseUrlOverride(null);
    setUrl(await getApiBaseUrl());
    setResult(null);
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>Server address</Text>
            <Pressable onPress={onClose} hitSlop={8}><MaterialIcons name="close" size={22} color={colors.onSurfaceVariant} /></Pressable>
          </View>
          <Text style={styles.help}>
            The app talks to your PFinanc backend at this address. On a real phone use your PC's Wi-Fi IP, for example http://192.168.1.10:5000, with the phone on the same Wi-Fi. On an Android emulator use http://10.0.2.2:5000.
          </Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={(t) => { setUrl(t); setResult(null); }}
            placeholder="http://192.168.1.10:5000"
            placeholderTextColor={colors.outline}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          {result && (
            <View style={[styles.result, { backgroundColor: result.ok ? colors.primaryFixed : colors.errorContainer }]}>
              <MaterialIcons name={result.ok ? 'check-circle' : 'error-outline'} size={18} color={result.ok ? colors.onPrimaryFixed : colors.onErrorContainer} />
              <Text style={[styles.resultText, { color: result.ok ? colors.onPrimaryFixed : colors.onErrorContainer }]}>{result.text}</Text>
            </View>
          )}
          <Pressable style={styles.testBtn} onPress={runTest} disabled={testing}>
            {testing ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.testText}>Test connection</Text>}
          </Pressable>
          <Pressable style={styles.saveBtn} onPress={save}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
          <Pressable onPress={reset} style={styles.resetBtn}>
            <Text style={styles.resetText}>Reset to automatic</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.surfaceContainerLowest, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 32, gap: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: colors.onSurface },
  help: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.onSurfaceVariant, lineHeight: 19 },
  input: { height: 52, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.surfaceContainerLow, borderWidth: 1, borderColor: colors.outlineVariant, fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.onSurface },
  result: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, alignItems: 'center' },
  resultText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  testBtn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainer },
  testText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.primary },
  saveBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryContainer },
  saveText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.onPrimary },
  resetBtn: { alignItems: 'center', paddingVertical: 4 },
  resetText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primaryContainer },
});
