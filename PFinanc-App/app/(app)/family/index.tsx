import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../../src/api/dashboard';
import { householdsApi } from '../../../src/api/misc';
import { useAuthStore } from '../../../src/store/authStore';
import { Avatar } from '../../../src/components/ui';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { Colors, Spacing, Typography } from '../../../src/theme';
import { formatINR } from '../../../src/utils/currency';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function FamilyScreen() {
  const { household } = useAuthStore();

  const { data: membersData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['household-detail', household?.id],
    queryFn: () => householdsApi.getById(household!.id),
    enabled: !!household?.id,
  });

  const { data: familyAnalytics } = useQuery({
    queryKey: ['family-analytics'],
    queryFn: () => dashboardApi.getFamilyAnalytics(),
  });

  const members = membersData?.data?.members ?? [];
  const analytics = familyAnalytics?.data ?? {};

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Family</Text>
        <Text style={styles.subtitle}>{household?.name}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.secondary} />
        }
      >
        {/* Member Cards */}
        {isLoading
          ? [1, 2].map((i) => <SkeletonCard key={i} style={{ height: 120 }} />)
          : members.map((member: any) => {
            const memberStats = analytics?.members?.find((m: any) => m.user_id === member.user_id);
            const spent = memberStats?.total_expenses ?? 0;
            const income = memberStats?.total_income ?? 0;

            return (
              <View key={member.user_id} style={styles.memberCard}>
                <View style={styles.memberTop}>
                  <Avatar name={member.name ?? member.email} size={48} />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.name ?? member.email}</Text>
                    <Text style={styles.memberRole}>{member.role}</Text>
                    <Text style={styles.memberEmail}>{member.email}</Text>
                  </View>
                  <View style={[styles.rolePill, { backgroundColor: member.role === 'OWNER' ? '#0F172A18' : Colors.surfaceDim }]}>
                    <Text style={[styles.rolePillText, { color: member.role === 'OWNER' ? Colors.primary : Colors.onSurfaceMuted }]}>
                      {member.role}
                    </Text>
                  </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="arrow-up-circle" size={14} color={Colors.danger} />
                    <View>
                      <Text style={styles.statLabel}>Spent</Text>
                      <Text style={[styles.statValue, { color: Colors.danger }]}>
                        {formatINR(spent, { compact: true })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="arrow-down-circle" size={14} color={Colors.success} />
                    <View>
                      <Text style={styles.statLabel}>Income</Text>
                      <Text style={[styles.statValue, { color: Colors.success }]}>
                        {formatINR(income, { compact: true })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="piggy-bank" size={14} color={Colors.secondary} />
                    <View>
                      <Text style={styles.statLabel}>Saved</Text>
                      <Text style={[styles.statValue, { color: Colors.secondary }]}>
                        {formatINR(income - spent, { compact: true })}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        }

        {/* Household Overview */}
        {analytics?.summary && (
          <View style={styles.overviewCard}>
            <Text style={styles.overviewTitle}>Household This Month</Text>
            <View style={styles.overviewRow}>
              {[
                { label: 'Total Income', value: analytics.summary.total_income, color: Colors.success },
                { label: 'Total Expenses', value: analytics.summary.total_expenses, color: Colors.danger },
                { label: 'Net Savings', value: analytics.summary.net_savings ?? (analytics.summary.total_income - analytics.summary.total_expenses), color: Colors.secondary },
              ].map(({ label, value, color }) => (
                <View key={label} style={styles.overviewItem}>
                  <Text style={styles.overviewLabel}>{label}</Text>
                  <Text style={[styles.overviewValue, { color }]}>{formatINR(value ?? 0, { compact: true })}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.layoutMargin,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xl,
    gap: 4,
  },
  title: { ...Typography.headlineLg, color: Colors.onPrimary },
  subtitle: { ...Typography.bodyMd, color: 'rgba(255,255,255,0.6)' },
  scroll: { flex: 1 },
  content: { padding: Spacing.layoutMargin, gap: Spacing.md, paddingBottom: 32 },
  memberCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  memberTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  memberInfo: { flex: 1, gap: 2 },
  memberName: { ...Typography.bodyMd, fontFamily: 'Inter_600SemiBold', color: Colors.onSurface },
  memberRole: { ...Typography.labelSm, color: Colors.onSurfaceMuted },
  memberEmail: { ...Typography.labelSm, color: Colors.onSurfaceSubtle },
  rolePill: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Spacing.pillRadius,
  },
  rolePillText: { ...Typography.labelSm, fontFamily: 'Inter_600SemiBold' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceDim,
    borderRadius: 10,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, gap: 6,
  },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statLabel: { ...Typography.labelSm, color: Colors.onSurfaceMuted },
  statValue: { ...Typography.numericData, fontVariant: ['tabular-nums'], fontSize: 13 },
  overviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  overviewTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  overviewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  overviewItem: { gap: 4, alignItems: 'center' },
  overviewLabel: { ...Typography.labelSm, color: Colors.onSurfaceMuted },
  overviewValue: { ...Typography.numericData, fontVariant: ['tabular-nums'] },
});
