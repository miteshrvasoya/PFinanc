import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../../src/api/client';

export default function AutomationDashboard() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const res = await apiClient.get('/automation/candidates');
      setCandidates(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Automation</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/automation/settings')} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={24} color="#F8FAFC" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{candidates.length}</Text>
          <Text style={styles.statLabel}>Needs Review</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Pending Transactions</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 40 }} />
      ) : candidates.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#10B981" />
          <Text style={styles.emptyStateText}>All caught up!</Text>
          <Text style={styles.emptyStateSub}>No new transactions detected.</Text>
        </View>
      ) : (
        <FlatList
          data={candidates}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.candidateCard}
              onPress={() => router.push({ pathname: '/(app)/automation/review', params: { id: item.id } })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.merchant}>{item.merchant || 'Unknown Merchant'}</Text>
                <Text style={[styles.amount, { color: item.direction === 'CREDIT' ? '#10B981' : '#EF4444' }]}>
                  {item.direction === 'CREDIT' ? '+' : '-'}₹{item.amount}
                </Text>
              </View>
              <Text style={styles.details}>
                {new Date(item.transaction_date).toLocaleDateString()} • {item.confidence * 100}% Confidence
              </Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Review Needed</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFF' },
  settingsBtn: { padding: 8, backgroundColor: '#1E293B', borderRadius: 8 },
  statsContainer: { flexDirection: 'row', marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#1E293B', padding: 20, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#3B82F6' },
  statLabel: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#F8FAFC', marginBottom: 16 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyStateText: { fontSize: 20, color: '#F8FAFC', fontWeight: '600', marginTop: 16 },
  emptyStateSub: { fontSize: 14, color: '#94A3B8', marginTop: 8 },
  candidateCard: { backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  merchant: { fontSize: 16, fontWeight: '600', color: '#F8FAFC' },
  amount: { fontSize: 16, fontWeight: 'bold' },
  details: { fontSize: 14, color: '#94A3B8', marginBottom: 12 },
  statusBadge: { alignSelf: 'flex-start', backgroundColor: '#F59E0B20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  statusText: { color: '#F59E0B', fontSize: 12, fontWeight: '600' }
});
