import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../../src/api/client';

export default function ReviewCandidateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // In a real app we'd fetch the specific candidate, here we just fetch all and find it
    // Or we should add a GET /automation/candidates/:id endpoint
    apiClient.get('/automation/candidates')
      .then(res => {
        const found = res.data.find((c: any) => c.id === id);
        setCandidate(found);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await apiClient.post(`/automation/candidates/${id}/approve`);
      Alert.alert('Success', 'Transaction added successfully');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      await apiClient.post(`/automation/candidates/${id}/reject`);
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} color="#3B82F6" size="large" />;
  if (!candidate) return <View style={styles.center}><Text style={styles.error}>Candidate not found</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#FFF" /></TouchableOpacity>
        <Text style={styles.title}>Review Transaction</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.amountContainer}>
          <Text style={[styles.amount, { color: candidate.direction === 'CREDIT' ? '#10B981' : '#EF4444' }]}>
            {candidate.direction === 'CREDIT' ? '+' : '-'}₹{candidate.amount}
          </Text>
          <Text style={styles.merchant}>{candidate.merchant}</Text>
        </View>

        <View style={styles.divider} />

        <DetailRow label="Account" value={candidate.account_id ? 'Known Account' : 'Unknown Account'} icon="card-outline" />
        <DetailRow label="Date" value={new Date(candidate.transaction_date).toLocaleDateString()} icon="calendar-outline" />
        <DetailRow label="Type" value={candidate.transaction_type} icon="swap-horizontal-outline" />
        <DetailRow label="Confidence" value={`${(candidate.confidence * 100).toFixed(0)}%`} icon="analytics-outline" />
        
        <View style={styles.sourceBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#94A3B8" />
          <Text style={styles.sourceText}>Detected automatically from SMS</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.approveBtn} onPress={handleApprove} disabled={processing}>
          <Text style={styles.btnText}>{processing ? 'Processing...' : 'Approve'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={handleReject} disabled={processing}>
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function DetailRow({ label, value, icon }: { label: string, value: string, icon: any }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelRow}>
        <Ionicons name={icon} size={20} color="#94A3B8" />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  error: { color: '#EF4444', fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#1E293B' },
  title: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  card: { margin: 20, backgroundColor: '#1E293B', borderRadius: 16, padding: 24 },
  amountContainer: { alignItems: 'center', marginBottom: 24 },
  amount: { fontSize: 36, fontWeight: 'bold', marginBottom: 8 },
  merchant: { fontSize: 18, color: '#F8FAFC', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#334155', marginBottom: 24 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailLabelRow: { flexDirection: 'row', alignItems: 'center' },
  detailLabel: { color: '#94A3B8', fontSize: 15, marginLeft: 12 },
  detailValue: { color: '#F8FAFC', fontSize: 15, fontWeight: '500' },
  sourceBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', padding: 12, borderRadius: 8, marginTop: 12 },
  sourceText: { color: '#94A3B8', fontSize: 14, marginLeft: 12 },
  actions: { padding: 20 },
  approveBtn: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  rejectBtn: { backgroundColor: 'transparent', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EF4444' },
  rejectBtnText: { color: '#EF4444', fontSize: 16, fontWeight: '600' }
});
