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
  readBankSMS, buildCandidatesPayload, syncSmsCandidates, SyncSummary
} from '../api/smsService';

interface SMSReviewScreenProps {
  onBack: () => void;
}

// Flat row as returned by GET /api/automation/candidates (transaction_candidates table)
interface TransactionCandidate {
  id: string;
  status: string;
  account_id?: string | null;
  amount?: number | string | null;
  currency?: string;
  direction?: 'DEBIT' | 'CREDIT' | null;
  transaction_type?: 'EXPENSE' | 'INCOME' | 'FEE' | 'REFUND' | 'TRANSFER' | null;
  merchant?: string | null;
  transaction_date?: string | null;
  reference_number?: string | null;
  confidence?: number | string | null;
  created_at: string;
}

interface AccountLite { id: string; name: string; }

type ScreenState = 'permission' | 'scanning' | 'syncing' | 'loaded' | 'empty' | 'error';

export const SMSReviewScreen: React.FC<SMSReviewScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<ScreenState>('permission');
  const [candidates, setCandidates] = useState<TransactionCandidate[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [smsCount, setSmsCount] = useState(0);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [pickedAccount, setPickedAccount] = useState<Record<string, string>>({});

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
    setSyncError(null);
    try {
      const smsList = await readBankSMS(300, 90);
      setSmsCount(smsList.length);

      if (smsList.length > 0) {
        setState('syncing');
        const result = await syncSmsCandidates(buildCandidatesPayload(smsList));
        setSummary(result);
        if (result.errors > 0 && result.created === 0) {
          setSyncError(result.firstError || 'The server could not read your messages.');
        }
      }
    } catch (err: any) {
      console.error('SMS scan error:', err);
      // Show the real reason instead of silently pretending there is nothing to review
      setSyncError(err?.message || 'Could not send messages to PFinanc.');
    }
    await loadCandidates();
  };

  const loadCandidates = async () => {
    try {
      const [res, accRes] = await Promise.all([
        apiClient.get('/api/automation/candidates'),
        apiClient.get('/api/accounts').catch(() => null),
      ]);
      // Backend returns a bare array; tolerate a { data } envelope too.
      const rows: TransactionCandidate[] = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      const pending = rows.filter((c) => c.status === 'NEEDS_REVIEW' || c.status === 'PENDING');
      setCandidates(pending);

      const accList = Array.isArray(accRes?.data) ? accRes.data : accRes?.data?.accounts || [];
      setAccounts(accList.filter((a: any) => a.is_active !== false).map((a: any) => ({ id: a.id, name: a.name })));

      setState(pending.length === 0 ? 'empty' : 'loaded');
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
    const cand = candidates.find((c) => c.id === id);
    const accountId = pickedAccount[id] || cand?.account_id;
    if (!accountId) {
      Alert.alert('Choose an account', 'We could not tell which account this belongs to. Tap one of the accounts on the card first.');
      return;
    }
    setActionLoading(id + '-approve');
    try {
      await apiClient.post(`/api/automation/candidates/${id}/approve`, { account_id: accountId });
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'Could not approve this entry. Please try again.');
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

  const formatAmount = (amount?: number | string | null) => {
    const n = Number(amount);
    if (!n) return '—';
    return `₹${n.toLocaleString('en-IN')}`;
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
            PFinanc reads your bank SMS messages and prepares drafts for you to review. Nothing is added to your records until you approve it.
          </Text>
          <View style={styles.permissionPoints}>
            {[
              { icon: 'lock', text: 'Messages are sent securely to read the amount and shop name. The message text itself is not stored.' },
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
      {(state === 'loaded' || state === 'empty') && smsCount > 0 && (
        <View style={styles.infoBanner}>
          <MaterialIcons name="sms" size={16} color={colors.primaryContainer} />
          <Text style={styles.infoBannerText}>
            Found {smsCount} bank messages{summary ? ` · ${summary.created} new draft${summary.created === 1 ? '' : 's'}` : ''}
          </Text>
        </View>
      )}

      {syncError && (
        <Pressable style={styles.infoBanner} onPress={onRefresh}>
          <MaterialIcons name="error-outline" size={16} color="#BA1A1A" />
          <Text style={[styles.infoBannerText, { color: '#BA1A1A' }]}>Scan problem: {syncError} Tap to retry.</Text>
        </Pressable>
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
              : smsCount === 0 && Platform.OS === 'android' ? 'No bank messages found in the last 90 days.' : 'Everything has been reviewed. Tap Scan Again to look for new messages.'}
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
            const ttype = c.transaction_type || undefined;
            const typeStyle = getTypeColor(ttype);
            const conf = c.confidence != null ? Number(c.confidence) : undefined;
            const needsAccount = !c.account_id;
            const isApproving = actionLoading === c.id + '-approve';
            const isRejecting = actionLoading === c.id + '-reject';

            return (
              <View key={c.id} style={styles.card}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.typeTag, { backgroundColor: typeStyle.bg }]}>
                      <Text style={[styles.typeTagText, { color: typeStyle.text }]}>
                        {ttype === 'INCOME' ? 'MONEY IN' : ttype === 'EXPENSE' ? 'MONEY OUT' : ttype || 'UNKNOWN'}
                      </Text>
                    </View>
                    <View style={styles.senderBadge}>
                      <MaterialIcons name="sms" size={12} color={colors.onSurfaceVariant} />
                      <Text style={styles.senderText}>From SMS</Text>
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
                    { color: ttype === 'INCOME' || ttype === 'REFUND' ? colors.primary : '#BA1A1A' }
                  ]}>
                    {ttype === 'INCOME' || ttype === 'REFUND' ? '+' : '-'}
                    {formatAmount(c.amount)}
                  </Text>
                </View>

                {/* Merchant & Date */}
                <View style={styles.cardMeta}>
                  {!!c.merchant && (
                    <View style={styles.metaRow}>
                      <MaterialIcons name="storefront" size={14} color={colors.onSurfaceVariant} />
                      <Text style={styles.metaText}>{c.merchant}</Text>
                    </View>
                  )}
                  <View style={styles.metaRow}>
                    <MaterialIcons name="access-time" size={14} color={colors.onSurfaceVariant} />
                    <Text style={styles.metaText}>
                      {new Date(c.transaction_date || c.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>

                {/* Which account? Only asked when we could not match one from the SMS */}
                {needsAccount && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.metaText}>Which account is this from?</Text>
                    {accounts.length === 0 ? (
                      <Text style={styles.metaText}>Add an account in More → Accounts first.</Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
                        {accounts.map((a) => {
                          const on = pickedAccount[c.id] === a.id;
                          return (
                            <Pressable
                              key={a.id}
                              onPress={() => setPickedAccount((p) => ({ ...p, [c.id]: a.id }))}
                              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? colors.primaryContainer : colors.surfaceContainer }}
                            >
                              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: on ? colors.onPrimary : colors.onSurface }}>{a.name}</Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                )}

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
                        <Text style={styles.approveBtnText}>Add to my records</Text>
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
