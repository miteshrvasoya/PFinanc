import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { apiClient } from '../api/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  link_type?: string; // 'transaction' | 'account' | 'insights' | 'budgets' | 'smsReview'
  link_id?: string;
}

interface NotificationsScreenProps {
  onBack?: () => void;
  onNavigate?: (screen: string, params?: any) => void;
}

const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
  TRANSACTION: { icon: 'receipt', color: colors.primary, bg: colors.primaryFixed },
  BALANCE: { icon: 'account-balance-wallet', color: '#b45309', bg: '#fef3c7' },
  BUDGET: { icon: 'pie-chart', color: colors.error, bg: colors.errorContainer },
  SYSTEM: { icon: 'info', color: colors.outline, bg: colors.surfaceContainerHigh },
  SMS: { icon: 'sms', color: colors.tertiary, bg: colors.tertiaryFixed },
  DEFAULT: { icon: 'notifications', color: colors.primary, bg: colors.primaryFixed },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBack, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await apiClient.get('/api/notifications');
      if (res && res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      } else if (res && res.success && Array.isArray(res.data?.notifications)) {
        setNotifications(res.data.notifications);
      }
      // If endpoint not implemented, silently stay empty
    } catch (err: any) {
      // Endpoint may not exist yet on backend — show empty state silently
      const msg = err?.message || '';
      if (!msg.includes('JSON') && !msg.includes('404') && !msg.includes('not found')) {
        console.error('Failed to fetch notifications:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      await apiClient.post('/api/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('markAllRead failed:', err);
    }
  };

  const markRead = async (id: string) => {
    try {
      await apiClient.put(`/api/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      // Silent – UI already updated optimistically
    }
  };

  const handleNotificationPress = (notif: Notification) => {
    markRead(notif.id);
    if (!notif.link_type || !onNavigate) return;
    switch (notif.link_type) {
      case 'transaction':
      case 'history':
        onNavigate('history');
        break;
      case 'insights':
        onNavigate('insights');
        break;
      case 'budgets':
        onNavigate('budgets');
        break;
      case 'smsReview':
        onNavigate('smsReview');
        break;
      case 'accounts':
        onNavigate('accounts');
        break;
      default:
        break;
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await apiClient.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      Alert.alert('Error', 'Could not delete notification');
    }
  };

  const filtered = activeFilter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
          </View>
        </View>
        {unreadCount > 0 && (
          <Pressable style={styles.markAllBtn} onPress={markAllRead}>
            <MaterialIcons name="done-all" size={16} color={colors.primary} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
            All ({notifications.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterTab, activeFilter === 'unread' && styles.filterTabActive]}
          onPress={() => setActiveFilter('unread')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'unread' && styles.filterTabTextActive]}>
            Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
          </Text>
          {unreadCount > 0 && <View style={styles.unreadDot} />}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrapper}>
            <MaterialIcons name="notifications-none" size={36} color={colors.primaryContainer} />
          </View>
          <Text style={styles.emptyTitle}>
            {activeFilter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter === 'unread'
              ? 'You\'re all caught up!'
              : 'Notifications will appear here when triggered by your financial activity.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor={colors.primary}
            />
          }
        >
          {filtered.map((notif, index) => {
            const meta = TYPE_META[notif.type] || TYPE_META.DEFAULT;
            const isLast = index === filtered.length - 1;
            return (
              <Pressable
                key={notif.id}
                style={[
                  styles.notifCard,
                  !notif.is_read && styles.notifCardUnread,
                  isLast && { marginBottom: 120 }
                ]}
                onPress={() => handleNotificationPress(notif)}
              >
                {/* Unread indicator */}
                {!notif.is_read && <View style={styles.unreadBar} />}

                <View style={[styles.notifIconWrapper, { backgroundColor: meta.bg }]}>
                  <MaterialIcons name={meta.icon as any} size={20} color={meta.color} />
                </View>

                <View style={styles.notifBody}>
                  <View style={styles.notifTopRow}>
                    <Text style={[styles.notifTitle, !notif.is_read && styles.notifTitleUnread]} numberOfLines={1}>
                      {notif.title}
                    </Text>
                    <Text style={styles.notifTime}>{timeAgo(notif.created_at)}</Text>
                  </View>
                  <Text style={styles.notifMessage} numberOfLines={2}>
                    {notif.message}
                  </Text>

                  <View style={styles.notifFooter}>
                    {notif.link_type && (
                      <View style={styles.actionChip}>
                        <MaterialIcons name="open-in-new" size={11} color={colors.primary} />
                        <Text style={styles.actionChipText}>
                          {notif.link_type === 'history' || notif.link_type === 'transaction' ? 'View Transaction' :
                           notif.link_type === 'insights' ? 'View Insights' :
                           notif.link_type === 'budgets' ? 'View Budgets' :
                           notif.link_type === 'smsReview' ? 'Review SMS' :
                           notif.link_type === 'accounts' ? 'View Accounts' : 'View'}
                        </Text>
                      </View>
                    )}
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={() => Alert.alert(
                        'Delete Notification',
                        'Remove this notification?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(notif.id) }
                        ]
                      )}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MaterialIcons name="close" size={14} color={colors.outline} />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18, color: colors.onSurface,
  },
  headerSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11, color: colors.onSurfaceVariant,
  },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: colors.primaryFixed,
    borderRadius: 20,
  },
  markAllText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11, color: colors.primary,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  filterTabActive: {
    backgroundColor: colors.primaryFixed,
    borderColor: colors.primaryFixedDim,
  },
  filterTabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12, color: colors.onSurfaceVariant,
  },
  filterTabTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  unreadDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.error,
  },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 17, color: colors.onSurface,
    textAlign: 'center', marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13, color: colors.onSurfaceVariant,
    textAlign: 'center', lineHeight: 20,
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13, color: colors.onSurfaceVariant,
    marginTop: 12,
  },
  scrollContent: { padding: 16, gap: 10 },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
    position: 'relative',
  },
  notifCardUnread: {
    borderColor: colors.primaryFixedDim,
    backgroundColor: '#f0fbf5',
  },
  unreadBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  notifIconWrapper: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  notifBody: { flex: 1 },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13, color: colors.onSurface,
    flex: 1, marginRight: 8,
  },
  notifTitleUnread: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  notifTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10, color: colors.onSurfaceVariant,
    flexShrink: 0,
  },
  notifMessage: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12, color: colors.onSurfaceVariant,
    lineHeight: 18, marginBottom: 8,
  },
  notifFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: colors.primaryFixed,
    borderRadius: 10,
  },
  actionChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10, color: colors.primary,
  },
  deleteBtn: {
    padding: 4,
  },
});
