import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert, Platform, RefreshControl, Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';
import {
  requestSmsPermission, checkSmsPermission,
  readBankSMS, buildCandidatesPayload
} from '../api/smsService';

interface SMSReviewScreenProps {
  onBack: () => void;
}

interface TransactionCandidate {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  parsed_data: {
    amount?: number;
    merchant?: string;
    transaction_type?: 'EXPENSE' | 'INCOME' | 'TRANSFER';
    account_last4?: string;
    bank_name?: string;
    confidence?: number;
    currency?: string;
    date?: string;
  };
  raw_sms_body: string;
  sender: string;
  received_at: string;
  created_at: string;
}

type ScreenState = 'permission' | 'scanning' | 'syncing' | 'loaded' | 'empty' | 'error';

export const SMSReviewScreen: React.FC<SMSReviewScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<ScreenState>('permission');
  const [candidates, setCandidates] = useState<TransactionCandidate[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [smsCount, setSmsCount] = useState(0);

  useEffect(() => {
    initSMS();
  }, []);

  const initSMS = async () => {
    if (Platform.OS !== 'android') {
      // On non-Android just load existing candidates
      loadCandidates();
      return;
    }

    const hasPermission = await checkSmsPermission();
    if (hasPermission) {
      scanAndSync();
    } else {
      setState('permission');
    }
  };

  const handleGrantPermission = async () => {
    const granted = await requestSmsPermission();
    if (granted) {
      scanAndSync();
    } else {
      Alert.alert(
        'Permission Denied',
        'Without SMS permission, PFinanc cannot automatically detect transactions. You can still add them manually.',
        [{ text: 'OK' }]
      );
    }
  };

  const scanAndSync = async () => {
    setState('scanning');
    try {
      const smsList = await readBankSMS(300, 90);
      setSmsCount(smsList.length);

      if (smsList.length === 0) {
        await loadCandidates();
        return;
      }

      setState('syncing');
      const candidates = buildCandidatesPayload(smsList);

      await apiClient.post('/api/automation/candidates/sync', { candidates });
      await loadCandidates();
    } catch (err: any) {
      console.error('SMS scan error:', err);
      // Fall back to just loading existing candidates from server
      await loadCandidates();
    }
  };

  const loadCandidates = async () => {
    try {
      const res = await apiClient.get('/api/automation/candidates');
      if (res.success) {
        const pending = (Array.isArray(res.data) ? res.data : []).filter(
          (c: TransactionCandidate) => c.status === 'PENDING'
        );
        setCandidates(pending);
        setState(pending.length === 0 ? 'empty' : 'loaded');
      } else {
        setState('empty');
      }
    } catch {
      setState('error');
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await scanAndSync();
    setIsRefreshing(false);
  }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id + '-approve');
    try {
      await apiClient.post(`/api/automation/candidates/${id}/approve`, {});
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    } catch {
      Alert.alert('Error', 'Could not approve transaction.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id + '-reject');
    try {
      await apiClient.post(`/api/automation/candidates/${id}/reject`, {});
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    } catch {
      Alert.alert('Error', 'Could not reject.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatAmount = (amount?: number, type?: string) => {
    if (!amount) return '—';
    const formatted = `₹${amount.toLocaleString('en-IN')}`;
    return formatted;
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'INCOME': return { bg: 'rgba(192, 236, 214, 0.4)', text: colors.primary };
      case 'EXPENSE': return { bg: 'rgba(255, 218, 214, 0.5)', text: '#BA1A1A' };
      case 'TRANSFER': return { bg: 'rgba(255, 222, 164, 0.4)', text: '#7A5700' };
      default: return { bg: colors.surfaceContainerHigh, text: colors.onSurfaceVariant };
    }
  };

  const getConfidenceColor = (conf?: number) => {
    if (!conf) return colors.outline;
    if (conf >= 0.8) return '#128A58';
    if (conf >= 0.5) return '#7A5700';
    return '#BA1A1A';
  };

  // ── Permission Screen ──────────────────────────────────────────────
  if (state === 'permission') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>SMS Transaction Scan</Text>
        </View>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIcon}>
            <MaterialIcons name="sms" size={48} color={colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Automatic Transaction Detection</Text>
          <Text style={styles.permissionDesc}>
            PFinanc can read your bank SMS messages to automatically detect and prepare transaction drafts for your review.
          </Text>
          <View style={styles.permissionPoints}>
            {[
              { icon: 'lock', text: 'All analysis is on-device. No raw SMS is stored.' },
              { icon: 'filter-list', text: 'Only bank & financial SMS are scanned.' },
              { icon: 'check-circle', text: 'Every transaction requires your approval.' },
            ].map((p, i) => (
              <View key={i} style={styles.permissionPoint}>
                <MaterialIcons name={p.icon as any} size={18} color={colors.primaryContainer} />
                <Text style={styles.permissionPointText}>{p.text}</Text>
              </View>
            ))}
          </View>
          <Pressable style={styles.primaryBtn} onPress={handleGrantPermission}>
            <MaterialIcons name="verified-user" size={20} color={colors.onPrimary} />
            <Text style={styles.primaryBtnText}>Allow SMS Access</Text>
          </Pressable>
          <Pressable style={styles.ghostBtn} onPress={() => { setState('syncing'); loadCandidates(); }}>
            <Text style={styles.ghostBtnText}>View Existing Drafts Only</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Scanning / Syncing State ───────────────────────────────────────
  if (state === 'scanning' || state === 'syncing') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>SMS Transaction Scan</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingTitle}>
            {state === 'scanning' ? 'Scanning SMS Inbox...' : 'Syncing with PFinanc...'}
          </Text>
          <Text style={styles.loadingDesc}>
            {state === 'scanning'
              ? `Looking through bank messages (last 90 days)`
              : `Found ${smsCount} financial messages — preparing drafts`}
          </Text>
        </View>
      </View>
    );
  }

  // ── Loaded / Empty / Error States ─────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Review Transactions</Text>
          {candidates.length > 0 && (
            <Text style={styles.headerSubtitle}>{candidates.length} pending draft{candidates.length !== 1 ? 's' : ''}</Text>
          )}
        </View>
        <Pressable onPress={onRefresh} style={styles.refreshBtn}>
          <MaterialIcons name="refresh" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Info Banner */}
      {state === 'loaded' && smsCount > 0 && (
        <View style={styles.infoBanner}>
          <MaterialIcons name="sms" size={16} color={colors.primaryContainer} />
          <Text style={styles.infoBannerText}>
            Detected from {smsCount} bank messages · Privacy-First · Local Only
          </Text>
        </View>
      )}

      {/* Empty State */}
      {(state === 'empty' || state === 'error') && (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name={state === 'error' ? 'error-outline' : 'inbox'}
            size={56}
            color={colors.outline}
          />
          <Text style={styles.emptyTitle}>
            {state === 'error' ? 'Could not load drafts' : 'No Pending Drafts'}
          </Text>
          <Text style={styles.emptyDesc}>
            {state === 'error'
              ? 'Check your connection and try again.'
              : 'All transactions have been reviewed. Pull down to scan again.'}
          </Text>
          <Pressable style={styles.primaryBtn} onPress={onRefresh}>
            <Text style={styles.primaryBtnText}>Scan Again</Text>
          </Pressable>
        </View>
      )}

      {/* Candidate List */}
      {state === 'loaded' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {candidates.map((c) => {
            const typeStyle = getTypeColor(c.parsed_data?.transaction_type);
            const conf = c.parsed_data?.confidence;
            const isApproving = actionLoading === c.id + '-approve';
            const isRejecting = actionLoading === c.id + '-reject';

            return (
              <View key={c.id} style={styles.card}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.typeTag, { backgroundColor: typeStyle.bg }]}>
                      <Text style={[styles.typeTagText, { color: typeStyle.text }]}>
                        {c.parsed_data?.transaction_type || 'UNKNOWN'}
                      </Text>
                    </View>
                    <View style={styles.senderBadge}>
                      <MaterialIcons name="sms" size={12} color={colors.onSurfaceVariant} />
                      <Text style={styles.senderText}>{c.sender}</Text>
                    </View>
                  </View>
                  {conf !== undefined && (
                    <View style={styles.confidenceBadge}>
                      <View style={[styles.confidenceDot, { backgroundColor: getConfidenceColor(conf) }]} />
                      <Text style={[styles.confidenceText, { color: getConfidenceColor(conf) }]}>
                        {Math.round(conf * 100)}% match
                      </Text>
                    </View>
                  )}
                </View>

                {/* Amount */}
                <View style={styles.amountRow}>
                  <Text style={[
                    styles.amountText,
                    { color: c.parsed_data?.transaction_type === 'INCOME' ? colors.primary : '#BA1A1A' }
                  ]}>
                    {c.parsed_data?.transaction_type === 'INCOME' ? '+' : '-'}
                    {formatAmount(c.parsed_data?.amount)}
                  </Text>
                  {c.parsed_data?.bank_name && (
                    <Text style={styles.bankText}>{c.parsed_data.bank_name}
                      {c.parsed_data?.account_last4 ? ` ••${c.parsed_data.account_last4}` : ''}
                    </Text>
                  )}
                </View>

                {/* Merchant & Date */}
                <View style={styles.cardMeta}>
                  {c.parsed_data?.merchant && (
                    <View style={styles.metaRow}>
                      <MaterialIcons name="storefront" size={14} color={colors.onSurfaceVariant} />
                      <Text style={styles.metaText}>{c.parsed_data.merchant}</Text>
                    </View>
                  )}
                  <View style={styles.metaRow}>
                    <MaterialIcons name="access-time" size={14} color={colors.onSurfaceVariant} />
                    <Text style={styles.metaText}>
                      {new Date(c.received_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>

                {/* Raw SMS preview */}
                <View style={styles.smsBubble}>
                  <Text style={styles.smsText} numberOfLines={2}>{c.raw_sms_body}</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.cardActions}>
                  <Pressable
                    style={[styles.approveBtn, isApproving && { opacity: 0.6 }]}
                    onPress={() => handleApprove(c.id)}
                    disabled={!!actionLoading}
                  >
                    {isApproving ? (
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                      <>
                        <MaterialIcons name="check" size={16} color={colors.onPrimary} />
                        <Text style={styles.approveBtnText}>Approve</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable
                    style={[styles.rejectBtn, isRejecting && { opacity: 0.6 }]}
                    onPress={() => handleReject(c.id)}
                    disabled={!!actionLoading}
                  >
                    {isRejecting ? (
                      <ActivityIndicator size="small" color="#BA1A1A" />
                    ) : (
                      <>
                        <MaterialIcons name="close" size={16} color="#BA1A1A" />
                        <Text style={styles.rejectBtnText}>Not Mine</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193, 200, 194, 0.2)',
    backgroundColor: colors.surface,
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
  },
  refreshBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.primary,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(192, 236, 214, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(192, 236, 214, 0.5)',
  },
  infoBannerText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.primary,
  },

  // Permission screen
  permissionContainer: {
    flex: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  permissionIcon: {
    width: 96, height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(192, 236, 214, 0.3)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  permissionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: colors.primary,
    textAlign: 'center',
  },
  permissionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionPoints: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginVertical: 8,
  },
  permissionPoint: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  permissionPointText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.onSurface,
    flex: 1,
  },

  // Loading screen
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  loadingTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.primary,
  },
  loadingDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: colors.onSurface,
  },
  emptyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: colors.primary,
    height: 52, borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    gap: 8, width: '100%',
    marginTop: 8,
  },
  primaryBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16, color: colors.onPrimary,
  },
  ghostBtn: {
    height: 44,
    alignItems: 'center', justifyContent: 'center',
    width: '100%',
  },
  ghostBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14, color: colors.onSurfaceVariant,
  },

  // List
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(193, 200, 194, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  typeTag: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 8,
  },
  typeTagText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  senderBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  senderText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11, color: colors.onSurfaceVariant,
  },
  confidenceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  confidenceDot: {
    width: 7, height: 7, borderRadius: 4,
  },
  confidenceText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  amountRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 10,
  },
  amountText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 26,
  },
  bankText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13, color: colors.onSurfaceVariant,
  },
  cardMeta: {
    flexDirection: 'row', gap: 16, flexWrap: 'wrap',
  },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
  metaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13, color: colors.onSurfaceVariant,
  },
  smsBubble: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 10, padding: 10,
    borderLeftWidth: 3, borderLeftColor: colors.primaryFixed,
  },
  smsText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12, color: colors.onSurface,
    lineHeight: 18, fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row', gap: 10,
  },
  approveBtn: {
    flex: 1, height: 44, borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    gap: 6,
  },
  approveBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14, color: colors.onPrimary,
  },
  rejectBtn: {
    flex: 1, height: 44, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(186, 26, 26, 0.3)',
    backgroundColor: 'rgba(255, 218, 214, 0.3)',
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    gap: 6,
  },
  rejectBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14, color: '#BA1A1A',
  },
});
