import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { accountsApi } from '../../../src/api/accounts';
import { importsApi } from '../../../src/api/misc';
import { Button } from '../../../src/components/ui';
import { Colors, Spacing, Typography } from '../../../src/theme';
import { formatINR } from '../../../src/utils/currency';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type ImportStep = 'select_account' | 'upload_file' | 'preview' | 'done';

export default function ImportScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState<ImportStep>('select_account');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string } | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: accountsData } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.getAll });
  const accounts = (accountsData?.data ?? []).filter((a: any) =>
    ['SAVINGS', 'CURRENT', 'CREDIT_CARD'].includes(a.account_type)
  );

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      setSelectedFile({ uri: file.uri, name: file.name });
      // Auto advance
      handleUploadAndPreview(file.uri, file.name);
    } catch (err) {
      Alert.alert('Error', 'Failed to pick file.');
    }
  };

  const handleUploadAndPreview = async (uri: string, name: string) => {
    if (!selectedAccountId) {
      Alert.alert('Select Account', 'Please select an account first.');
      return;
    }
    setIsUploading(true);
    try {
      const res = await importsApi.previewCsv(selectedAccountId, uri, name);
      if (res.success) {
        setPreview(res.data);
        setStep('preview');
      } else {
        Alert.alert('Parse Error', res.error?.message ?? 'Could not parse CSV file.');
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err.displayMessage ?? 'Failed to upload file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommit = async (includeDuplicates = false) => {
    if (!preview?.batch_id) return;
    setIsUploading(true);
    try {
      const res = await importsApi.commit(preview.batch_id, includeDuplicates);
      if (res.success) {
        qc.invalidateQueries({ queryKey: ['transactions'] });
        qc.invalidateQueries({ queryKey: ['dashboard'] });
        setStep('done');
      } else {
        Alert.alert('Import Failed', res.error?.message ?? 'Could not import transactions.');
      }
    } catch (err: any) {
      Alert.alert('Import Failed', err.displayMessage ?? 'Could not import transactions.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetAll = () => {
    setStep('select_account');
    setSelectedAccountId('');
    setSelectedFile(null);
    setPreview(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import CSV</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Steps */}
      <View style={styles.stepBar}>
        {(['Select Account', 'Upload File', 'Preview', 'Done'] as const).map((label, i) => {
          const steps: ImportStep[] = ['select_account', 'upload_file', 'preview', 'done'];
          const currentIdx = steps.indexOf(step);
          const isActive = i === currentIdx;
          const isDone = i < currentIdx;
          return (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.stepDot, isDone && styles.stepDotDone, isActive && styles.stepDotActive]}>
                {isDone ? (
                  <MaterialCommunityIcons name="check" size={12} color="#fff" />
                ) : (
                  <Text style={styles.stepNum}>{i + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{label}</Text>
              {i < 3 && <View style={[styles.stepLine, isDone && styles.stepLineDone]} />}
            </View>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Select Account */}
        {step === 'select_account' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select Account</Text>
            <Text style={styles.stepDesc}>Choose the bank account to import transactions into</Text>
            {accounts.map((acc: any) => (
              <TouchableOpacity
                key={acc.id}
                style={[styles.acctRow, selectedAccountId === acc.id && styles.acctRowActive]}
                onPress={() => setSelectedAccountId(acc.id)}
              >
                <MaterialCommunityIcons
                  name="bank" size={20}
                  color={selectedAccountId === acc.id ? Colors.secondary : Colors.onSurfaceMuted}
                />
                <View style={styles.acctInfo}>
                  <Text style={styles.acctName}>{acc.name}</Text>
                  <Text style={styles.acctBalance}>{formatINR(acc.balance)}</Text>
                </View>
                {selectedAccountId === acc.id && (
                  <MaterialCommunityIcons name="check-circle" size={22} color={Colors.secondary} />
                )}
              </TouchableOpacity>
            ))}
            <Button
              label="Continue →"
              fullWidth
              disabled={!selectedAccountId}
              onPress={() => setStep('upload_file')}
              style={{ marginTop: Spacing.base }}
            />
          </View>
        )}

        {/* Step 2: Upload File */}
        {step === 'upload_file' && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Upload Bank Statement</Text>
            <Text style={styles.stepDesc}>Select a CSV file exported from your bank's internet banking</Text>

            <TouchableOpacity style={styles.dropZone} onPress={handlePickFile} disabled={isUploading}>
              {isUploading ? (
                <ActivityIndicator size="large" color={Colors.secondary} />
              ) : (
                <>
                  <MaterialCommunityIcons name="file-upload-outline" size={48} color={Colors.secondary} />
                  <Text style={styles.dropTitle}>Tap to pick CSV file</Text>
                  <Text style={styles.dropSub}>Supports standard bank CSV formats</Text>
                </>
              )}
            </TouchableOpacity>

            {selectedFile && !isUploading && (
              <View style={styles.fileInfo}>
                <MaterialCommunityIcons name="file-check" size={20} color={Colors.success} />
                <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
              </View>
            )}

            <TouchableOpacity onPress={() => setStep('select_account')} style={styles.backLink}>
              <Text style={styles.backLinkText}>← Change account</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && preview && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review Import</Text>
            <Text style={styles.stepDesc}>Verify the transactions before importing</Text>

            {/* Stats */}
            <View style={styles.previewStats}>
              {[
                { icon: 'plus-circle', label: 'New', value: preview.stats?.new_count ?? 0, color: Colors.success },
                { icon: 'content-copy', label: 'Duplicates', value: preview.stats?.duplicate_count ?? 0, color: Colors.warning },
                { icon: 'sigma', label: 'Total', value: preview.stats?.total_count ?? 0, color: Colors.secondary },
              ].map(({ icon, label, value, color }) => (
                <View key={label} style={styles.statCard}>
                  <MaterialCommunityIcons name={icon as any} size={20} color={color} />
                  <Text style={[styles.statValue, { color }]}>{value}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Sample rows */}
            {(preview.rows ?? []).slice(0, 8).map((row: any, idx: number) => (
              <View key={idx} style={[styles.previewRow, row.is_duplicate && styles.previewRowDup]}>
                <View style={styles.previewLeft}>
                  <Text style={styles.previewDesc} numberOfLines={1}>{row.description}</Text>
                  <Text style={styles.previewDate}>{row.date}</Text>
                </View>
                <View style={styles.previewRight}>
                  <Text style={[styles.previewAmount, { color: parseFloat(row.amount) < 0 ? Colors.danger : Colors.success }]}>
                    {formatINR(Math.abs(parseFloat(row.amount)))}
                  </Text>
                  {row.is_duplicate && (
                    <Text style={styles.dupLabel}>DUP</Text>
                  )}
                </View>
              </View>
            ))}

            <View style={styles.previewActions}>
              <Button
                label={`Import ${preview.stats?.new_count ?? 0} New`}
                fullWidth
                loading={isUploading}
                onPress={() => handleCommit(false)}
              />
              {(preview.stats?.duplicate_count ?? 0) > 0 && (
                <Button
                  label="Import All (incl. Duplicates)"
                  variant="secondary"
                  fullWidth
                  loading={isUploading}
                  onPress={() => handleCommit(true)}
                />
              )}
              <Button
                label="Cancel"
                variant="ghost"
                fullWidth
                onPress={resetAll}
              />
            </View>
          </View>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <View style={[styles.stepContent, styles.doneContent]}>
            <View style={styles.doneIcon}>
              <MaterialCommunityIcons name="check-circle" size={64} color={Colors.success} />
            </View>
            <Text style={styles.doneTitle}>Import Successful!</Text>
            <Text style={styles.doneDesc}>
              Your transactions have been imported and your account balance has been updated.
            </Text>
            <Button label="View Transactions" fullWidth onPress={() => router.replace('/(app)/transactions/')} />
            <Button label="Import Another File" variant="secondary" fullWidth onPress={resetAll} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.layoutMargin, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface,
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  stepBar: {
    flexDirection: 'row', paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md, backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border, alignItems: 'center',
  },
  stepItem: { flex: 1, alignItems: 'center', position: 'relative' },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  stepDotDone: { backgroundColor: Colors.success },
  stepDotActive: { backgroundColor: Colors.secondary },
  stepNum: { ...Typography.labelSm, color: Colors.onSurfaceMuted },
  stepLabel: { ...Typography.labelSm, color: Colors.onSurfaceSubtle, textAlign: 'center' },
  stepLabelActive: { color: Colors.secondary, fontFamily: 'Inter_600SemiBold' },
  stepLine: {
    position: 'absolute', top: 12, right: -Spacing.base,
    left: '50%', height: 1, backgroundColor: Colors.surfaceVariant,
  },
  stepLineDone: { backgroundColor: Colors.success },
  content: { padding: Spacing.layoutMargin, paddingBottom: 40 },
  stepContent: { gap: Spacing.base },
  stepTitle: { ...Typography.headlineMd, color: Colors.onSurface },
  stepDesc: { ...Typography.bodyMd, color: Colors.onSurfaceMuted, marginTop: -8 },
  acctRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.base, borderRadius: Spacing.cardRadius,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
    minHeight: 60,
  },
  acctRowActive: { borderColor: Colors.secondary, backgroundColor: 'rgba(59,130,246,0.05)' },
  acctInfo: { flex: 1 },
  acctName: { ...Typography.bodyMd, fontFamily: 'Inter_600SemiBold', color: Colors.onSurface },
  acctBalance: { ...Typography.labelSm, color: Colors.onSurfaceMuted, fontVariant: ['tabular-nums'] },
  dropZone: {
    height: 180, borderRadius: Spacing.cardRadius,
    borderWidth: 2, borderColor: Colors.secondary, borderStyle: 'dashed',
    backgroundColor: 'rgba(59,130,246,0.04)',
    alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  dropTitle: { ...Typography.bodyLg, fontFamily: 'Inter_600SemiBold', color: Colors.secondary },
  dropSub: { ...Typography.bodySm, color: Colors.onSurfaceMuted },
  fileInfo: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.successBg, borderRadius: Spacing.buttonRadius,
    padding: Spacing.md,
  },
  fileName: { ...Typography.bodyMd, color: Colors.success, flex: 1 },
  backLink: { alignItems: 'flex-start' },
  backLinkText: { ...Typography.bodyMd, color: Colors.secondary },
  previewStats: { flexDirection: 'row', gap: Spacing.md },
  statCard: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, alignItems: 'center', gap: 4,
  },
  statValue: { ...Typography.headlineMd },
  statLabel: { ...Typography.labelSm, color: Colors.onSurfaceMuted },
  previewRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  previewRowDup: { backgroundColor: Colors.warningBg, borderColor: Colors.warning },
  previewLeft: { flex: 1, gap: 2 },
  previewDesc: { ...Typography.bodyMd, color: Colors.onSurface },
  previewDate: { ...Typography.labelSm, color: Colors.onSurfaceMuted },
  previewRight: { alignItems: 'flex-end', gap: 2 },
  previewAmount: { ...Typography.numericData, fontVariant: ['tabular-nums'] },
  dupLabel: { ...Typography.labelSm, color: Colors.warning, fontFamily: 'Inter_700Bold' },
  previewActions: { gap: Spacing.sm, marginTop: Spacing.sm },
  doneContent: { alignItems: 'center', paddingTop: 60 },
  doneIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.successBg, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  doneTitle: { ...Typography.headlineLg, color: Colors.onSurface },
  doneDesc: { ...Typography.bodyMd, color: Colors.onSurfaceMuted, textAlign: 'center', maxWidth: 280, marginBottom: Spacing.xl },
});
